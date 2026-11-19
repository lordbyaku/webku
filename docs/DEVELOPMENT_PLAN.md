# DEVELOPMENT PLAN — Rencana Implementasi Bertahap

Versi 1.0 · 18 November 2026

Estimasi durasi mengasumsikan **1 developer + bantuan Claude Code**, ±4–6 jam kerja per hari. Setiap fase diakhiri dengan kriteria selesai yang bisa diuji.

---

## Status Implementasi (18 November 2026)

| Fase | Status |
|---|---|
| 0 — Fondasi | ✅ Selesai (npm workspaces, TypeScript, Vitest, wrangler.jsonc kedua Worker) |
| 1 — Backend inti | ✅ Selesai: migrasi, auth PBKDF2 + sesi + lockout + Turnstile, CSRF, isolasi tenant, endpoint pemilik & admin, pembayaran & masa hosting. **Belum:** benchmark CPU PBKDF2 di Cloudflare asli (butuh deploy) |
| 2 — Template & publish | ✅ Selesai: mesin template, **ke-30 template sudah bisa dirender** (10 layout × 12 tema), publish ke R2, site Worker (Cache API, ETag/304, CSP, 404, suspend 503), landing page. **Belum:** uji Lighthouse di situs ter-deploy |
| 3 — CMS UI | ✅ Selesai: login (Turnstile), ganti password, beranda situs, 9 editor bagian, pustaka foto (kompres WebP di browser), simpan otomatis, pratinjau langsung (desktop) & layar penuh (HP), terbitkan, pemilih 30 desain. Diuji visual di HP & desktop. **Belum:** uji kegunaan dengan pemilik UMKM sungguhan |
| 4 — Panel admin | ✅ Sebagian besar: daftar & cari pelanggan, statistik, tambah pelanggan + pesan WA siap salin, detail, pembayaran, perpanjang hosting, reset password, buka kunci, suspend/aktifkan, catatan, terbitkan ulang semua, daftar masa hosting. **Belum:** ganti slug, hapus pelanggan, ekspor data, maintenance request, log aktivitas di UI |
| 5–7 | ⏳ Belum dimulai |

**Desain CMS:** huruf Plus Jakarta Sans (karya tipografer Indonesia, self-hosted), hijau daun `#0E6B5C` di atas abu kehijauan `#F2F4F1`, kuning kunyit `#E3A21A` khusus penanda "belum tayang". Bilah Terbitkan gelap di bawah sebagai elemen utama. Kode di `apps/cms-ui` (Vite + Preact), hasil build ke `apps/cms-worker/public`.

Tes: 20 unit test (XSS di 30 template, validasi konten, kripto, slug, hosting) + 11 skenario integrasi di runtime Workers.

### Penyesuaian teknis terhadap dokumen awal

| Rencana awal | Implementasi | Alasan |
|---|---|---|
| pnpm | **npm workspaces** | Sudah terpasang; tidak perlu alat tambahan |
| Drizzle ORM | **SQL D1 langsung** via fungsi repository (`apps/cms-worker/src/lib/repo.ts`) | Bundel lebih kecil; skema sederhana. Isolasi tenant tetap lewat fungsi yang mewajibkan `tenantId` |
| Tailwind + CSS ber-hash di `/_tpl/` | **CSS di-inline** di `<head>` (±9 KB) | Satu request per kunjungan, tanpa masalah *version skew*, tanpa build step |
| Font self-hosted | **Font sistem** (sans, serif, rounded) | Nol request font, sangat cepat di HP |
| `@cloudflare/vitest-pool-workers` | **`@cloudflare/vitest-plugin`** | Paket lama sudah deprecated |
| Sinkronisasi skrip JS ringan | **Tanpa JS sama sekali** di situs publik (`script-src 'none'`) | Lebih aman & cepat |
| Peta dari `mapsUrl` | Embed peta memakai **alamat** (`maps.google.com/maps?q=…&output=embed`); `mapsUrl` dipakai untuk tombol "Buka Google Maps" | Tautan share Google Maps tidak bisa di-embed |
| Backup mingguan ke R2 | Cron saat ini baru membersihkan sesi & audit log; **backup dipindah ke Fase 6** | Perlu dikerjakan bertahap agar muat batas CPU 10 ms |

## Ringkasan Fase

