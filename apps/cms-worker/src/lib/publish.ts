import { collectMediaIds, LIMITS, type Content } from "@umkm/content-schema";
import { addOneYear, utcDate } from "@umkm/shared";
import { renderSite, renderStatusPage, type MediaInfo } from "@umkm/templates";
import type { Env } from "../env";
import { auditStmt } from "./audit";
import { ApiError, notFound } from "./http";
import { getContentRow, getHostnames, getTenant, mediaMapFor, type TenantRow } from "./repo";
import { brandUrl, internalHost, publicUrlForHost, siteUrl } from "./urls";

export { brandUrl };

export async function buildMediaInfo(env: Env, tenantId: string, content: Content): Promise<Map<string, MediaInfo>> {
  const rows = await mediaMapFor(env.DB, tenantId, collectMediaIds(content));
  const out = new Map<string, MediaInfo>();
  for (const [id, m] of rows) out.set(id, { key: m.r2_key, width: m.width, height: m.height, alt: m.alt });
  return out;
}

export function primaryHost(env: Env, t: TenantRow): string {
  return internalHost(env, t.slug);
}

export async function renderPreview(env: Env, t: TenantRow, content: Content, templateId?: string): Promise<string> {
  const media = await buildMediaInfo(env, t.id, content);
  return renderSite(templateId ?? t.draft_template_id ?? t.template_id, content, {
    host: primaryHost(env, t),
    publicUrl: siteUrl(env, t.slug),
    mediaOrigin: env.MEDIA_ORIGIN,
    media,
    showBranding: t.show_branding === 1,
    brandName: env.BRAND_NAME,
    brandUrl: brandUrl(env),
    preview: true,
  }).html;
}

const HTML_META = { contentType: "text/html; charset=utf-8" };

async function writeHost(env: Env, host: string, files: { html: string; sitemap: string; robots: string }, tenantId: string, httpStatus = 200) {
  const custom = { tenantId, writtenAt: String(Date.now()), httpStatus: String(httpStatus) };
  await Promise.all([
    env.SITES.put(`h/${host}/index.html`, files.html, { httpMetadata: HTML_META, customMetadata: custom }),
    env.SITES.put(`h/${host}/sitemap.xml`, files.sitemap, { httpMetadata: { contentType: "application/xml; charset=utf-8" }, customMetadata: custom }),
    env.SITES.put(`h/${host}/robots.txt`, files.robots, { httpMetadata: { contentType: "text/plain; charset=utf-8" }, customMetadata: custom }),
  ]);
}

/** URL publik dasar (diakhiri "/") untuk semua hostname tersimpan sebuah pelanggan. */
export function publicBases(env: Env, slug: string, hosts: string[]): string[] {
  return hosts.map((h) => publicUrlForHost(env, slug, h));
}

/** Hapus cache edge (best-effort) untuk URL publik dasar. TTL 300 dtk tetap menjamin pembaruan jika gagal. */
export async function purgeUrls(env: Env, bases: string[]): Promise<void> {
  if (!env.CF_PURGE_TOKEN || !env.ZONE_ID || bases.length === 0) return;
  const files = bases.flatMap((b) => [b, `${b}sitemap.xml`, `${b}robots.txt`]);
  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/purge_cache`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.CF_PURGE_TOKEN}`, "content-type": "application/json" },
      body: JSON.stringify({ files }),
    });
  } catch {
    /* abaikan */
  }
}

export interface PublishOptions {
  actorId: string;
  /** 'draft' = terbitkan draf; 'published' = render ulang versi terbit (republish/aktivasi) */
  source: "draft" | "published";
  expectedVersion?: number;
  enforceDailyLimit: boolean;
  allowFirstPublish: boolean;
}

