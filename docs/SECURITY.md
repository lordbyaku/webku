# SECURITY — Model Keamanan

Versi 1.0 · 18 November 2026

---

## 1. Aset yang Dilindungi

| Aset | Risiko utama |
|---|---|
| Akun pelanggan & admin | Pengambilalihan akun → situs diubah / dirusak |
| Konten & foto pelanggan | Diubah atau dilihat tenant lain |
| Situs publik | Disisipi skrip (XSS), phishing, deface |
| Data pembayaran (catatan) | Dilihat pihak tidak berhak |
| Kuota Cloudflare Free | Dihabiskan bot → semua situs mati |
| Reputasi domain utama | Situs pelanggan dipakai untuk phishing/spam → domain masuk blacklist |

## 2. Model Ancaman (ringkas)

| Ancaman | Contoh | Kontrol |
|---|---|---|
| Brute force / credential stuffing | Bot mencoba ribuan password | Turnstile, WAF rate limit, lockout akun, PBKDF2 |
| Akses lintas tenant (IDOR) | Owner A memanggil `DELETE /media/<id milik B>` | Tenant dari sesi + repository wajib `tenantId` + 404 |
| Stored XSS | Nama produk berisi `<script>` | Escape otomatis di renderer, CSP, tanpa HTML dari pengguna |
| URL berbahaya | `javascript:` di tautan sosial/maps | Validasi skema + allowlist domain |
| CSRF | Situs lain mengirim POST ke CMS | SameSite=Lax + cek `Origin` + header `X-CMS` |
| Upload berbahaya | File SVG/HTML berkedok gambar | Hanya WebP/JPEG/PNG, cek *magic bytes*, dilayani dari domain terpisah |
| Session hijacking | Cookie dicuri | `__Host-` cookie HttpOnly Secure, token di-hash di DB, sesi bisa dicabut |
| Penyalahgunaan oleh pelanggan | Konten phishing / judi di subdomain | Syarat layanan, suspend cepat, audit log |
| Bocornya rahasia | API token di repo | `wrangler secret`, `.dev.vars` di `.gitignore` |
| Kehilangan data | Salah hapus | Soft delete 30 hari, Time Travel 7 hari, backup mingguan |

## 3. Isolasi Tenant

1. **Sumber kebenaran tenant = sesi.** Middleware `requireOwner` memuat `user.tenant_id` dari sesi dan membuat `TenantContext`. Endpoint pelanggan tidak menerima `tenantId` dari URL/body.
2. **Repository wajib.** Semua query pelanggan lewat `tenantRepo(db, ctx)`. Impor tabel Drizzle langsung dari route dilarang lewat aturan ESLint `no-restricted-imports`.
3. **Kepemilikan referensi.** Saat menyimpan konten, semua `mediaId` dicek milik tenant yang sama (`SELECT id FROM media WHERE tenant_id=? AND id IN (...)`).
4. **Kunci R2 diturunkan dari server.** `t/{tenantId}/{uuid}.webp` dibuat server; nama file asli dari pengguna tidak pernah dipakai.
5. **404 untuk milik tenant lain** (tidak membocorkan keberadaan).
6. **Admin eksplisit.** Endpoint `/admin/*` memakai `requireAdmin`; setiap aksi dicatat di `audit_log`.
7. **Uji otomatis lintas tenant (wajib di CI):** untuk setiap endpoint owner, buat tenant A & B, login sebagai A, coba akses sumber daya B → harus 404. Uji ini harus ada untuk endpoint baru (checklist PR).

## 4. Autentikasi & Sesi

