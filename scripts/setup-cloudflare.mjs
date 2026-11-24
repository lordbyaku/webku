#!/usr/bin/env node
// Menyiapkan sumber daya Cloudflare & deploy. Aman dijalankan berulang (idempoten).
//
//   node scripts/setup-cloudflare.mjs --staging [--admin bossku]
//       Staging di workers.dev (tanpa domain): D1 & R2 *-staging, migrasi, build, deploy kedua Worker,
//       isi URL workers.dev otomatis, set rahasia Turnstile uji, buat akun admin.
//       Kredensial admin ditulis ke STAGING-LOGIN.local.md (diabaikan git), tidak dicetak ke layar.
//
//   node scripts/setup-cloudflare.mjs --production [--deploy]
//       Produksi: wajib sudah menjalankan configure-domain.mjs. Membuat D1 & R2, mengisi database_id,
//       migrasi. Dengan --deploy sekalian build & deploy (rahasia TURNSTILE_SECRET harus sudah diset).
import { execFileSync } from "node:child_process";
import { webcrypto as crypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CMS = path.join(root, "apps/cms-worker");
const SITE = path.join(root, "apps/site-worker");
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : d);
const STAGING = has("--staging");
const PRODUCTION = has("--production");
if (STAGING === PRODUCTION) {
  console.error("Pilih salah satu: --staging atau --production");
  process.exit(1);
}
const ENV = STAGING ? ["--env", "staging"] : [];
const sfx = STAGING ? "-staging" : "";
const DB = `umkm-db${sfx}`;

