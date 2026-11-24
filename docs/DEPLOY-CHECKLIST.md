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

## B. Produksi

### B1. Domain & konfigurasi (sekali)
- [ ] Beli domain; di dashboard Cloudflare **Add a site** (paket Free) → ubah nameserver di registrar → tunggu status *Active*
- [ ] Catat **Zone ID** (halaman Overview domain)
- [ ] Turnstile → Add widget → hostname `cms.<domain>`, mode *Managed* → catat **site key** & **secret**
- [ ] Isi konfigurasi:
  ```bash
  node scripts/configure-domain.mjs --domain <domain> --brand "<Merek>" --wa 628xxxxxxxxxx --payment "Transfer BCA 123 a.n. ..." --turnstile-site-key <site-key> --zone-id <zone-id>
  ```

### B2. Sumber daya & rahasia
- [ ] `node scripts/setup-cloudflare.mjs --production` (D1, R2, migrasi)
- [ ] Rahasia (dari `apps/cms-worker`):
  ```bash
  npx wrangler secret put TURNSTILE_SECRET
  ```
  ```bash
  npx wrangler secret put CF_PURGE_TOKEN
  ```
  (`CF_PURGE_TOKEN` opsional: API token dengan izin *Zone → Cache Purge* hanya untuk domain ini.)
- [ ] `node scripts/setup-cloudflare.mjs --production --deploy`
- [ ] Commit `database_id` produksi

### B3. Dashboard Cloudflare
- [ ] **DNS**: `AAAA *` → `100::` (Proxied) dan `AAAA @` → `100::` (Proxied)
- [ ] **R2 → umkm-media → Settings → Custom Domains** → `media.<domain>`. Jangan aktifkan r2.dev
- [ ] **Workers Routes** → tambah route `media.<domain>/*` dengan Worker **None**
- [ ] **Rules → Transform Rules → Response headers** (hostname `media.<domain>`): `X-Content-Type-Options: nosniff`
- [ ] **Security → WAF → Rate limiting rules**: path `/api/auth/login` di `cms.<domain>` → batasi per IP (mis. 5 per 10 detik) → Block
- [ ] **SSL/TLS**: Full (strict), Always Use HTTPS, Minimum TLS 1.2
- [ ] (Disarankan) **Zero Trust → Access**: lindungi `cms.<domain>/admin*` dan `/api/admin*` dengan email OTP

### B4. Akun admin produksi
```bash
node scripts/create-admin.mjs <username> "<password ≥ 16 karakter>" > ../admin.sql
```
```bash
cd apps/cms-worker && npx wrangler d1 execute umkm-db --remote --file ../../../admin.sql
```
Hapus `admin.sql` setelahnya.

### B5. Verifikasi
- [ ] `https://<domain>` → landing page dengan merek & nomor WA Anda
- [ ] `https://cms.<domain>` → login admin (widget Turnstile muncul bila perlu)
- [ ] Buat pelanggan uji → terbitkan → `https://<subdomain>.<domain>` tampil, huruf & foto OK
- [ ] `https://tidak-ada.<domain>` → halaman "Situs tidak ditemukan"
- [ ] `curl -I https://media.<domain>/<kunci-foto>` dilayani R2 (bukan Worker)
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
