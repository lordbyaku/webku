# API — Kontrak API CMS

Versi 1.0 · 18 November 2026 · Base URL: `https://cms.domainku.id/api`

Situs publik (`*.domainku.id`) **tidak punya API** — hanya melayani HTML statis (lihat TAD §3.1).

---

## 1. Konvensi Umum

| Aspek | Aturan |
|---|---|
| Format | JSON (`Content-Type: application/json`), kecuali upload (`multipart/form-data`) |
| Autentikasi | Cookie sesi `__Host-sid` (HttpOnly, Secure, SameSite=Lax, Path=/) |
| CSRF | Semua method selain GET wajib: header `Origin` = `https://cms.domainku.id` **dan** header `X-CMS: 1` |
| Cache | Semua respons `Cache-Control: no-store` |
| Waktu | Epoch milidetik UTC |
| Uang | Integer rupiah (`amount_idr`) |
| ID | String acak 21 karakter |
| Bahasa pesan | Bahasa Indonesia (`message` siap ditampilkan ke pengguna) |

### Format respons

Sukses:
```json
{ "ok": true, "data": { } }
```

Gagal:
```json
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "Nama produk wajib diisi", "fields": { "products.items.3.name": "Wajib diisi" } } }
```

### Kode error

| HTTP | `code` | Arti |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input tidak valid (`fields` berisi detail) |
| 401 | `UNAUTHENTICATED` | Belum login / sesi kadaluarsa |
| 403 | `FORBIDDEN` | Peran tidak berhak / wajib ganti password dulu (`PASSWORD_CHANGE_REQUIRED`) |
| 403 | `CSRF_FAILED` | Origin / header tidak sesuai |
| 403 | `TURNSTILE_FAILED` | Verifikasi anti-bot gagal |
| 404 | `NOT_FOUND` | Tidak ada / bukan milik tenant |
| 409 | `VERSION_CONFLICT` | Draf diubah di tempat lain |
| 409 | `SLUG_TAKEN` | Subdomain sudah dipakai |
| 413 | `QUOTA_EXCEEDED` | Kuota media / jumlah item penuh |
| 423 | `ACCOUNT_LOCKED` | Terlalu banyak percobaan login (`retryAfter` detik) |
| 429 | `RATE_LIMITED` | Terlalu banyak permintaan (mis. publish harian) |
| 500 | `INTERNAL` | Kesalahan server (tanpa detail internal) |

> Untuk data milik tenant lain, server selalu menjawab **404**, bukan 403, agar keberadaan data tidak bocor.

---

## 2. Autentikasi

### `POST /auth/login`
Publik. Dilindungi Turnstile + WAF rate limit.

Request:
```json
{ "username": "warungbusri", "password": "••••••••", "turnstileToken": "0.xxx" }
```
Response 200:
```json
{ "ok": true, "data": { "user": { "id": "u_..", "username": "warungbusri", "role": "owner", "mustChangePassword": true }, "tenant": { "id": "t_..", "slug": "warungbusri", "businessName": "Warung Bu Sri" } } }
```
Set-Cookie: `__Host-sid=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`

Error: 400, 401 (pesan generik "Username atau password salah"), 403 `TURNSTILE_FAILED`, 423.

### `POST /auth/logout`
Menghapus sesi. Response 200 `{ "ok": true, "data": null }`.

### `GET /auth/me`
Response 200: sama dengan `data` login. 401 jika tidak login.

### `POST /auth/change-password`
```json
{ "currentPassword": "••••", "newPassword": "••••••••" }
```
- Password baru: minimal 8 karakter, tidak sama dengan username, tidak ada di daftar 1.000 password umum.
- Sukses: semua sesi lain user ini dihapus, `must_change_pw = 0`.

> Selama `mustChangePassword = true`, semua endpoint selain `/auth/*` menjawab 403 `PASSWORD_CHANGE_REQUIRED`.

---

## 3. Endpoint Pemilik UMKM (`role = owner`)

Tenant diambil **dari sesi**, tidak pernah dari URL atau body.

### `GET /site`
```json
{ "ok": true, "data": {
  "tenant": { "slug": "warungbusri", "businessName": "Warung Bu Sri", "status": "active",
              "templateId": "kuliner-01", "allowTemplateSwitch": true, "publishedAt": 1763452800000,
              "hosting": { "until": 1794988800000, "state": "ok" } },   // state: ok | expiring_30 | expiring_7 | expired
  "urls": { "site": "https://warungbusri.domainku.id", "hostnames": ["warungbusri.domainku.id"] },
  "content": { "draft": { /* skema konten */ }, "version": 12, "hasUnpublishedChanges": true },
  "limits": { "products": 30, "gallery": 20, "testimonials": 10, "mediaBytes": 15728640, "mediaUsedBytes": 4200000, "publishPerDay": 30, "publishUsedToday": 3 }
} }
```

