/** Operasi situs yang dipakai bersama oleh route pemilik & admin. */
import type { Context } from "hono";
import { LIMITS, parseContent } from "@umkm/content-schema";
import { hostingState } from "@umkm/shared";
import { isTemplateId } from "@umkm/templates";
import type { AppEnv } from "../env";
import { audit } from "./audit";
import { ApiError, badRequest, notFound, ok, readJson } from "./http";
import { foreignMediaIds, getContentRow, getHostnames, getTenant, saveDraft, tenantDto } from "./repo";
import { publishTenant, renderPreview } from "./publish";

export async function getSiteData(c: Context<AppEnv>, tenantId: string) {
  const t = await getTenant(c.env.DB, tenantId);
  if (!t) throw notFound("Situs");
  const row = await getContentRow(c.env.DB, tenantId);
  if (!row) throw notFound("Konten");
  const hosts = await getHostnames(c.env.DB, tenantId);
  const today = new Date().toISOString().slice(0, 10);
  return {
    tenant: { ...tenantDto(t), hosting: { until: t.hosting_until, state: hostingState(t.hosting_until) } },
    urls: { site: c.env.SITE_URL_PATTERN ? c.env.SITE_URL_PATTERN.replace("{slug}", t.slug) : `https://${t.slug}.${c.env.ROOT_DOMAIN}`, hostnames: hosts },
    content: {
      draft: JSON.parse(row.draft_json),
      version: row.version,
      hasUnpublishedChanges: row.published_json !== row.draft_json || (t.draft_template_id !== null && t.draft_template_id !== t.template_id),
      draftUpdatedAt: row.draft_updated_at,
    },
    limits: {
      products: LIMITS.products,
      gallery: LIMITS.gallery,
      testimonials: LIMITS.testimonials,
      mediaFiles: LIMITS.mediaFiles,
      mediaFileBytes: LIMITS.mediaFileBytes,
      mediaBytes: t.media_quota_bytes,
      mediaUsedBytes: t.media_used_bytes,
      publishPerDay: LIMITS.publishPerDay,
      publishUsedToday: t.publish_count_date === today ? t.publish_count_day : 0,
    },
    contactAdminWa: c.env.ADMIN_WA || null,
  };
}

export async function saveContent(c: Context<AppEnv>, tenantId: string) {
  const body = await readJson<{ version?: unknown; content?: unknown }>(c);
  if (typeof body.version !== "number") throw badRequest("Versi konten wajib dikirim");
  const raw = JSON.stringify(body.content ?? null);
  if (raw.length > LIMITS.contentJsonBytes) throw badRequest("Konten terlalu besar");
  const parsed = parseContent(body.content);
  if (!parsed.ok) throw badRequest("Periksa kembali isian yang ditandai", parsed.fields);
  const foreign = await foreignMediaIds(c.env.DB, tenantId, parsed.content);
  if (foreign.length) throw badRequest("Ada foto yang tidak ditemukan, pilih ulang fotonya");
  const version = await saveDraft(c.env.DB, tenantId, parsed.content, body.version, c.get("user").id);
  if (version === null) throw new ApiError(409, "VERSION_CONFLICT", "Konten diubah di perangkat lain. Muat ulang halaman.");
  await audit(c, "content.save", tenantId, { version });
  return ok(c, { version, savedAt: Date.now() });
}

export async function previewSite(c: Context<AppEnv>, tenantId: string) {
  const t = await getTenant(c.env.DB, tenantId);
  if (!t) throw notFound("Situs");
  let body: { content?: unknown; templateId?: unknown } = {};
  if ((c.req.header("content-type") ?? "").includes("application/json")) body = await readJson(c);
  let content;
  if (body.content !== undefined) {
    const parsed = parseContent(body.content);
    if (!parsed.ok) throw badRequest("Periksa kembali isian yang ditandai", parsed.fields);
    content = parsed.content;
  } else {
    const row = await getContentRow(c.env.DB, tenantId);
    if (!row) throw notFound("Konten");
    content = JSON.parse(row.draft_json);
  }
  const templateId = typeof body.templateId === "string" ? body.templateId : undefined;
  if (templateId && !isTemplateId(templateId)) throw badRequest("Template tidak dikenal");
  const html = await renderPreview(c.env, t, content, templateId);
  return c.body(html, 200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "content-security-policy": "sandbox; default-src 'none'; img-src * data:; style-src 'unsafe-inline'; frame-src https://maps.google.com https://www.google.com",
  });
}

export async function publishSite(c: Context<AppEnv>, tenantId: string, asAdmin: boolean) {
  const body = (c.req.header("content-type") ?? "").includes("application/json") ? await readJson<{ version?: unknown }>(c) : {};
  const r = await publishTenant(c.env, tenantId, {
    actorId: c.get("user").id,
    source: "draft",
    expectedVersion: typeof body.version === "number" ? body.version : undefined,
    enforceDailyLimit: !asAdmin,
    allowFirstPublish: asAdmin,
  });
  c.executionCtx.waitUntil(r.purge);
  return ok(c, { publishedAt: r.publishedAt, urls: r.urls });
}

export async function setTemplate(c: Context<AppEnv>, tenantId: string, asAdmin: boolean) {
  const body = await readJson<{ templateId?: unknown }>(c);
  const id = typeof body.templateId === "string" ? body.templateId : "";
  if (!isTemplateId(id)) throw badRequest("Template tidak dikenal");
  const t = await getTenant(c.env.DB, tenantId);
  if (!t) throw notFound("Situs");
  if (!asAdmin && t.allow_template_switch !== 1) throw new ApiError(403, "FORBIDDEN", "Penggantian template dikunci. Hubungi admin.");
  // Disimpan sebagai desain draf; baru tayang (dan menggantikan template_id) saat diterbitkan.
  await c.env.DB.prepare("UPDATE tenants SET draft_template_id = ?, updated_at = ? WHERE id = ?").bind(id === t.template_id ? null : id, Date.now(), tenantId).run();
  await audit(c, "site.template", tenantId, { from: t.draft_template_id ?? t.template_id, to: id });
  return ok(c, { templateId: id, note: "Template baru tayang setelah Anda menekan Terbitkan" });
}