### 4.1 Password
| Aspek | Aturan |
|---|---|
| Algoritma | PBKDF2-HMAC-SHA256 via `crypto.subtle.deriveBits`, output 32 byte |
| Salt | 16 byte acak per user |
| Iterasi | Target **100.000** (maksimum yang didukung Workers). Disimpan per user (`pw_iter`) agar bisa dinaikkan nanti (*rehash* saat login berhasil) |
| Batas CPU | Paket Free 10 ms CPU/request. **Wajib diukur di Fase 1.** Jika terlewati, turunkan ke nilai tertinggi yang lolos (mis. 50.000) — kompensasi dengan Turnstile + rate limit + lockout. Alternatif: upgrade Workers Paid |
| Perbandingan | Constant-time (`crypto.subtle.timingSafeEqual` atau loop XOR) |
| Kebijakan | Minimal 8 karakter, tolak 1.000 password umum & yang sama dengan username. Tidak ada aturan "wajib simbol" (menyulitkan UMKM tanpa menambah keamanan berarti) |
| Password sementara | Dibuat server, format mudah dibaca: `Kata-Kata-4digit` (mis. `Kopi-Mangga-4821`), wajib diganti saat login pertama |
| Username tidak ditemukan | Tetap jalankan PBKDF2 dummy agar waktu respons sama (cegah enumerasi user) |

### 4.2 Sesi
- Token: 32 byte acak (`crypto.getRandomValues`), dikirim di cookie `__Host-sid`.
- DB menyimpan **SHA-256(token)**, bukan token aslinya → kebocoran DB tidak memberi akses.
- Masa berlaku: 30 hari *sliding* untuk owner (diperpanjang jika sisa < 7 hari), **12 jam** untuk admin.
- Logout, ganti password, dan reset password oleh admin → hapus sesi terkait.
- Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/` (prefix `__Host-` mewajibkan Secure & tanpa Domain).

### 4.3 Lockout & rate limit
- 5 login gagal berturut-turut → akun terkunci 15 menit (`423`). Admin bisa membuka kunci.
- **WAF Rate Limiting rule (1 rule gratis):** `http.host eq "cms.domainku.id" and http.request.uri.path eq "/api/auth/login"` → 5 request / 10 detik per IP → Block 10 detik. (Paket Free membatasi periode & durasi; nilai final disesuaikan dengan opsi yang tersedia di dashboard.)
- **Turnstile** (mode *Managed*) wajib di form login; token diverifikasi server ke `https://challenges.cloudflare.com/turnstile/v0/siteverify` dengan `remoteip`.

### 4.4 Akun admin
- Username admin tidak umum (bukan `admin`), password ≥ 16 karakter dari password manager.
- Rekomendasi tambahan gratis: lindungi path `/admin*` dan `/api/admin*` dengan **Cloudflare Access (Zero Trust Free, hingga 50 pengguna)** memakai login email OTP → lapisan kedua seperti 2FA tanpa kode tambahan.

## 5. Keamanan Konten & Situs Publik

### 5.1 Escaping (anti-XSS)
- Renderer memakai tagged template `html\`\`` yang **meng-escape semua interpolasi** (`& < > " ' \``). Hanya fragmen dari helper `html` sendiri yang boleh disisipkan mentah (`SafeHtml` bertipe khusus).
- Atribut: nilai selalu dalam tanda kutip ganda dan di-escape.
- Teks multi-baris: escape dulu, baru `\n` → `<br>`.
- JSON-LD: `JSON.stringify` lalu ganti `<` → `<` agar tidak bisa menutup `</script>`.
- **Tidak ada input HTML/Markdown** dari pengguna di v1.

### 5.2 Validasi URL & data
| Field | Aturan |
|---|---|
| `contact.whatsapp` | Hanya digit, 10–15 digit, diawali `62` (UI otomatis mengubah `08…` → `628…`) |
| `contact.mapsUrl` | `https:` + host `maps.app.goo.gl`, `goo.gl`, `www.google.com`, `maps.google.com` |
| `social.instagram/tiktok/facebook/youtube` | Hanya username (regex `[A-Za-z0-9._-]{1,60}`); URL dibentuk server |
| `social.shopee/tokopedia` | `https:` + host `shopee.co.id`, `tokopedia.com`, `tokopedia.link`, `shope.ee` |
| `contact.email` | Validasi format, dirender sebagai `mailto:` |
| Semua string | Trim, buang karakter kontrol & *zero-width*, batas panjang (DATABASE.md §4) |

### 5.3 Header HTTP situs publik
```
Content-Security-Policy: default-src 'none'; img-src 'self' https://media.domainku.id data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self' 'sha256-<hash skrip inline>'; frame-src https://www.google.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```
`style-src 'unsafe-inline'` hanya untuk CSS kritis ter-inline; tidak ada data pengguna di dalam tag `<style>` (warna tema berasal dari kode, bukan input).