### `PUT /site/content`
Menyimpan **draf** (belum tayang).
```json
{ "version": 12, "content": { /* skema konten lengkap */ } }
```
Response 200 `{ "version": 13, "savedAt": 1763452900000 }` · 400 · 409 `VERSION_CONFLICT`.

### `POST /site/preview`
Body opsional `{ "content": {…}, "templateId": "fashion-02" }` (untuk pratinjau sebelum simpan atau mencoba template lain).
Response 200 `Content-Type: text/html` — HTML lengkap untuk `<iframe srcdoc>`, berisi `<meta name="robots" content="noindex">`.

### `POST /site/publish`
Merender draf dan menayangkannya.
```json
{ "version": 13 }
```
Response 200 `{ "publishedAt": 1763453000000, "urls": ["https://warungbusri.domainku.id/"] }`
Error: 409 (versi berbeda), 403 (status `suspended`/`draft` — hanya admin yang bisa publish pertama kali), 429 (melewati 30 publish/hari).

### `GET /templates`
Daftar 30 template (dari registri kode).
```json
{ "ok": true, "data": [ { "id": "kuliner-01", "name": "Warung Nusantara", "category": "kuliner", "layout": "L01", "theme": "T01", "thumbnail": "/_tpl/thumbs/kuliner-01.webp" } ] }
```

### `PUT /site/template`
```json
{ "templateId": "kuliner-02" }
```
403 jika `allowTemplateSwitch = false`. Hanya mengubah template untuk draf berikutnya; tayang setelah publish.

### Media

| Method & Path | Keterangan |
|---|---|
| `GET /media?cursor=` | Daftar media tenant (50 per halaman) `{ items:[{id,url,bytes,width,height,alt,createdAt}], nextCursor }` |
| `POST /media` | `multipart/form-data`: `file` (WebP/JPEG/PNG ≤ 500 KB), `alt` (opsional), `width`, `height`. Response 201 `{ id, url }`. 413 jika kuota/jumlah penuh |
| `PATCH /media/:id` | `{ "alt": "Foto nasi rawon" }` |
| `DELETE /media/:id` | 409 `MEDIA_IN_USE` jika dipakai di draf atau versi terbit; kirim `?force=1` untuk tetap menghapus dari draf |

---

## 4. Endpoint Admin (`role = admin`)

Prefix: `/admin`. Setiap aksi tulis dicatat di `audit_log`.

### Tenant

| Method & Path | Keterangan |
|---|---|
| `GET /admin/tenants?status=&q=&cursor=` | Daftar tenant + status bayar, terakhir publish, pemakaian media |
| `POST /admin/tenants` | Buat tenant + akun owner + hostname subdomain + draf awal dari contoh konten kategori |
| `GET /admin/tenants/:id` | Detail lengkap (tenant, user, hostnames, pembayaran, maintenance) |
| `PATCH /admin/tenants/:id` | Ubah `businessName`, `category`, `templateId`, `allowTemplateSwitch`, `showBranding`, `notes`, `mediaQuotaBytes` |
| `POST /admin/tenants/:id/slug` | `{ "slug": "baru" }` — ganti subdomain: buat hostname baru, publish ulang, hapus objek host lama |
| `POST /admin/tenants/:id/status` | `{ "status": "active" \| "suspended" }` — suspend menulis halaman "tidak aktif" ke semua hostname |
| `DELETE /admin/tenants/:id` | Soft delete (`status=deleted`), hapus permanen otomatis setelah 30 hari |
| `GET /admin/tenants/:id/export` | Unduh JSON konten + daftar URL media (untuk pelanggan yang berhenti) |

`POST /admin/tenants` request:
```json
{
  "businessName": "Warung Bu Sri",
  "slug": "warungbusri",
  "category": "kuliner",
  "templateId": "kuliner-01",
  "owner": { "username": "warungbusri" }
}
```
Response 201:
```json
{ "ok": true, "data": { "tenantId": "t_..", "siteUrl": "https://warungbusri.domainku.id", "cmsUrl": "https://cms.domainku.id", "username": "warungbusri", "temporaryPassword": "Kopi-Mangga-4821" } }
```
> Password sementara hanya ditampilkan **sekali** dan tidak disimpan dalam bentuk asli.

### Konten tenant (bertindak atas nama pelanggan)

| Method & Path | Keterangan |
|---|---|
| `GET /admin/tenants/:id/content` | Sama dengan `GET /site` untuk tenant tersebut |
| `PUT /admin/tenants/:id/content` | Sama dengan `PUT /site/content` |
| `POST /admin/tenants/:id/preview` | Sama dengan `POST /site/preview` |
| `POST /admin/tenants/:id/publish` | Publish (termasuk publish pertama; mengubah status `draft` → `active`) |
| `POST /admin/tenants/:id/media` | Upload media untuk tenant |
| `POST /admin/republish` | `{ "tenantId": "t_.." }` — dipanggil berulang oleh UI untuk "Terbitkan ulang semua" (satu tenant per request) |

### Pengguna

