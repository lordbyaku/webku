# DEPLOYMENT — Infrastruktur & Operasional Cloudflare

Versi 1.0 · 18 November 2026 · Placeholder domain: `domainku.id`

---

## 1. Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| Akun Cloudflare | Paket Free, aktifkan 2FA pada akun |
| Domain | Dibeli di registrar mana pun; **nameserver diarahkan ke Cloudflare** |
| Node.js | v22 LTS + pnpm |
| Wrangler | Versi terbaru (`pnpm add -D wrangler`) |
| Git + GitHub | Repo privat; GitHub Actions (gratis untuk repo privat dengan kuota menit) |

> **Saran domain:** `.com` (± $10/tahun di Cloudflare Registrar, harga pokok) atau `.id` / `.my.id` / `.biz.id` dari registrar lokal (PANDI). Semua bisa dipakai selama nameserver ke Cloudflare. Pilih nama pendek & mudah diketik karena akan menjadi bagian alamat setiap pelanggan.

## 2. Peta Sumber Daya

| Sumber daya | Nama | Catatan |
|---|---|---|
| Zone | `domainku.id` | Free plan, SSL mode **Full (strict)**, Always Use HTTPS, HSTS |
| Worker | `umkm-site` | Route `*.domainku.id/*` |
| Worker | `umkm-cms` | Custom Domain `cms.domainku.id` |
| D1 | `umkm-db` | Binding `DB` (cms) |
| D1 (staging) | `umkm-db-staging` | Binding `DB` (cms staging) |
| R2 | `umkm-sites` | Privat. Binding `SITES` (site: baca; cms: tulis) |
| R2 | `umkm-media` | Publik via Custom Domain `media.domainku.id`. Binding `MEDIA` (cms) |
| Turnstile | widget "CMS Login" | Hostname `cms.domainku.id`, mode Managed |
| WAF | 1 Rate Limiting rule | Login CMS |
| API Token | `cms-purge` | Izin: Zone → Cache Purge → domainku.id |

## 3. DNS

| Tipe | Nama | Isi | Proxy |
|---|---|---|---|
| `AAAA` | `*` | `100::` | ✅ Proxied (dummy origin; ditangani Worker route) |
| `AAAA` | `@` | `100::` | ✅ (landing page — Worker/Static Assets) |
| `CNAME` | `www` | `domainku.id` | ✅ |
| (otomatis) | `cms` | dibuat oleh Workers Custom Domain | ✅ |
| (otomatis) | `media` | dibuat oleh R2 Custom Domain | ✅ |

- Wildcard proxied DNS didukung di semua paket. **Universal SSL gratis mencakup `domainku.id` dan `*.domainku.id`** (satu tingkat) — maka subdomain pelanggan harus satu tingkat.
- Record eksplisit (`cms`, `media`, `www`) lebih spesifik daripada wildcard sehingga tidak tertimpa.

## 4. Routing Worker

| Pola | Worker | Catatan |
|---|---|---|
| `*.domainku.id/*` | `umkm-site` | Melayani semua subdomain pelanggan |
| `cms.domainku.id` | `umkm-cms` | Custom Domain (lebih prioritas daripada route wildcard) |
| `media.domainku.id/*` | **None** (route tanpa Worker) | Pastikan R2 publik tidak tertangkap route wildcard |
| `www.domainku.id/*`, `domainku.id/*` | `umkm-site` (atau Worker landing) | site Worker mengenali host ini → landing page |

> Setelah deploy, uji: `curl -I https://media.domainku.id/<objek>` harus dilayani R2 (header `cf-cache-status`, tanpa header buatan site Worker).

## 5. Konfigurasi Wrangler