| Fase | Nama | Durasi | Hasil |
|---|---|---|---|
| 0 | Persiapan & fondasi repo | 2–3 hari | Monorepo, tooling, Worker "hello" ter-deploy |
| 1 | Backend inti: DB, auth, admin dasar | 5–7 hari | Login, buat tenant, sesi, uji isolasi |
| 2 | Mesin template + publish + site Worker | 5–7 hari | 3 template pilot tayang di subdomain |
| 3 | CMS pelanggan (UI) | 7–10 hari | Pelanggan bisa edit, upload, pratinjau, terbitkan |
| 4 | Panel admin lengkap | 4–5 hari | Pembayaran, suspend, reset, republish all |
| 5 | 27 template sisanya | 10–15 hari | 30 template lengkap + thumbnail |
| 6 | Hardening, backup, landing page, peluncuran | 5–7 hari | Pilot 5 pelanggan nyata |
| 7 | (Pasca-peluncuran) Domain kustom & maintenance | 4–5 hari | Add-on domain sendiri |
| **Total sampai peluncuran (0–6)** | | **± 6–8 minggu** | |

---

## Fase 0 — Persiapan (2–3 hari)

**Tugas**
- [ ] Putuskan domain & beli; arahkan nameserver ke Cloudflare. *(Bisa dikerjakan paralel; selama belum ada domain gunakan `workers.dev` + `wrangler dev`.)*
- [ ] Monorepo pnpm: `apps/site-worker`, `apps/cms-worker`, `apps/cms-ui`, `packages/{content-schema,templates,shared}`, `migrations/`, `scripts/`.
- [ ] TypeScript strict, ESLint (termasuk aturan `no-restricted-imports` untuk tabel DB), Prettier, Vitest + `@cloudflare/vitest-pool-workers`.
- [ ] `wrangler.jsonc` kedua Worker (DEPLOYMENT.md §5), `wrangler types`.
- [ ] GitHub repo privat + workflow CI (test saja dulu).
- [ ] Buat sumber daya: D1 (prod & staging), 4 bucket R2.

**Selesai jika:** `pnpm -r test` hijau di CI; kedua Worker ter-deploy ke `workers.dev` dan menjawab "ok".

---

## Fase 1 — Backend Inti (5–7 hari)

**Tugas**
- [ ] Migrasi `0001_init.sql` (DATABASE.md §3) + skema Drizzle.
- [ ] `packages/shared`: `nanoid`, util waktu, `hashPassword` / `verifyPassword` (PBKDF2), `generateTempPassword`, token sesi.
- [ ] **Benchmark PBKDF2 di Worker yang ter-deploy (paket Free)** pada 100k / 75k / 50k iterasi; catat CPU time dari Observability → tetapkan `PBKDF2_ITER`. *(Keputusan kritis — risiko R-01)*
- [ ] Middleware Hono: `session`, `requireAuth`, `requireOwner` (membuat `TenantContext`), `requireAdmin`, `csrf` (Origin + `X-CMS`), `errorHandler` (format API.md §1).
- [ ] Endpoint `/auth/login|logout|me|change-password` + verifikasi Turnstile + lockout.
- [ ] `tenantRepo` & `adminRepo`.
- [ ] `POST /admin/tenants`, `GET /admin/tenants`, `GET /admin/tenants/:id`.
- [ ] `packages/content-schema`: skema Valibot v1 + contoh konten awal per kategori (6 file seed).
- [ ] `GET /site`, `PUT /site/content` (optimistic locking).
- [ ] `scripts/create-admin.ts`, `scripts/seed.ts`.
- [ ] **Uji lintas tenant** sebagai helper yang dipakai ulang.

**Selesai jika:** admin bisa login, membuat tenant, owner login → wajib ganti password → bisa membaca & menyimpan draf; uji lintas tenant & lockout lulus; CPU login tercatat di bawah 10 ms atau keputusan iterasi terdokumentasi.

---

## Fase 2 — Mesin Template, Publish & Site Worker (5–7 hari)

