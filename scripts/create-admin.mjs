#!/usr/bin/env node
// Membuat SQL INSERT untuk akun admin pertama (hash PBKDF2-SHA256, format sama dengan @umkm/shared).
// Pemakaian:
//   node scripts/create-admin.mjs <username> <password> [iterasi] > admin.sql
//   npx wrangler d1 execute umkm-db --remote --file admin.sql   (jalankan dari apps/cms-worker)
import { webcrypto as crypto } from "node:crypto";

const [username, password, iterArg] = process.argv.slice(2);
if (!username || !password) {
  console.error("Pemakaian: node scripts/create-admin.mjs <username> <password> [iterasi]");
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
  console.error("Username 3-32 karakter: huruf kecil, angka, titik, garis");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Password admin minimal 12 karakter");
  process.exit(1);
}
const iter = Math.min(Number(iterArg) || 100000, 100000);
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256));
const b64 = (u) => Buffer.from(u).toString("base64");
const A = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
const id = "u_" + Array.from(crypto.getRandomValues(new Uint8Array(21)), (b) => A[b & 63]).join("");
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
console.log(
  `INSERT INTO users (id, tenant_id, username, role, pw_hash, pw_salt, pw_iter, must_change_pw, created_at) VALUES (${q(id)}, NULL, ${q(username)}, 'admin', ${q(b64(bits))}, ${q(b64(salt))}, ${iter}, 0, ${Date.now()});`,
);
