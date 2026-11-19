#!/usr/bin/env node
// Memulihkan database dari backup mingguan di R2 (umkm-sites/backups/<runId>/).
//
// Pemakaian (jalankan dari folder apps/cms-worker):
//   node ../../scripts/restore-backup.mjs <runId> > restore.sql
//   npx wrangler d1 execute umkm-db --remote --file restore.sql      (ke database KOSONG yang sudah dimigrasi)
//
// <runId> terlihat di dashboard R2 (nama folder di dalam backups/).
// Skrip mengunduh file lewat Wrangler, lalu mencetak SQL INSERT sesuai urutan tabel induk → anak.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Harus sama dengan BACKUP_TABLES di apps/cms-worker/src/lib/jobs.ts
const TABLES = [["tenants", 200], ["users", 300], ["hostnames", 500], ["site_content", 15], ["media", 500], ["payments", 500], ["maintenance_requests", 500]];

const runId = process.argv[2];
if (!runId) {
  console.error("Pemakaian: node scripts/restore-backup.mjs <runId> > restore.sql");
  process.exit(1);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "umkm-restore-"));
const get = (key) => {
  const out = path.join(tmp, key.replace(/[\\/]/g, "_"));
  execFileSync("npx", ["wrangler", "r2", "object", "get", `umkm-sites/${key}`, "--remote", "--file", out], { stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" });
  return JSON.parse(fs.readFileSync(out, "utf8"));
};

const done = get(`backups/${runId}/_complete.json`);
const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const lines = ["PRAGMA defer_foreign_keys = ON;"];
for (const [table, limit] of TABLES) {
  const total = done.counts[table] ?? 0;
  for (let o = 0; o < total; o += limit) {
    const rows = get(`backups/${runId}/${table}-${String(o).padStart(6, "0")}.json`);
    for (const r of rows) {
      const cols = Object.keys(r);
      lines.push(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => q(r[c])).join(", ")});`);
    }
  }
  console.error(`${table}: ${total} baris`);
}
process.stdout.write(lines.join("\n") + "\n");
fs.rmSync(tmp, { recursive: true, force: true });
