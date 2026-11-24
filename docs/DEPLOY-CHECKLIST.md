# Checklist Deploy

Dua tahap: **staging di workers.dev** (bisa sekarang, tanpa domain) lalu **produksi** (setelah domain dibeli).

> ⚠️ Kuota paket Free dihitung **per akun Cloudflare** (mis. 100.000 request Worker/hari, 5 cron trigger). Jika akun juga dipakai proyek lain, kuotanya dibagi. Disarankan akun Cloudflare khusus untuk platform ini.

---

## A. Staging (workers.dev)

Tujuan: menguji di Cloudflare asli — CPU login (batas 10 ms), Lighthouse, alur pelanggan dari HP.

1. Pastikan Wrangler login ke akun yang benar:
   ```bash
   npx wrangler whoami
   ```
   Ganti akun: `npx wrangler logout` lalu `npx wrangler login`.
2. Jalankan:
   ```bash
   node scripts/setup-cloudflare.mjs --staging
   ```
   Skrip membuat `umkm-db-staging`, `umkm-sites-staging`, `umkm-media-staging`, migrasi, build, deploy kedua Worker, mengisi URL workers.dev, rahasia Turnstile uji, dan akun admin. Kredensial admin → `STAGING-LOGIN.local.md` (tidak masuk git).