### 5.1 `apps/site-worker/wrangler.jsonc`
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "umkm-site",
  "main": "src/index.ts",
  "compatibility_date": "2026-11-01",
  "workers_dev": false,
  "routes": [
    { "pattern": "*.domainku.id/*", "zone_name": "domainku.id" },
    { "pattern": "domainku.id/*", "zone_name": "domainku.id" }
  ],
  "assets": {
    "directory": "./public",          // berisi /_tpl/**, /favicon.ico, landing page
    "binding": "ASSETS",
    "not_found_handling": "none"
    // run_worker_first TIDAK diaktifkan: aset statis dilayani tanpa memanggil Worker (gratis)
  },
  "r2_buckets": [
    { "binding": "SITES", "bucket_name": "umkm-sites" }
  ],
  "vars": {
    "ROOT_DOMAIN": "domainku.id",
    "MEDIA_ORIGIN": "https://media.domainku.id"
  },
  "observability": { "enabled": true, "head_sampling_rate": 0.1 }
}
```

### 5.2 `apps/cms-worker/wrangler.jsonc`
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "umkm-cms",
  "main": "src/index.ts",
  "compatibility_date": "2026-11-01",
  "compatibility_flags": ["nodejs_compat"],
  "workers_dev": false,
  "routes": [
    { "pattern": "cms.domainku.id", "custom_domain": true }
  ],
  "assets": {
    "directory": "./public",           // hasil build cms-ui + salinan /_tpl/**
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]     // hanya API yang memanggil Worker
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "umkm-db", "database_id": "<ID>", "migrations_dir": "../../migrations" }
  ],
  "r2_buckets": [
    { "binding": "SITES", "bucket_name": "umkm-sites" },
    { "binding": "MEDIA", "bucket_name": "umkm-media" }
  ],
  "vars": {
    "ROOT_DOMAIN": "domainku.id",
    "CMS_ORIGIN": "https://cms.domainku.id",
    "MEDIA_ORIGIN": "https://media.domainku.id",
    "ZONE_ID": "<ZONE_ID>",
    "TURNSTILE_SITE_KEY": "<SITE_KEY>",
    "PBKDF2_ITER": "100000"
  },
  "triggers": { "crons": ["0 * * * 0"] },
  "observability": { "enabled": true },
  "env": {
    "staging": {
      "name": "umkm-cms-staging",
      "workers_dev": true,
      "routes": [],
      "d1_databases": [
        { "binding": "DB", "database_name": "umkm-db-staging", "database_id": "<ID_STAGING>", "migrations_dir": "../../migrations" }
      ],
      "r2_buckets": [
        { "binding": "SITES", "bucket_name": "umkm-sites-staging" },
        { "binding": "MEDIA", "bucket_name": "umkm-media-staging" }
      ],
      "triggers": { "crons": [] }
    }
  }
}
```

> Format & nama kunci di atas mengikuti dokumentasi Wrangler per November 2026. Jalankan `wrangler types` setelah mengubah config untuk menghasilkan tipe `Env`.

## 6. Langkah Setup Pertama (sekali)

```bash
# 1. Login
pnpm wrangler login

# 2. Database
pnpm wrangler d1 create umkm-db
pnpm wrangler d1 create umkm-db-staging
#   → salin database_id ke wrangler.jsonc

# 3. Bucket
pnpm wrangler r2 bucket create umkm-sites
pnpm wrangler r2 bucket create umkm-media
pnpm wrangler r2 bucket create umkm-sites-staging
pnpm wrangler r2 bucket create umkm-media-staging

# 4. Migrasi
pnpm wrangler d1 migrations apply umkm-db --remote

# 5. Rahasia
pnpm wrangler secret put TURNSTILE_SECRET --name umkm-cms
pnpm wrangler secret put CF_PURGE_TOKEN   --name umkm-cms

# 6. Deploy
pnpm -r build
pnpm --filter site-worker exec wrangler deploy
pnpm --filter cms-worker  exec wrangler deploy

# 7. Buat admin pertama (skrip lokal yang menghasilkan hash PBKDF2 lalu INSERT)
pnpm tsx scripts/create-admin.ts --username <nama> | pnpm wrangler d1 execute umkm-db --remote --command -
```

Langkah dashboard:
1. **R2 → umkm-media → Settings → Custom Domains** → tambah `media.domainku.id`. Jangan aktifkan `r2.dev` publik.
2. **R2 → umkm-media → CORS**: tidak perlu (upload lewat Worker).
3. **Workers Routes**: tambah route `media.domainku.id/*` dengan Worker = *None*.
4. **Turnstile** → buat widget untuk `cms.domainku.id` → salin site key & secret.
5. **Security → WAF → Rate limiting rules** → buat aturan login (SECURITY.md §4.3).
6. **Rules → Transform Rules** (hostname `media.domainku.id`) → tambah header `X-Content-Type-Options: nosniff`.
7. **SSL/TLS**: Full (strict), Always Use HTTPS, Min TLS 1.2, HSTS (setelah semuanya stabil).
8. **(Opsional) Zero Trust → Access**: lindungi `cms.domainku.id/admin*` & `/api/admin*` dengan email OTP.
9. **Web Analytics** (opsional): aktifkan untuk melihat kunjungan tanpa cookie.

## 7. CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: deploy
on:
  push: { branches: [main] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck && pnpm -r lint && pnpm -r test
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile && pnpm -r build
      - run: pnpm wrangler d1 migrations apply umkm-db --remote
        working-directory: apps/cms-worker
        env: { CLOUDFLARE_API_TOKEN: "${{ secrets.CF_DEPLOY_TOKEN }}", CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CF_ACCOUNT_ID }}" }
      - run: pnpm wrangler deploy
        working-directory: apps/site-worker
        env: { CLOUDFLARE_API_TOKEN: "${{ secrets.CF_DEPLOY_TOKEN }}", CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CF_ACCOUNT_ID }}" }
      - run: pnpm wrangler deploy
        working-directory: apps/cms-worker
        env: { CLOUDFLARE_API_TOKEN: "${{ secrets.CF_DEPLOY_TOKEN }}", CLOUDFLARE_ACCOUNT_ID: "${{ secrets.CF_ACCOUNT_ID }}" }