**Tugas**
- [ ] Helper `html\`\`` dengan escape otomatis + tipe `SafeHtml` + uji XSS.
- [ ] Komponen section bersama: header, hero, about, products, gallery, testimonials, hours, contact, map, social, footer, WA floating button.
- [ ] Sistem tema (token CSS variables) + Tailwind build per template → `/_tpl/{id}/{hash}/style.css`; skrip menyalin aset ke `site-worker/public` & `cms-worker/public`, menyimpan 2 versi hash lama.
- [ ] **3 template pilot** dengan layout berbeda: `kuliner-01` (L01), `toko-01` (L03), `jasa-01` (L09).
- [ ] `render(templateId, content)` → `index.html`, `sitemap.xml`, `robots.txt`, JSON-LD, OG tags.
- [ ] `POST /site/preview`, `POST /site/publish` (+ batas 30/hari, purge cache via API).
- [ ] site Worker: mapping host → kunci R2, Cache API (s-maxage 300), ETag/304, header keamanan, 404 "situs tidak ditemukan", 301 path lain ke `/`, 405.
- [ ] Halaman "situs tidak aktif" & landing placeholder untuk root domain.
- [ ] Uji Lighthouse (HP) ≥ 90 untuk ketiga template.

**Selesai jika:** tenant contoh tayang di `https://contoh.domainku.id` (atau workers.dev), perubahan terbit ≤ 5 menit, Lighthouse ≥ 90, CSS/foto tidak memanggil Worker (cek Observability: hanya request `/`).

---

## Fase 3 — CMS Pelanggan (7–10 hari)

**Tugas**
- [ ] Vite + Preact + router ringan; build ke `cms-worker/public`; desain mobile-first, Bahasa Indonesia, tombol besar.
- [ ] Halaman: Login (Turnstile) · Ganti password · Beranda (status situs, tombol "Lihat situs", "Bagikan ke WA") · Edit per section · Media · Template · Pratinjau.
- [ ] Form per section yang dibangkitkan dari skema konten (validasi sama dengan server).
- [ ] Editor daftar (produk, galeri, testimoni): tambah, hapus, urutkan (tombol naik/turun — lebih mudah di HP daripada drag).
- [ ] Input khusus: harga (format rupiah), nomor WA (auto `08` → `628`), jam buka per hari, username sosial media.
- [ ] Upload foto: kompres & konversi WebP di browser (canvas, maks 1600 px, ≤ 400 KB), progres, pemotong rasio sederhana untuk hero (16:9) & produk (1:1).
- [ ] Autosave draf (debounce 3 detik) + indikator "Tersimpan / Ada perubahan belum terbit" + peringatan `beforeunload`.
- [ ] Pratinjau `<iframe srcdoc sandbox>` dengan toggle HP/desktop.
- [ ] Pilih template (galeri thumbnail + pratinjau dengan konten sendiri) jika diizinkan.
- [ ] Endpoint media (`GET/POST/PATCH/DELETE /media`) + kuota.

**Selesai jika:** uji kegunaan dengan 2–3 orang awam: mengubah harga & mengganti foto produk dari HP **tanpa bantuan dalam < 5 menit**.

---

## Fase 4 — Panel Admin (4–5 hari)

**Tugas**
- [ ] Daftar tenant (filter status, belum bayar, cari), detail tenant.
- [ ] Form buat tenant (cek slug realtime, slug terlarang) → tampilkan kredensial + tombol "Salin pesan untuk pelanggan" (teks WA siap kirim berisi alamat situs, CMS, username, password sementara).
- [ ] Edit konten atas nama tenant (memakai ulang komponen CMS).
- [ ] Pembayaran (catat, hapus koreksi), status bayar otomatis.
- [ ] Masa hosting: `hosting_until` otomatis +1 tahun saat publish pertama, tombol "Perpanjang 1 tahun" (Rp 100.000), daftar "Segera habis / Sudah habis", tombol "Salin pesan pengingat WA".
- [ ] Banner masa hosting di CMS pelanggan (H-30, H-7, habis).
- [ ] Status: aktifkan / suspend / soft delete; ganti slug.
- [ ] Reset password, buka kunci, nonaktifkan user.
- [ ] Maintenance requests (sederhana).
- [ ] "Terbitkan ulang semua" dengan progress bar (satu request per tenant).
- [ ] Audit log, `/admin/stats`.
- [ ] Ekspor data tenant (JSON).

**Selesai jika:** seluruh alur onboarding PRD §11.1 bisa dilakukan dari panel admin dalam < 1 jam per pelanggan.

---

## Fase 5 — 27 Template Sisanya (10–15 hari)