### 5.4 Header HTTP CMS
CSP ketat (`script-src 'self'`), `frame-ancestors 'none'`, `X-Robots-Tag: noindex`, `Cache-Control: no-store` untuk API. Pratinjau memakai `<iframe srcdoc sandbox="allow-same-origin">` **tanpa** `allow-scripts`.

### 5.5 Upload
- Hanya `image/webp`, `image/jpeg`, `image/png`; tipe dicek dari *magic bytes*, bukan dari nama/Content-Type.
- Maks 500 KB per file (setelah kompresi browser), kuota total & jumlah file per tenant.
- **SVG, GIF, HTML ditolak.**
- Dilayani dari `media.domainku.id` (origin terpisah dari CMS) dengan `Content-Type` yang ditetapkan server dan `X-Content-Type-Options: nosniff` (Transform Rule pada hostname media).
- Metadata EXIF (termasuk lokasi GPS) hilang otomatis karena foto di-encode ulang lewat canvas di browser.

## 6. CSRF & CORS
- Cookie `SameSite=Lax` + method tulis mewajibkan `Origin: https://cms.domainku.id` **dan** header kustom `X-CMS: 1`.
- Tidak ada CORS (API hanya dipakai dari origin yang sama) → tidak mengirim header `Access-Control-Allow-Origin`.

## 7. Rahasia & Konfigurasi

| Rahasia | Tempat |
|---|---|
| `TURNSTILE_SECRET` | `wrangler secret put` (cms) |
| `CF_PURGE_TOKEN` (API token hanya izin *Zone → Cache Purge* pada zona domainku.id) | `wrangler secret put` (cms) |
| `SESSION_PEPPER` (opsional, HMAC tambahan untuk hash sesi) | `wrangler secret put` (cms) |
| Pengembangan lokal | `.dev.vars` — masuk `.gitignore` |

API token dibuat dengan **izin minimum** dan dibatasi ke zona `domainku.id` saja.

## 8. Logging & Audit
- `audit_log`: login sukses/gagal, simpan konten, publish, upload/hapus media, semua aksi admin.
- Tidak mencatat password, token, atau isi konten lengkap (hanya ringkasan perubahan).
- Workers Logs (gratis, retensi terbatas) untuk error; `console.error` tanpa data sensitif.

## 9. Privasi (UU PDP)
- Data pribadi yang disimpan: username, nama usaha, kontak usaha (yang memang akan dipublikasikan), IP & user-agent sesi (dihapus bersama sesi).
- Tidak ada pelacakan pengunjung situs. Jika butuh statistik, pakai **Cloudflare Web Analytics** (gratis, tanpa cookie).
- Pelanggan dapat meminta ekspor & penghapusan data (endpoint admin `export` dan `DELETE`).
- Kebijakan privasi & syarat layanan ditampilkan di landing page dan saat login pertama.

## 10. Penyalahgunaan Platform
- Syarat layanan melarang: phishing, judi, pornografi, penipuan, pelanggaran merek.
- Admin dapat **suspend** dalam satu klik (halaman "tidak aktif" langsung ditulis ke R2 + purge).
- Pelanggan tidak bisa membuat situs sendiri (akun dibuat admin) → risiko spam rendah.

## 11. Checklist Keamanan per Rilis
- [ ] Uji lintas tenant lulus untuk semua endpoint owner
- [ ] Uji XSS: payload `"><script>alert(1)</script>`, `javascript:alert(1)`, `</script>` di semua field → ter-escape/ditolak
- [ ] Uji upload: file `.html` berganti nama `.jpg`, SVG, file 5 MB → ditolak
- [ ] CPU login < 10 ms (lihat Workers Observability) atau keputusan upgrade terdokumentasi
- [ ] Header keamanan situs & CMS terpasang (cek `securityheaders.com`)
- [ ] Tidak ada rahasia di repo (`git grep`, secret scanning GitHub)
- [ ] Backup terakhir < 8 hari & uji restore berhasil (per kuartal)
