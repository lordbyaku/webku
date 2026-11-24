#!/usr/bin/env node
// Mengisi merek, kontak, dan kunci produksi (bagian utama wrangler.jsonc) serta landing page.
// Alamat produksi sudah diatur di wrangler.jsonc (web.rela.my.id, cms.rela.my.id, media.rela.my.id).
// Bagian env.dev & env.staging tidak diubah.
//
// Pemakaian:
//   node scripts/configure-domain.mjs --brand "Rela Web" --wa 6281234567890 \
//     [--payment "Transfer BCA 123456 a.n. Nama"] [--turnstile-site-key 0x4AAA...]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const brand = (args.brand ?? "").trim();
const wa = (args.wa ?? "").replace(/\D/g, "").replace(/^0/, "62");
if (!brand || !/^62\d{8,13}$/.test(wa)) {
  console.error('Pemakaian: node scripts/configure-domain.mjs --brand "Rela Web" --wa 6281234567890 [--payment "..."] [--turnstile-site-key ...]');
  process.exit(1);
}

function editProduction(file, fn) {
  const p = path.join(root, file);
  const s = fs.readFileSync(p, "utf8");
  const cut = s.indexOf('"env": {');
  fs.writeFileSync(p, fn(s.slice(0, cut)) + s.slice(cut));
}
const setVar = (s, key, value) => s.replace(new RegExp(`("${key}":\\s*)"[^"]*"`), `$1${JSON.stringify(value)}`);

editProduction("apps/cms-worker/wrangler.jsonc", (s) => {
  s = setVar(s, "BRAND_NAME", brand);
  s = setVar(s, "ADMIN_WA", wa);
  if (args.payment) s = setVar(s, "PAYMENT_INFO", args.payment);
  if (args["turnstile-site-key"]) s = setVar(s, "TURNSTILE_SITE_KEY", args["turnstile-site-key"]);
  return s;
});
console.log("✓ apps/cms-worker/wrangler.jsonc (produksi)");

const prodSite = fs.readFileSync(path.join(root, "apps/site-worker/wrangler.jsonc"), "utf8").split('"env": {')[0];
const platform = /"PLATFORM_HOST":\s*"([^"]+)"/.exec(prodSite)?.[1] ?? "web.rela.my.id";
const landing = path.join(root, "apps/site-worker/public/_landing/index.html");
let html = fs.readFileSync(landing, "utf8");
html = html
  .replace(/wa\.me\/\d+/g, `wa.me/${wa}`)
  .replace(/namausaha\.domainku\.id/g, `${platform}/namausaha`)
  .replace(/Domain<span>Ku<\/span>/g, brand)
  .replace(/DomainKu/g, brand)
  .replace(/<!-- GANTI nomor WhatsApp[^>]*-->\s*/g, "");
fs.writeFileSync(landing, html);
console.log("✓ landing page (merek, nomor WhatsApp, contoh alamat)");
if (!args["turnstile-site-key"]) console.log("! TURNSTILE_SITE_KEY belum diisi — buat widget Turnstile untuk cms.rela.my.id lalu jalankan ulang dengan --turnstile-site-key");