**Tugas**
- [ ] 7 layout sisanya (L02, L04–L08, L10).
- [ ] 12 tema lengkap (warna, pasangan font, radius, gaya tombol) — uji kontras WCAG AA otomatis.
- [ ] Daftarkan 30 template di `registry.ts` (PRD §7.3).
- [ ] Konten contoh per kategori yang realistis + foto contoh bebas lisensi (mis. Unsplash/Pexels — periksa lisensi) untuk thumbnail & demo.
- [ ] Skrip pembuat thumbnail otomatis (render tiap template → screenshot, mis. Playwright lokal) → `/_tpl/thumbs/*.webp`.
- [ ] Uji snapshot HTML per template + Lighthouse ≥ 90 untuk semua 30.
- [ ] Uji "ganti template": konten sama tampil benar di 30 template (section kosong tersembunyi, daftar panjang tidak merusak layout).

**Selesai jika:** 30 template lulus uji snapshot, Lighthouse, dan kontras; galeri template tampil di CMS.

> **Tips efisiensi:** kerjakan per layout (1 layout = beberapa template sekaligus karena hanya tema yang berbeda), bukan per template.

---

## Fase 6 — Hardening & Peluncuran (5–7 hari)

**Tugas**
- [ ] Cron `scheduled()`: backup bertahap ke R2 (memakai `job_state`, batch kecil agar < 10 ms CPU), hapus sesi kadaluarsa, pangkas audit, hapus permanen tenant `deleted` > 30 hari, hapus media yatim.
- [ ] Uji restore dari backup ke staging.
- [ ] WAF rate limit, Turnstile produksi, Transform Rule header media, SSL Full (strict) + HSTS.
- [ ] (Disarankan) Cloudflare Access untuk `/admin*`.
- [ ] Checklist keamanan SECURITY.md §11.
- [ ] Landing page pemasaran di root domain (statis, Static Assets): hero **"Buat website usahamu mulai dari Rp 100rb"** + tombol Tanya via WhatsApp, galeri 30 template + demo, cara order, syarat layanan, kebijakan privasi. Tanpa tabel harga paket.
- [ ] Dokumen syarat layanan: biaya pembuatan sekali bayar (termasuk hosting tahun pertama), **hosting Rp 100.000/tahun mulai tahun kedua** (selama di paket Free; ditinjau jika perlu upgrade), masa tenggang 14 hari, fair-use, tanpa SLA, larangan konten, maintenance berbayar.
- [ ] Panduan singkat pelanggan (PDF/halaman 1 lembar + video layar HP 2 menit).
- [ ] **Pilot 5 pelanggan nyata** → kumpulkan masukan → perbaikan.

**Selesai jika:** 5 situs pilot aktif selama 2 minggu tanpa insiden, backup otomatis berjalan, pemakaian kuota < 30%.

---

## Fase 7 — Pasca-peluncuran (opsional)

- [ ] Domain kustom pelanggan via Cloudflare for SaaS (DEPLOYMENT.md §12) sebagai add-on berbayar.
- [ ] Riwayat versi terbit (simpan 5 versi `published_json` terakhir → tombol "Kembalikan").
- [ ] Statistik kunjungan per situs (Cloudflare Web Analytics / GraphQL Analytics API).
- [ ] Halaman tambahan (multi-page) jika banyak diminta.

---

## Definisi Selesai (setiap tugas)

- Lulus typecheck, lint, unit test; endpoint owner baru punya uji lintas tenant.
- Tidak ada interpolasi HTML tanpa `html\`\``.
- Ukuran bundel `umkm-site` < 50 KB, `umkm-cms` < 1 MB (di luar aset statis).
- Dokumen di `docs/` diperbarui jika kontrak/skema berubah.

## Risiko Jadwal

| Risiko | Mitigasi |
|---|---|
| Template memakan waktu paling lama | Bangun per layout, tema sebagai token; mulai dari 3 pilot |
| PBKDF2 tidak muat 10 ms | Diputuskan di Fase 1 (turunkan iterasi atau Workers Paid $5) |
| Domain belum dipilih | Tidak memblokir Fase 0–5 (pakai `workers.dev` / lokal); wajib sebelum Fase 6 |
| Masukan pilot mengubah skema | `schemaVersion` + fungsi migrasi konten |