| Method & Path | Keterangan |
|---|---|
| `POST /admin/users/:id/reset-password` | Response `{ "temporaryPassword": "…" }`; set `must_change_pw=1`, hapus semua sesi user |
| `POST /admin/users/:id/unlock` | Reset `failed_attempts` & `locked_until` |
| `POST /admin/users/:id/disable` | `{ "disabled": true }` |

### Pembayaran & maintenance

| Method & Path | Keterangan |
|---|---|
| `GET /admin/tenants/:id/payments` | Riwayat |
| `POST /admin/tenants/:id/payments` | `{ "kind": "setup", "amountIdr": 100000, "paidAt": 1763452800000, "method": "transfer BCA", "note": "" }` — `kind=setup` otomatis mengubah `payment_status = paid` |
| `POST /admin/tenants/:id/renew` | Perpanjangan hosting: `{ "amountIdr": 100000, "paidAt": …, "method": "…", "from": "previous_end" \| "today" }` → mencatat pembayaran `hosting` + `hosting_until` +1 tahun (atomik). Response `{ "hostingUntil": … }` |
| `PATCH /admin/tenants/:id/hosting` | `{ "hostingUntil": 1794988800000 }` — koreksi manual (tercatat di audit) |
| `GET /admin/hosting/expiring?days=30` | Daftar tenant yang masa hostingnya habis dalam N hari atau sudah lewat, beserta `waReminderText` siap salin |
| `DELETE /admin/payments/:id` | Koreksi salah input (tercatat di audit) |
| `GET /admin/maintenance?status=` | Daftar permintaan |
| `POST /admin/tenants/:id/maintenance` | `{ "title", "description", "feeIdr" }` |
| `PATCH /admin/maintenance/:id` | `{ "status", "feeIdr" }` |

### Pemantauan

| Method & Path | Keterangan |
|---|---|
| `GET /admin/stats` | `{ tenants: {active, draft, suspended}, unpaid, hostingExpiring30, hostingExpired, mediaTotalBytes, publishesToday, lastBackupAt }` |
| `GET /admin/audit?tenantId=&cursor=` | Log aktivitas |

> Statistik kuota Cloudflare (request harian Worker, dll.) dilihat di dashboard Cloudflare. Pemanggilan GraphQL Analytics API dari CMS adalah opsi Fase 6.

---

## 5. Endpoint Internal

| Trigger | Handler | Keterangan |
|---|---|---|
| Cron `0 * * * 0` (setiap jam, hari Minggu UTC) | `scheduled()` di `cms` Worker | Backup bertahap, hapus sesi kadaluarsa, pangkas audit, hapus permanen tenant `deleted`, hapus media yatim |

## 6. Batas Laju (aplikasi)

| Lingkup | Batas | Mekanisme |
|---|---|---|
| `POST /auth/login` per IP | 5 / 10 detik (WAF) | WAF Rate Limiting rule (Free) |
| Login gagal per akun | 5 kali → kunci 15 menit | Kolom `failed_attempts`, `locked_until` |
| Publish per tenant | 30 / hari | Kolom `publish_count_day` |
| Upload per tenant | Kuota bytes + 60 file | Cek atomik di D1 |

## 7. Versi API

v1 tanpa prefix versi. Perubahan yang tidak kompatibel akan memakai `/api/v2`. Karena UI dan API dideploy bersama dalam satu Worker, risiko ketidakcocokan rendah.

## 8. Tambahan 19 November 2026

| Method & Path | Keterangan |
|---|---|
| `POST /admin/tenants/:id/slug` | `{ "slug": "baru" }` — pindahkan subdomain: hostname diganti, versi terbit dirender ke alamat baru, file alamat lama dihapus |
| `DELETE /admin/tenants/:id` | Hapus (soft): status `deleted`, akun dinonaktifkan, sesi dicabut, file situs dihapus (situs 404). Hapus permanen otomatis setelah 30 hari |
| `POST /admin/tenants/:id/restore` | Pulihkan pelanggan terhapus → status `suspended` (pernah tayang) atau `draft` |
| `GET /admin/tenants/:id/export` | JSON lengkap: tenant, hostname, konten draf & terbit, daftar URL foto, pembayaran |
| `GET /admin/tenants?status=deleted` | Daftar pelanggan terhapus |
| `POST /admin/tenants/:id/renew` | Kini menerima `"from": "today"` untuk mulai dari hari ini |

Perubahan perilaku:
- `PUT /site/template` & `PUT /admin/tenants/:id/template` menyimpan **desain draf**; tayang setelah publish. `GET /site` → `tenant.templateId` = desain draf (bila ada), `tenant.publishedTemplateId` = desain tayang; `hasUnpublishedChanges` ikut memperhitungkan desain.
- `POST /admin/tenants/:id/payments` & `/renew` menolak pembayaran kembar (jenis & nominal sama) dalam 2 menit → `409 DUPLICATE_PAYMENT`.
- `GET /admin/stats` menambah `lastBackupAt`.
