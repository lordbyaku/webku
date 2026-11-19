/**
 * Akses data. Semua fungsi yang menyentuh data tenant MENERIMA tenantId secara eksplisit;
 * route pelanggan wajib memberi tenantId dari sesi (c.get("tenantId")), bukan dari input.
 */
import { collectMediaIds, type Content } from "@umkm/content-schema";

export interface TenantRow {
  id: string;
  slug: string;
  business_name: string;
  category: string;
  template_id: string;
  draft_template_id: string | null;
  media_count: number;
  status: "draft" | "active" | "suspended" | "deleted";
  payment_status: "unpaid" | "paid";
  allow_template_switch: number;
  show_branding: number;
  media_quota_bytes: number;
  media_used_bytes: number;
  publish_count_day: number;
  publish_count_date: string | null;
  notes: string | null;
  hosting_until: number | null;
  published_at: number | null;
  deleted_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface ContentRow {
  tenant_id: string;
  draft_json: string;
  published_json: string | null;
  version: number;
  draft_updated_at: number;
  draft_updated_by: string | null;
}

export interface MediaRow {
  id: string;
  tenant_id: string;
  r2_key: string;
  mime: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string | null;
  created_at: number;
}

export async function getTenant(db: D1Database, tenantId: string): Promise<TenantRow | null> {
  return db.prepare("SELECT * FROM tenants WHERE id = ? AND status != 'deleted'").bind(tenantId).first<TenantRow>();
}

export async function getContentRow(db: D1Database, tenantId: string): Promise<ContentRow | null> {
  return db.prepare("SELECT * FROM site_content WHERE tenant_id = ?").bind(tenantId).first<ContentRow>();
}

export async function getHostnames(db: D1Database, tenantId: string, onlyActive = true): Promise<string[]> {
  const sql = onlyActive
    ? "SELECT hostname FROM hostnames WHERE tenant_id = ? AND status = 'active' ORDER BY kind DESC, created_at"
    : "SELECT hostname FROM hostnames WHERE tenant_id = ? ORDER BY kind DESC, created_at";
  const r = await db.prepare(sql).bind(tenantId).all<{ hostname: string }>();
  return r.results.map((x) => x.hostname);
}

/** Simpan draf dengan optimistic locking. Mengembalikan versi baru atau null jika konflik. */
export async function saveDraft(
  db: D1Database,
  tenantId: string,
  content: Content,
  expectedVersion: number,
  userId: string,
): Promise<number | null> {
  const ts = Date.now();
  const r = await db
    .prepare(
      `UPDATE site_content SET draft_json = ?, version = version + 1, draft_updated_at = ?, draft_updated_by = ?
       WHERE tenant_id = ? AND version = ?`,
    )
    .bind(JSON.stringify(content), ts, userId, tenantId, expectedVersion)
    .run();
  return r.meta.changes === 1 ? expectedVersion + 1 : null;
}

/** Media yang dirujuk konten tetapi BUKAN milik tenant ini. */
export async function foreignMediaIds(db: D1Database, tenantId: string, content: Content): Promise<string[]> {
  const ids = collectMediaIds(content);
  if (ids.length === 0) return [];
  const owned = new Set<string>();
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const r = await db
      .prepare(`SELECT id FROM media WHERE tenant_id = ? AND id IN (${chunk.map(() => "?").join(",")})`)
      .bind(tenantId, ...chunk)
      .all<{ id: string }>();
    r.results.forEach((x) => owned.add(x.id));
  }
  return ids.filter((id) => !owned.has(id));
}

export async function mediaMapFor(db: D1Database, tenantId: string, ids: string[]): Promise<Map<string, MediaRow>> {
  const map = new Map<string, MediaRow>();
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    if (chunk.length === 0) continue;
    const r = await db
      .prepare(`SELECT * FROM media WHERE tenant_id = ? AND id IN (${chunk.map(() => "?").join(",")})`)
      .bind(tenantId, ...chunk)
      .all<MediaRow>();
    r.results.forEach((m) => map.set(m.id, m));
  }
  return map;
}

export function tenantDto(t: TenantRow) {
  return {
    id: t.id,
    slug: t.slug,
    businessName: t.business_name,
    category: t.category,
    templateId: t.draft_template_id ?? t.template_id,
    publishedTemplateId: t.template_id,
    status: t.status,
    paymentStatus: t.payment_status,
    allowTemplateSwitch: t.allow_template_switch === 1,
    showBranding: t.show_branding === 1,
    mediaQuotaBytes: t.media_quota_bytes,
    mediaUsedBytes: t.media_used_bytes,
    mediaCount: t.media_count,
    hostingUntil: t.hosting_until,
    publishedAt: t.published_at,
    createdAt: t.created_at,
  };
}