export async function publishTenant(
  env: Env,
  tenantId: string,
  o: PublishOptions,
): Promise<{ publishedAt: number; urls: string[]; purge: Promise<void> }> {
  const t = await getTenant(env.DB, tenantId);
  if (!t) throw notFound("Situs");
  if (t.status === "suspended") throw new ApiError(403, "FORBIDDEN", "Situs sedang dinonaktifkan");
  if (t.status === "draft" && !o.allowFirstPublish) {
    throw new ApiError(403, "FORBIDDEN", "Situs belum diaktifkan oleh admin");
  }
  const row = await getContentRow(env.DB, tenantId);
  if (!row) throw notFound("Konten");
  if (o.expectedVersion !== undefined && o.expectedVersion !== row.version) {
    throw new ApiError(409, "VERSION_CONFLICT", "Konten berubah di perangkat lain, muat ulang halaman");
  }
  const json = o.source === "draft" ? row.draft_json : row.published_json;
  if (!json) throw new ApiError(409, "NOTHING_PUBLISHED", "Situs belum pernah diterbitkan");
  // Terbit draf memakai desain draf (jika ada); render ulang memakai desain yang sedang tayang.
  const templateId = o.source === "draft" ? (t.draft_template_id ?? t.template_id) : t.template_id;

  const ts = Date.now();
  const today = utcDate(ts);
  if (o.enforceDailyLimit) {
    // Pesan jatah terbit secara atomik (aman dari permintaan bersamaan). Terbit oleh admin tidak dihitung.
    const slot = await env.DB.prepare(
      `UPDATE tenants SET
         publish_count_day = CASE WHEN publish_count_date = ? THEN publish_count_day + 1 ELSE 1 END,
         publish_count_date = ?
       WHERE id = ? AND (publish_count_date IS NULL OR publish_count_date != ? OR publish_count_day < ?)`,
    ).bind(today, today, tenantId, today, LIMITS.publishPerDay).run();
    if (slot.meta.changes !== 1) {
      throw new ApiError(429, "RATE_LIMITED", `Batas ${LIMITS.publishPerDay} kali terbit per hari tercapai, coba lagi besok`);
    }
  }

  const content = JSON.parse(json) as Content;
  const hosts = await getHostnames(env.DB, tenantId);
  await renderToHosts(env, t, templateId, content, hosts, ts);

  const stmts: D1PreparedStatement[] = [];
  if (o.source === "draft") {
    stmts.push(env.DB.prepare("UPDATE site_content SET published_json = draft_json WHERE tenant_id = ?").bind(tenantId));
  }
  stmts.push(
    env.DB.prepare(
      // Kolom desain hanya berubah saat menerbitkan draf; terbit ulang tidak menyentuh desain draf pelanggan.
      `UPDATE tenants SET published_at = ?, updated_at = ?,
         template_id = CASE WHEN ? THEN ? ELSE template_id END,
         draft_template_id = CASE WHEN ? THEN NULL ELSE draft_template_id END,
         status = CASE WHEN status = 'draft' THEN 'active' ELSE status END,
         hosting_until = COALESCE(hosting_until, ?)
       WHERE id = ?`,
    ).bind(ts, ts, o.source === "draft" ? 1 : 0, templateId, o.source === "draft" ? 1 : 0, addOneYear(ts), tenantId),
  );
  stmts.push(
    auditStmt(env.DB, { actorUserId: o.actorId, tenantId, action: o.source === "draft" ? "site.publish" : "site.republish", detail: { hosts, templateId } }),
  );
  try {
    await env.DB.batch(stmts);
  } catch (e) {
    // Database gagal: kembalikan situs ke versi terbit sebelumnya agar situs & CMS tetap sinkron.
    if (o.source === "draft" && row.published_json && t.status !== "draft") {
      await renderToHosts(env, t, t.template_id, JSON.parse(row.published_json) as Content, hosts, ts).catch(() => {});
    }
    throw e;
  }

  const bases = publicBases(env, t.slug, hosts);
  return { publishedAt: ts, urls: bases, purge: purgeUrls(env, bases) };
}

async function renderToHosts(env: Env, t: TenantRow, templateId: string, content: Content, hosts: string[], ts: number): Promise<void> {
  const media = await buildMediaInfo(env, t.id, content);
  for (const host of hosts) {
    const files = renderSite(templateId, content, {
      host,
      publicUrl: publicUrlForHost(env, t.slug, host),
      mediaOrigin: env.MEDIA_ORIGIN,
      media,
      showBranding: t.show_branding === 1,
      brandName: env.BRAND_NAME,
      brandUrl: brandUrl(env),
      now: ts,
    });
    await writeHost(env, host, files, t.id);
  }
}

/** Hapus semua file terbit sebuah hostname dari R2 (ganti subdomain / hapus pelanggan). */
export async function deleteHostFiles(env: Env, host: string): Promise<void> {
  await env.SITES.delete([`h/${host}/index.html`, `h/${host}/sitemap.xml`, `h/${host}/robots.txt`]);
}

/** Tulis halaman "situs tidak aktif" ke semua hostname tenant. */
export async function writeSuspendedPages(env: Env, tenantId: string): Promise<{ purge: Promise<void> }> {
  const hosts = await getHostnames(env.DB, tenantId, false);
  const t = await env.DB.prepare("SELECT slug FROM tenants WHERE id = ?").bind(tenantId).first<{ slug: string }>();
  const page = renderStatusPage("suspended", env.BRAND_NAME, brandUrl(env));
  for (const host of hosts) {
    await writeHost(env, host, { html: page, sitemap: "", robots: "User-agent: *\nDisallow: /\n" }, tenantId, 503);
  }
  return { purge: purgeUrls(env, t ? publicBases(env, t.slug, hosts) : []) };
}