```

- `CF_DEPLOY_TOKEN`: token dengan izin Workers Scripts Edit, Workers Routes Edit, D1 Edit, R2 Edit — dibatasi ke akun ini.
- Migrasi selalu **dijalankan sebelum** deploy kode; migrasi harus kompatibel mundur (tambah kolom dulu, hapus kolom di rilis berikutnya).
- **Urutan deploy aset template:** site Worker dulu (agar CSS hash baru tersedia), baru cms Worker, lalu "Terbitkan ulang semua" jika template berubah.

## 8. Lingkungan

| Lingkungan | Akses | Data |
|---|---|---|
| Lokal | `wrangler dev` (Miniflare: D1/R2 lokal) | Seed dari `scripts/seed.ts` (3 tenant contoh) |
| Staging | `umkm-cms-staging.<akun>.workers.dev` | D1 & R2 staging terpisah. Situs publik staging diuji via preview CMS |
| Produksi | `cms.domainku.id`, `*.domainku.id` | Data asli |

> Staging sengaja tidak memakai `*.staging.domainku.id` karena subdomain dua tingkat tidak tercakup Universal SSL gratis.

## 9. Pemantauan

| Apa | Di mana | Ambang peringatan |
|---|---|---|
| Request Worker harian (akun) | Dashboard → Workers & Pages → Overview | > 70.000/hari |
| CPU time login | Workers Observability (`umkm-cms`) | p99 > 8 ms |
| Error 5xx | Workers Observability | > 1% |
| D1 rows read/written | Dashboard → D1 → Metrics | > 70% kuota harian |
| R2 storage | Dashboard → R2 | > 7 GB |
| Backup terakhir | Admin `/admin/stats` (dari `job_state`) | > 8 hari |

Aktifkan **Notifications** (gratis) di dashboard: *Usage-based billing* tidak berlaku di Free, tetapi notifikasi Health/Origin & "Workers weekly summary" berguna. Cek dashboard kuota setidaknya seminggu sekali.

## 10. Backup & Pemulihan

| Skenario | Prosedur |
|---|---|
| Salah ubah konten satu pelanggan | v1 hanya menyimpan satu versi terbit. Ambil konten tenant itu dari backup mingguan (atau restore Time Travel ke DB staging lalu salin baris `site_content`-nya). Riwayat versi direncanakan di Fase 7 |
| Kerusakan DB (≤ 7 hari) | `wrangler d1 time-travel info umkm-db` → `wrangler d1 time-travel restore umkm-db --timestamp=<ISO>` (menimpa seluruh DB! ekspor dulu kondisi sekarang) |
| Kerusakan DB (> 7 hari) | Unduh `umkm-sites/backups/<tanggal>.json.gz` → `scripts/restore-from-backup.ts` ke DB baru → ganti `database_id` |
| HTML situs hilang di R2 | Admin "Terbitkan ulang semua" (HTML selalu dapat dibuat ulang dari DB) |
| Foto hilang | Tidak dapat dibuat ulang — R2 sangat tahan lama (11 nines); opsional salinan bulanan foto ke penyimpanan lokal Anda via `rclone` |

Uji restore ke DB staging **setiap 3 bulan**.

## 11. Estimasi Biaya

| Item | Biaya |
|---|---|
| Cloudflare (Workers, D1, R2, Turnstile, WAF, DNS, SSL) — 100 situs | **$0 / bulan** |
| Domain | ± Rp 15.000 – 250.000 / tahun (tergantung TLD) |
| GitHub (repo privat + Actions) | $0 |
| **Total tahun pertama** | **± harga domain saja** |

Jika suatu saat perlu upgrade:

| Item | Biaya |
|---|---|
| Workers Paid (request tanpa batas harian, 10 juta/bulan termasuk, CPU hingga 5 menit, D1 & KV lebih besar) | $5 / bulan |
| Domain kustom pelanggan (Cloudflare for SaaS) | 100 hostname gratis, lalu $0,10 / hostname / bulan |
| R2 di atas 10 GB | $0,015 / GB / bulan |

## 12. Fase 7 — Domain Kustom Pelanggan (rencana)

1. Dashboard zona `domainku.id` → **SSL/TLS → Custom Hostnames** → aktifkan Cloudflare for SaaS, set *Fallback Origin* `fallback.domainku.id` (AAAA `100::`, proxied).
2. Tambah route `*/*` (atau per hostname) ke `umkm-site` agar custom hostname ditangani Worker.
3. Admin menambahkan `www.tokoku.com` → CMS memanggil API `POST /zones/{zone_id}/custom_hostnames` (SSL DV via HTTP/TXT) → simpan `cf_hostname_id` di `hostnames` (status `pending`).
4. Pelanggan membuat `CNAME www → cname.domainku.id` di registrar mereka.
5. Cron/admin mengecek status → `active` → publish ulang tenant agar HTML ditulis ke `h/www.tokoku.com/…`.
6. Apex (`tokoku.com`) **tidak didukung** di paket non-Enterprise; arahkan pelanggan memakai fitur *redirect/forwarding* di registrar ke `https://www.tokoku.com`.
7. Token API perlu izin tambahan: *Zone → SSL and Certificates → Edit*.
