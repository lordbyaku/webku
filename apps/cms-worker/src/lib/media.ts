import { collectMediaIds, LIMITS, type Content } from "@umkm/content-schema";
import { newId } from "@umkm/shared";
import type { Env } from "../env";
import { ApiError, badRequest, notFound } from "./http";
import { getContentRow, type MediaRow } from "./repo";

type Sniff = { mime: "image/webp" | "image/jpeg" | "image/png"; ext: string } | null;

/** Deteksi tipe dari magic bytes, bukan dari nama file / Content-Type. */
export function sniffImage(b: Uint8Array): Sniff {
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return { mime: "image/webp", ext: "webp" };
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return { mime: "image/png", ext: "png" };
  }
  return null;
}

function dim(v: File | string | null): number | null {
  if (typeof v !== "string") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 10000 ? n : null;
}

export function mediaDto(env: Env, m: MediaRow) {
  return { id: m.id, url: `${env.MEDIA_ORIGIN}/${m.r2_key}`, bytes: m.bytes, width: m.width, height: m.height, alt: m.alt, createdAt: m.created_at };
}

export async function uploadMedia(env: Env, tenantId: string, form: FormData): Promise<MediaRow> {
  const file = form.get("file");
  if (!file || typeof file === "string") throw badRequest("File foto wajib diisi");
  if (file.size === 0) throw badRequest("File kosong");
  if (file.size > LIMITS.mediaFileBytes) {
    throw new ApiError(413, "QUOTA_EXCEEDED", `Ukuran foto maksimal ${Math.round(LIMITS.mediaFileBytes / 1000)} KB`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) throw badRequest("Format foto harus WebP, JPEG, atau PNG");

  // Pesan kuota (jumlah file & ukuran) dalam satu pernyataan atomik.
  const reserve = await env.DB.prepare(
    `UPDATE tenants SET media_used_bytes = media_used_bytes + ?, media_count = media_count + 1
     WHERE id = ? AND media_used_bytes + ? <= media_quota_bytes AND media_count < ?`,
  )
    .bind(bytes.length, tenantId, bytes.length, LIMITS.mediaFiles)
    .run();
  if (reserve.meta.changes !== 1) {
    const t = await env.DB.prepare("SELECT media_count FROM tenants WHERE id = ?").bind(tenantId).first<{ media_count: number }>();
    if ((t?.media_count ?? 0) >= LIMITS.mediaFiles) {
      throw new ApiError(413, "QUOTA_EXCEEDED", `Maksimal ${LIMITS.mediaFiles} foto. Hapus foto lama terlebih dahulu.`);
    }
    throw new ApiError(413, "QUOTA_EXCEEDED", "Kuota penyimpanan foto penuh. Hapus foto lama terlebih dahulu.");
  }

  const id = newId("m");
  const key = `t/${tenantId}/${id}.${kind.ext}`;
  const altRaw = form.get("alt");
  const alt = typeof altRaw === "string" ? altRaw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 150) || null : null;
  const row: MediaRow = {
    id, tenant_id: tenantId, r2_key: key, mime: kind.mime, bytes: bytes.length,
    width: dim(form.get("width")), height: dim(form.get("height")), alt, created_at: Date.now(),
  };
  try {
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: kind.mime, cacheControl: "public, max-age=31536000, immutable" } });
    await env.DB.prepare(
      "INSERT INTO media (id, tenant_id, r2_key, mime, bytes, width, height, alt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(row.id, row.tenant_id, row.r2_key, row.mime, row.bytes, row.width, row.height, row.alt, row.created_at)
      .run();
  } catch (e) {
    await env.DB.prepare("UPDATE tenants SET media_used_bytes = MAX(0, media_used_bytes - ?), media_count = MAX(0, media_count - 1) WHERE id = ?").bind(bytes.length, tenantId).run();
    await env.MEDIA.delete(key).catch(() => {});
    throw e;
  }
  return row;
}

export async function listMedia(env: Env, tenantId: string, cursor: string | null) {
  const before = cursor ? Number(cursor) : Number.MAX_SAFE_INTEGER;
  const r = await env.DB.prepare("SELECT * FROM media WHERE tenant_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT 51")
    .bind(tenantId, Number.isFinite(before) ? before : Number.MAX_SAFE_INTEGER)
    .all<MediaRow>();
  const items = r.results.slice(0, 50);
  return { items: items.map((m) => mediaDto(env, m)), nextCursor: r.results.length > 50 ? String(items[items.length - 1]!.created_at) : null };
}

export async function updateMediaAlt(env: Env, tenantId: string, id: string, alt: string | null): Promise<void> {
  const clean = alt ? alt.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 150) || null : null;
  const r = await env.DB.prepare("UPDATE media SET alt = ? WHERE id = ? AND tenant_id = ?").bind(clean, id, tenantId).run();
  if (r.meta.changes !== 1) throw notFound("Foto");
}

export async function deleteMedia(env: Env, tenantId: string, id: string, force: boolean): Promise<void> {
  const m = await env.DB.prepare("SELECT * FROM media WHERE id = ? AND tenant_id = ?").bind(id, tenantId).first<MediaRow>();
  if (!m) throw notFound("Foto");
  if (!force) {
    const row = await getContentRow(env.DB, tenantId);
    const used = new Set<string>();
    for (const json of [row?.draft_json, row?.published_json]) {
      if (json) collectMediaIds(JSON.parse(json) as Content).forEach((x) => used.add(x));
    }
    if (used.has(id)) throw new ApiError(409, "MEDIA_IN_USE", "Foto ini masih dipakai di situs. Lepaskan dulu dari konten atau hapus paksa.");
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM media WHERE id = ? AND tenant_id = ?").bind(id, tenantId),
    env.DB.prepare("UPDATE tenants SET media_used_bytes = MAX(0, media_used_bytes - ?), media_count = MAX(0, media_count - 1) WHERE id = ?").bind(m.bytes, tenantId),
  ]);
  await env.MEDIA.delete(m.r2_key);
}