function wrangler(args, { cwd = CMS, input, quiet = false } = {}) {
  const out = execFileSync("npx", ["wrangler", ...args], {
    cwd,
    input,
    encoding: "utf8",
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: { ...process.env, FORCE_COLOR: "0", CI: "1" },
  });
  if (!quiet) process.stdout.write(out.split("\n").filter((l) => l.trim()).slice(-3).map((l) => "    " + l).join("\n") + "\n");
  return out;
}
function tryWrangler(args, opts) {
  try {
    return { ok: true, out: wrangler(args, opts) };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
}
const step = (t) => console.log(`\n▸ ${t}`);

/** Ubah blok konfigurasi tertentu di wrangler.jsonc (produksi = sebelum "env", staging = blok "staging"). */
function editBlock(file, fn) {
  const s = fs.readFileSync(file, "utf8");
  const envAt = s.indexOf('"env": {');
  if (PRODUCTION) return fs.writeFileSync(file, fn(s.slice(0, envAt)) + s.slice(envAt));
  const start = s.indexOf('"staging": {', envAt);
  const end = s.indexOf('"dev": {', start);
  fs.writeFileSync(file, s.slice(0, start) + fn(s.slice(start, end)) + s.slice(end));
}

// ---------- 0. cek ----------
step("Memeriksa akun Cloudflare");
const who = wrangler(["whoami"], { quiet: true });
const email = /associated with the email ([^\s.]+@[^\s]+?)\.?\s/.exec(who)?.[1] ?? "(tidak diketahui)";
console.log(`    Akun: ${email}`);
if (PRODUCTION) {
  const prod = fs.readFileSync(path.join(CMS, "wrangler.jsonc"), "utf8").split('"env": {')[0];
  if (prod.includes("domainku.id")) {
    console.error("\n✗ Domain produksi belum diisi. Jalankan dulu: node scripts/configure-domain.mjs --domain ... --brand ... --wa ...");
    process.exit(1);
  }
}

// ---------- 1. D1 ----------
step(`Database D1 "${DB}"`);
let dbId = null;
const list = tryWrangler(["d1", "list", "--json"], { quiet: true });
if (list.ok) {
  try {
    dbId = JSON.parse(list.out.slice(list.out.indexOf("["))).find((d) => d.name === DB)?.uuid ?? null;
  } catch {
    /* format tak terduga: coba buat */
  }
}
if (dbId) console.log(`    Sudah ada: ${dbId}`);
else {
  const created = wrangler(["d1", "create", DB], { quiet: true });
  dbId = /"database_id":\s*"([0-9a-f-]{36})"/.exec(created)?.[1] ?? /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/.exec(created)?.[1];
  if (!dbId) throw new Error("Tidak bisa membaca database_id dari output wrangler d1 create");
  console.log(`    Dibuat: ${dbId}`);
}
editBlock(path.join(CMS, "wrangler.jsonc"), (s) =>
  s.replace(new RegExp(`("database_name":\\s*"${DB}",\\s*"database_id":\\s*)"[^"]*"`), `$1"${dbId}"`),
);

// ---------- 2. R2 ----------
for (const b of [`umkm-sites${sfx}`, `umkm-media${sfx}`]) {
  step(`Bucket R2 "${b}"`);
  const r = tryWrangler(["r2", "bucket", "create", b], { quiet: true });
  console.log(r.ok ? "    Dibuat" : /already exists|already owned|10004/i.test(r.out) ? "    Sudah ada" : `    ✗ ${r.out.trim().split("\n").pop()}`);
  if (!r.ok && !/already exists|already owned|10004/i.test(r.out)) process.exit(1);
}

// ---------- 3. migrasi ----------
step("Migrasi database (remote)");
wrangler(["d1", "migrations", "apply", DB, "--remote", ...ENV]);

if (PRODUCTION && !has("--deploy")) {
  console.log(`
✓ Sumber daya produksi siap. Langkah berikutnya (sekali saja):
    cd apps/cms-worker
    npx wrangler secret put TURNSTILE_SECRET
    npx wrangler secret put CF_PURGE_TOKEN        (opsional, token izin Zone → Cache Purge)
  Lalu: node scripts/setup-cloudflare.mjs --production --deploy
  Dan lakukan langkah dashboard di docs/DEPLOY-CHECKLIST.md (R2 custom domain media.*, route media tanpa Worker, WAF).`);
  process.exit(0);
}

// ---------- 4. build & deploy ----------
step("Build antarmuka CMS & huruf");
execFileSync("npm", ["run", "build"], { cwd: root, stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" });
console.log("    OK");

step("Deploy Worker situs");
const siteOut = wrangler(["deploy", ...ENV], { cwd: SITE });
step("Deploy Worker CMS");
let cmsOut = wrangler(["deploy", ...ENV], { cwd: CMS });

if (STAGING) {
  const sub = /https:\/\/umkm-(?:cms|site)-staging\.([a-z0-9-]+)\.workers\.dev/.exec(cmsOut + siteOut)?.[1];
  if (!sub) throw new Error("Tidak bisa membaca subdomain workers.dev dari output deploy");
  const cfgs = [path.join(CMS, "wrangler.jsonc"), path.join(SITE, "wrangler.jsonc")];
  const needs = cfgs.some((f) => fs.readFileSync(f, "utf8").includes(".SUBDOMAIN.workers.dev"));
  if (needs) {
    step(`Mengisi URL staging (*.${sub}.workers.dev) & deploy ulang`);
    for (const f of cfgs) editBlock(f, (s) => s.replaceAll(".SUBDOMAIN.workers.dev", `.${sub}.workers.dev`));
    wrangler(["deploy", ...ENV], { cwd: SITE });
    cmsOut = wrangler(["deploy", ...ENV], { cwd: CMS });
  }

  step("Rahasia Turnstile uji (staging)");
  wrangler(["secret", "put", "TURNSTILE_SECRET", ...ENV], { input: "1x0000000000000000000000000000000AA\n" });

  const loginFile = path.join(root, "STAGING-LOGIN.local.md");
  const adminUser = val("--admin", "bossku");
  if (!fs.existsSync(loginFile)) {
    step(`Akun admin staging "${adminUser}"`);
    const pw = Array.from(crypto.getRandomValues(new Uint8Array(15)), (b) => "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 56]).join("");
    const sql = execFileSync("node", [path.join(root, "scripts/create-admin.mjs"), adminUser, pw], { encoding: "utf8" });
    const tmp = path.join(root, ".wrangler", "admin-staging.sql");
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    fs.writeFileSync(tmp, sql);
    wrangler(["d1", "execute", DB, "--remote", ...ENV, "--file", tmp]);
    fs.rmSync(tmp);
    fs.writeFileSync(
      loginFile,
      `# Akun admin STAGING (workers.dev)\n\nFile ini diabaikan git. Hapus akun/ganti password sebelum staging dibagikan.\n\n- CMS: https://umkm-cms-staging.${sub}.workers.dev\n- Situs: https://umkm-site-staging.${sub}.workers.dev/<subdomain>/\n- Username: ${adminUser}\n- Password: ${pw}\n`,
    );
    console.log("    Kredensial ditulis ke STAGING-LOGIN.local.md");
  }
  console.log(`
✓ Staging siap:
    CMS   : https://umkm-cms-staging.${sub}.workers.dev
    Situs : https://umkm-site-staging.${sub}.workers.dev/<subdomain>/`);
} else {
  console.log("\n✓ Produksi ter-deploy. Jalankan langkah verifikasi di docs/DEPLOY-CHECKLIST.md.");
}
