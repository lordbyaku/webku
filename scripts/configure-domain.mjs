#!/usr/bin/env node
// Mengisi domain, merek, dan kontak di konfigurasi PRODUKSI (bagian utama wrangler.jsonc)
// serta landing page. Bagian env.dev & env.staging tidak diubah.
//
// Pemakaian:
//   node scripts/configure-domain.mjs --domain situsku.id --brand "SitusKu" --wa 6281234567890 \
//     [--payment "Transfer BCA 123456 a.n. Nama"] [--turnstile-site-key 0x4AAA...] [--zone-id abc123]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);

const domain = (args.domain ?? "").toLowerCase().trim();
const brand = (args.brand ?? "").trim();
const wa = (args.wa ?? "").replace(/\D/g, "").replace(/^0/, "62");
if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) || !brand || !/^62\d{8,13}$/.test(wa)) {
  console.error('Pemakaian: node scripts/configure-domain.mjs --domain situsku.id --brand "SitusKu" --wa 6281234567890 [--payment "..."] [--turnstile-site-key ...] [--zone-id ...]');
  process.exit(1);
}

/** Ubah hanya bagian sebelum "env": { (konfigurasi produksi). */
function editProduction(file, fn) {
  const p = path.join(root, file);
  const s = fs.readFileSync(p, "utf8");
  const cut = s.indexOf('"env": {');
  const head = s.slice(0, cut);
  fs.writeFileSync(p, fn(head) + s.slice(cut));
}

const jsonStr = (v) => JSON.stringify(v);
const setVar = (s, key, value) => s.replace(new RegExp(`("${key}":\\s*)"[^"]*"`), `$1${jsonStr(value)}`);

for (const file of ["apps/cms-worker/wrangler.jsonc", "apps/site-worker/wrangler.jsonc"]) {
  editProduction(file, (s) => {
    s = s.replace(/domainku\.id/g, domain);
    s = setVar(s, "ROOT_DOMAIN", domain);
    if (s.includes('"BRAND_NAME"')) s = setVar(s, "BRAND_NAME", brand);
    if (s.includes('"ADMIN_WA"')) s = setVar(s, "ADMIN_WA", wa);
    if (args.payment && s.includes('"PAYMENT_INFO"')) s = setVar(s, "PAYMENT_INFO", args.payment);
    if (args["turnstile-site-key"] && s.includes('"TURNSTILE_SITE_KEY"')) s = setVar(s, "TURNSTILE_SITE_KEY", args["turnstile-site-key"]);
    if (args["zone-id"] && s.includes('"ZONE_ID"')) s = setVar(s, "ZONE_ID", args["zone-id"]);
    return s;
  });
  console.log(`✓ ${file} (produksi)`);
}

const landing = path.join(root, "apps/site-worker/public/_landing/index.html");
let html = fs.readFileSync(landing, "utf8");
html = html
  .replace(/wa\.me\/\d+/g, `wa.me/${wa}`)
  .replace(/namausaha\.domainku\.id/g, `namausaha.${domain}`)
  .replace(/DomainKu/g, brand)
  .replace(/Domain<span>Ku<\/span>/g, brand)
  .replace(/<!-- GANTI nomor WhatsApp[^>]*-->\s*/g, "");
fs.writeFileSync(landing, html);
console.log("✓ landing page (nama merek & nomor WhatsApp)");

console.log(`
Selesai. Langkah berikutnya:
  1. Arahkan nameserver ${domain} ke Cloudflare (dashboard → Add a site).
  2. node scripts/setup-cloudflare.mjs --production
${args["turnstile-site-key"] ? "" : "  3. Buat widget Turnstile untuk cms." + domain + " lalu jalankan ulang skrip ini dengan --turnstile-site-key\n"}`);
