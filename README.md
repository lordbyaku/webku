# Platform Website UMKM

CMS + 30 template untuk website UMKM, berjalan 100% di Cloudflare (paket Free).
Dokumentasi lengkap ada di [`docs/`](docs/PRD.md).

## Struktur

```
apps/
  cms-worker/    API CMS & admin (Hono + D1 + R2), host antarmuka CMS
  site-worker/   Melayani *.domainku.id dari R2 + landing page
packages/
  shared/          HTML aman (escape otomatis), PBKDF2, ID, slug, waktu
  content-schema/  Skema konten (Valibot) + konten contoh per kategori
  templates/       12 tema × 10 layout → 30 template, renderer HTML
migrations/      SQL D1
scripts/         create-admin.mjs
```

## Menjalankan secara lokal

Prasyarat: Node.js 22+.

```bash
npm install
```

```bash
npm run db:migrate:local
```

Buat admin lokal (simpan SQL di luar repo):

```bash
node scripts/create-admin.mjs adminku "PasswordAdminPanjang-1" > ../admin.sql
```

```bash
cd apps/cms-worker && npx wrangler d1 execute umkm-db --local --persist-to ../../.wrangler/state --file ../../../admin.sql
```

Build antarmuka CMS (hasilnya masuk ke `apps/cms-worker/public`):

```bash
npm run build
```

Jalankan kedua Worker (dua terminal), lalu buka `http://localhost:8787` untuk CMS:

```bash
npm run dev:cms
```

```bash
npm run dev:site
```

- API CMS: `http://localhost:8787/api` (header wajib untuk method tulis: `Origin: http://localhost:8787` dan `X-CMS: 1`)
- Situs publik: `http://<slug>.localhost:8788/` (atau header `X-Dev-Host: <slug>.domainku.id`) — hanya aktif di `env.dev`
- Landing page: `http://localhost:8788/`

## Tes

```bash
npm test
```

```bash
npm run typecheck
```

- Unit test paket (`vitest`, Node).
- Tes integrasi API di runtime Workers asli (`@cloudflare/vitest-plugin` + Miniflare): alur admin → pelanggan → publish, isolasi antar tenant, CSRF, lockout, hosting.

## Deploy

Konfigurasi `wrangler.jsonc` sudah dipisah: **bagian utama = produksi** (`wrangler deploy`), **`env.dev` = lokal** (dipakai otomatis oleh `npm run dev:*` dan tes).

```bash
npm run build
```

```bash
cd apps/cms-worker && npx wrangler d1 migrations apply umkm-db --remote && npx wrangler deploy
```

```bash
cd apps/site-worker && npx wrangler deploy
```

Pemulihan backup: lihat `scripts/restore-backup.mjs` dan [`docs/DATABASE.md`](docs/DATABASE.md) §8.


Ikuti [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Sebelum deploy produksi:
1. Di bagian produksi kedua `wrangler.jsonc`: ganti `domainku.id` (vars & routes), `BRAND_NAME`, `TURNSTILE_SITE_KEY`, `ZONE_ID`.
2. Isi `database_id` D1 (bagian produksi).
3. Set rahasia `TURNSTILE_SECRET` (dan opsional `CF_PURGE_TOKEN`) dengan `wrangler secret put`.
4. Ganti nomor WhatsApp di `apps/site-worker/public/_landing/index.html`.
