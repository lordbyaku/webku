/**
 * Tugas terjadwal (cron tiap jam). Setiap jalan hanya mengerjakan potongan kecil supaya
 * muat dalam batas CPU 10 ms paket Free.
 *  1. Bersihkan sesi kedaluwarsa & log audit > 1 tahun.
 *  2. Hapus permanen satu pelanggan yang dihapus > 30 hari (beserta foto & file situs).
 *  3. Backup mingguan D1 → R2 (umkm-sites/backups/<runId>/...), bertahap per tabel.
 */
import { DAY_MS } from "@umkm/shared";
import type { Env } from "../env";
import { auditStmt } from "./audit";
import { deleteHostFiles } from "./publish";

/** Urutan tabel sama dengan urutan pemulihan (induk dulu). [nama, baris per potongan] */
export const BACKUP_TABLES: Array<[string, number]> = [
  ["tenants", 200],
  ["users", 300],
  ["hostnames", 500],
  ["site_content", 15],
  ["media", 500],
  ["payments", 500],
  ["maintenance_requests", 500],
];

const BACKUP_EVERY = 7 * DAY_MS;
const KEEP_RUNS = 8;
const CHUNKS_PER_RUN = 4;

interface BackupState {
  runId: string;
  t: number; // indeks tabel
  o: number; // offset baris
  done: boolean;
  finishedAt?: number;
  counts: Record<string, number>;
}

async function getState(env: Env): Promise<BackupState | null> {
  const r = await env.DB.prepare("SELECT cursor FROM job_state WHERE job = 'backup'").first<{ cursor: string | null }>();
  return r?.cursor ? (JSON.parse(r.cursor) as BackupState) : null;
}

async function setState(env: Env, s: BackupState): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO job_state (job, cursor, run_id, updated_at) VALUES ('backup', ?, ?, ?) ON CONFLICT(job) DO UPDATE SET cursor = excluded.cursor, run_id = excluded.run_id, updated_at = excluded.updated_at",
  )
    .bind(JSON.stringify(s), s.runId, Date.now())
    .run();
}

/** Hapus run backup lama, sisakan KEEP_RUNS terbaru. */
async function pruneOldBackups(env: Env): Promise<void> {
  const list = await env.SITES.list({ prefix: "backups/", delimiter: "/" });
  const runs = (list.delimitedPrefixes ?? []).sort();
  for (const prefix of runs.slice(0, Math.max(0, runs.length - KEEP_RUNS))) {
    let cursor: string | undefined;
    do {
      const objs = await env.SITES.list({ prefix, cursor });
      if (objs.objects.length) await env.SITES.delete(objs.objects.map((o) => o.key));
      cursor = objs.truncated ? objs.cursor : undefined;
    } while (cursor);
  }
}

export async function backupStep(env: Env, now = Date.now()): Promise<"idle" | "progress" | "finished"> {
  let s = await getState(env);
  if (!s || (s.done && now - (s.finishedAt ?? 0) >= BACKUP_EVERY)) {
    s = { runId: new Date(now).toISOString().replace(/[:.]/g, "-"), t: 0, o: 0, done: false, counts: {} };
    await pruneOldBackups(env);
  }
  if (s.done) return "idle";

  for (let i = 0; i < CHUNKS_PER_RUN && s.t < BACKUP_TABLES.length; i++) {
    const [table, limit] = BACKUP_TABLES[s.t]!;
    // Nama tabel dari daftar tetap di atas, bukan dari input.
    const rows = await env.DB.prepare(`SELECT * FROM ${table} ORDER BY rowid LIMIT ? OFFSET ?`).bind(limit, s.o).all();
    if (rows.results.length) {
      await env.SITES.put(`backups/${s.runId}/${table}-${String(s.o).padStart(6, "0")}.json`, JSON.stringify(rows.results), {
        httpMetadata: { contentType: "application/json" },
      });
      s.counts[table] = (s.counts[table] ?? 0) + rows.results.length;
    }
    if (rows.results.length < limit) {
      s.t++;
      s.o = 0;
    } else s.o += limit;
  }

  if (s.t >= BACKUP_TABLES.length) {
    s.done = true;
    s.finishedAt = now;
    await env.SITES.put(`backups/${s.runId}/_complete.json`, JSON.stringify({ finishedAt: new Date(now).toISOString(), counts: s.counts, tables: BACKUP_TABLES.map((t) => t[0]) }), {
      httpMetadata: { contentType: "application/json" },
    });
    await setState(env, s);
    return "finished";
  }
  await setState(env, s);
  return "progress";
}

/** Hapus permanen satu pelanggan yang sudah dihapus lebih dari 30 hari. */
export async function purgeOneDeleted(env: Env, now = Date.now()): Promise<string | null> {
  const t = await env.DB.prepare("SELECT id, slug FROM tenants WHERE status = 'deleted' AND deleted_at < ? LIMIT 1")
    .bind(now - 30 * DAY_MS)
    .first<{ id: string; slug: string }>();
  if (!t) return null;
  // Foto di R2
  let cursor: string | undefined;
  do {
    const objs = await env.MEDIA.list({ prefix: `t/${t.id}/`, cursor });
    if (objs.objects.length) await env.MEDIA.delete(objs.objects.map((o) => o.key));
    cursor = objs.truncated ? objs.cursor : undefined;
  } while (cursor);
  // File situs (seharusnya sudah dihapus saat soft delete; dipastikan lagi)
  const hosts = await env.DB.prepare("SELECT hostname FROM hostnames WHERE tenant_id = ?").bind(t.id).all<{ hostname: string }>();
  for (const h of hosts.results) await deleteHostFiles(env, h.hostname);
  // Baris DB (users, content, media, payments, hostnames ikut terhapus lewat ON DELETE CASCADE)
  await env.DB.batch([
    env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(t.id),
    auditStmt(env.DB, { actorUserId: null, tenantId: t.id, action: "system.purge", detail: { slug: t.slug } }),
  ]);
  return t.id;
}

export async function runScheduled(env: Env, now = Date.now()): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    env.DB.prepare("DELETE FROM audit_log WHERE created_at < ?").bind(now - 365 * DAY_MS),
  ]);
  await purgeOneDeleted(env, now);
  await backupStep(env, now);
}

export async function lastBackupAt(env: Env): Promise<number | null> {
  const s = await getState(env);
  return s?.finishedAt ?? null;
}
