import { collectMediaIds, LIMITS, type Content } from "@umkm/content-schema";
import { addOneYear, utcDate } from "@umkm/shared";
import { renderSite, renderStatusPage, type MediaInfo } from "@umkm/templates";
import type { Env } from "../env";
import { auditStmt } from "./audit";
import { ApiError, notFound } from "./http";
import { getContentRow, getHostnames, getTenant, mediaMapFor, type TenantRow } from "./repo";

export function brandUrl(env: Env): string {
  return `https://${env.ROOT_DOMAIN}`;
}

export async function buildMediaInfo(env: Env, tenantId: string, content: Content): Promise<Map<string, MediaInfo>> {
  const rows = await mediaMapFor(env.DB, tenantId, collectMediaIds(content));
  const out = new Map<string, MediaInfo>();
  for (const [id, m] of rows) out.set(id, { key: m.r2_key, width: m.width, height: m.height, alt: m.alt });
  return out;
}

export function primaryHost(env: Env, t: TenantRow): string {
  return `${t.slug}.${env.ROOT_DOMAIN}`;
}

export async function renderPreview(env: Env, t: TenantRow, content: Content, templateId?: string): Promise<string> {
  const media = await buildMediaInfo(env, t.id, content);
  return renderSite(templateId ?? t.template_id, content, {
    host: primaryHost(env, t),
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

/** Hapus cache edge (best-effort). TTL 300 dtk tetap menjamin pembaruan jika gagal. */
export async function purgeHosts(env: Env, hosts: string[]): Promise<void> {
  if (!env.CF_PURGE_TOKEN || !env.ZONE_ID || hosts.length === 0) return;
  const files = hosts.flatMap((h) => [`https://${h}/`, `https://${h}/sitemap.xml`, `https://${h}/robots.txt`]);
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

  const ts = Date.now();
  const today = utcDate(ts);
  const countToday = t.publish_count_date === today ? t.publish_count_day : 0;
  if (o.enforceDailyLimit && countToday >= LIMITS.publishPerDay) {
    throw new ApiError(429, "RATE_LIMITED", `Batas ${LIMITS.publishPerDay} kali terbit per hari tercapai, coba lagi besok`);
  }

  const content = JSON.parse(json) as Content;
  const media = await buildMediaInfo(env, tenantId, content);
  const hosts = await getHostnames(env.DB, tenantId);
  for (const host of hosts) {
    const files = renderSite(t.template_id, content, {
      host,
      mediaOrigin: env.MEDIA_ORIGIN,
      media,
      showBranding: t.show_branding === 1,
      brandName: env.BRAND_NAME,
      brandUrl: brandUrl(env),
      now: ts,
    });
    await writeHost(env, host, files, tenantId);
  }

  const stmts: D1PreparedStatement[] = [];
  if (o.source === "draft") {
    stmts.push(env.DB.prepare("UPDATE site_content SET published_json = draft_json WHERE tenant_id = ?").bind(tenantId));
  }
  stmts.push(
    env.DB.prepare(
      `UPDATE tenants SET published_at = ?, updated_at = ?,
         status = CASE WHEN status = 'draft' THEN 'active' ELSE status END,
         hosting_until = COALESCE(hosting_until, ?),
         publish_count_day = ?, publish_count_date = ?
       WHERE id = ?`,
    ).bind(ts, ts, addOneYear(ts), countToday + 1, today, tenantId),
  );
  stmts.push(
    auditStmt(env.DB, { actorUserId: o.actorId, tenantId, action: o.source === "draft" ? "site.publish" : "site.republish", detail: { hosts } }),
  );
  await env.DB.batch(stmts);

  return { publishedAt: ts, urls: hosts.map((h) => `https://${h}/`), purge: purgeHosts(env, hosts) };
}

/** Tulis halaman "situs tidak aktif" ke semua hostname tenant. */
export async function writeSuspendedPages(env: Env, tenantId: string): Promise<{ purge: Promise<void> }> {
  const hosts = await getHostnames(env.DB, tenantId, false);
  const page = renderStatusPage("suspended", env.BRAND_NAME, brandUrl(env));
  for (const host of hosts) {
    await writeHost(env, host, { html: page, sitemap: "", robots: "User-agent: *\nDisallow: /\n" }, tenantId, 503);
  }
  return { purge: purgeHosts(env, hosts) };
}