3. Commit perubahan `database_id` & URL staging di `wrangler.jsonc` (bukan rahasia).
4. Uji:
   - [ ] Login admin di `https://umkm-cms-staging.<sub>.workers.dev`
   - [ ] Buat pelanggan → isi konten → unggah foto dari HP → Terbitkan pertama kali
   - [ ] Buka `https://umkm-site-staging.<sub>.workers.dev/<subdomain>/` di HP — huruf premium tampil, foto tampil
   - [ ] Login sebagai pelanggan (jendela samaran), ganti password, ubah harga, Terbitkan
   - [ ] Dashboard Cloudflare → Workers → `umkm-cms-staging` → Observability: **CPU time `POST /api/auth/login` < 10 ms**. Jika lebih: turunkan `PBKDF2_ITER` (mis. 60000) di wrangler.jsonc, deploy ulang (hash lama otomatis menyesuaikan saat login berikutnya hanya bila iterasi dinaikkan — untuk menurunkan, reset password akun).
   - [ ] PageSpeed Insights (https://pagespeed.web.dev) untuk 2–3 situs: Performance ≥ 90 di mobile
   - [ ] Tunggu ±1 jam → statistik admin menampilkan "Backup otomatis terakhir"

Catatan staging: Turnstile memakai kunci uji (selalu lolos) dan foto dilayani lewat proxy CMS. Jangan simpan data pelanggan asli di staging.

---

## B. Produksi (rela.my.id)

Alamat sudah dikonfigurasi di `wrangler.jsonc`:

| Fungsi | Alamat | Cara terpasang |
|---|---|---|
| Landing + situs pelanggan | `https://web.rela.my.id/<slug>/` | Workers Custom Domain (otomatis saat deploy) |
| CMS | `https://cms.rela.my.id` | Workers Custom Domain (otomatis saat deploy) |
| Foto | `https://media.rela.my.id` | R2 Custom Domain (dashboard) |

Tidak memakai DNS wildcard, sehingga `rela.my.id`, `www`, `pos` dan subdomain lain tidak tersentuh. Domain milik pelanggan (Fase 7) ditambahkan per pelanggan lewat Cloudflare for SaaS dan dilayani Worker yang sama.

### B1. Merek & kunci
- [ ] **Turnstile → Add widget**: hostname `cms.rela.my.id`, mode *Managed* → catat site key & secret
- [ ] Isi merek & kontak:
  ```bash
  node scripts/configure-domain.mjs --brand "<Merek>" --wa 628xxxxxxxxxx --payment "Transfer BCA 123 a.n. ..." --turnstile-site-key <site-key>
  ```

### B2. Sumber daya & rahasia
- [ ] `node scripts/setup-cloudflare.mjs --production` (D1 `umkm-db`, R2 `umkm-sites` & `umkm-media`, migrasi)
- [ ] Rahasia (dari `apps/cms-worker`):
  ```bash
  npx wrangler secret put TURNSTILE_SECRET
  ```
  ```bash
  npx wrangler secret put CF_PURGE_TOKEN
  ```
  (`CF_PURGE_TOKEN` opsional: API token izin *Zone → Cache Purge* untuk zona rela.my.id.)
- [ ] `node scripts/setup-cloudflare.mjs --production --deploy` → membuat `web.rela.my.id` & `cms.rela.my.id`
- [ ] Commit `database_id` produksi

### B3. Dashboard Cloudflare
- [ ] **R2 → umkm-media → Settings → Custom Domains** → `media.rela.my.id`. Jangan aktifkan r2.dev
- [ ] **Rules → Transform Rules → Response headers** (hostname `media.rela.my.id`): `X-Content-Type-Options: nosniff`
- [ ] **Security → WAF → Rate limiting rules**: host `cms.rela.my.id` + path `/api/auth/login` → batasi per IP → Block
- [ ] (Disarankan) **Zero Trust → Access**: lindungi `cms.rela.my.id/admin*` & `/api/admin*` dengan email OTP

### B4. Akun admin produksi
```bash
node scripts/create-admin.mjs <username> "<password ≥ 16 karakter>" > ../admin.sql
```
```bash
cd apps/cms-worker && npx wrangler d1 execute umkm-db --remote --file ../../../admin.sql
```
Hapus `admin.sql` setelahnya.

### B5. Verifikasi
- [ ] `https://web.rela.my.id` → landing page dengan merek & nomor WA Anda
- [ ] `https://cms.rela.my.id` → login admin
- [ ] Buat pelanggan uji → terbitkan → `https://web.rela.my.id/<slug>/` tampil, huruf & foto OK
- [ ] `https://web.rela.my.id/tidak-ada/` → halaman "Situs tidak ditemukan"
- [ ] `rela.my.id`, `www.rela.my.id`, `pos.rela.my.id` tetap normal
- [ ] `curl -I https://media.rela.my.id/<kunci-foto>` dilayani R2
- [ ] Ubah konten → Terbitkan → tampil ≤ 5 menit (atau segera bila `CF_PURGE_TOKEN` diset)
- [ ] Nonaktifkan lalu hapus pelanggan uji

### B6. Otomasi (opsional)
GitHub → Settings → Secrets and variables → Actions:
- `CLOUDFLARE_API_TOKEN` (izin Workers Scripts Edit, Workers Routes Edit, D1 Edit, Workers R2 Storage Edit)
- `CLOUDFLARE_ACCOUNT_ID`

Lalu Actions → **Deploy** → Run workflow → pilih `staging` / `production`. Setiap push ke `main` otomatis menjalankan **CI** (build, typecheck, 49+ tes).

---

## Pemantauan rutin (mingguan)
- Workers & Pages → request harian (akun) < 70.000
- D1 → rows read/written < 70% kuota
- R2 → storage < 7 GB
- Admin → "Backup otomatis terakhir" < 8 hari

---

## Status produksi (24 November 2026)

| Komponen | Status |
|---|---|
| `https://web.rela.my.id` (landing + situs pelanggan) | ✅ Tayang (Worker `umkm-site`) |
| `https://cms.rela.my.id` | ✅ Tayang (Worker `umkm-cms`), Turnstile asli aktif |
| `https://media.rela.my.id` | ✅ Terhubung ke R2 `umkm-media` (SSL diterbitkan otomatis) |
| D1 `umkm-db`, R2 `umkm-sites` & `umkm-media` | ✅ Dibuat, migrasi 0001–0002 diterapkan |
| Akun admin produksi | ✅ `PRODUCTION-LOGIN.local.md` (lokal, tidak di git) |
| Backup otomatis | ✅ Cron tiap jam (backup mingguan bertahap) |
| `CF_PURGE_TOKEN` | ⏳ Belum (opsional — tanpa ini perubahan tayang ≤ 5 menit) |
| WAF rate limit login, Transform Rule media, Cloudflare Access | ⏳ Manual di dashboard (lihat B3) |

### Catatan CPU login (keputusan: dibiarkan dulu)
Terukur di staging: login **24 ms CPU**, buat pelanggan **17 ms** (batas Workers Free 10 ms). Saat ini dibiarkan.
Jika login mulai sering gagal dengan **error 1102**:
1. Ubah `PBKDF2_ITER` menjadi `"35000"` di bagian produksi `apps/cms-worker/wrangler.jsonc`, lalu `cd apps/cms-worker && npx wrangler deploy`
   (berlaku untuk password baru/hasil reset; password lama tetap bisa dipakai), **atau**
2. Upgrade ke Workers Paid ($5/bulan) — sekaligus menghapus batas 100.000 request/hari yang dibagi dengan relapos/rasapos.
