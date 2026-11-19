# PRD — Platform Website UMKM (CMS + Template)

| Item | Nilai |
|---|---|
| Versi | 1.0 (draf) |
| Tanggal | 18 November 2026 |
| Pemilik produk | Anda (penyedia jasa) |
| Status | Menunggu persetujuan |
| Domain utama | **Belum dipilih** — di seluruh dokumen ditulis `domainku.id` sebagai placeholder |

---

## 1. Latar Belakang

Banyak UMKM membutuhkan website sederhana yang tampil profesional, cepat, dan murah, tetapi tidak punya kemampuan teknis. Website builder umum (Wix, WordPress) terlalu rumit dan berbiaya bulanan.

Produk ini adalah **jasa pembuatan website UMKM** dengan model:
1. Pelanggan memilih satu dari **30 template**.
2. **Anda** (penyedia) membuat website pertama kali dan mengisi konten awal.
3. Pelanggan menerima akun **CMS sederhana** untuk mengubah isi (teks, foto, harga, kontak) kapan saja.
4. Pelanggan membayar **sekali**. Maintenance tambahan dikenakan biaya terpisah.
5. Website tayang di **subdomain** milik Anda: `namatoko.domainku.id`.

Seluruh infrastruktur berjalan di **Cloudflare paket Free**.

## 2. Tujuan

| Kode | Tujuan | Ukuran keberhasilan |
|---|---|---|
| G1 | Biaya infrastruktur Rp 0/bulan untuk 100 website | Tagihan Cloudflare = $0 |
| G2 | Website pelanggan sangat cepat di HP | LCP < 2 detik di 4G, Lighthouse Performance ≥ 90 |
| G3 | Pelanggan awam bisa mengedit sendiri | Pelanggan bisa mengubah harga/foto tanpa bantuan dalam < 5 menit |
| G4 | Anda bisa membuat website baru dengan cepat | Website baru siap tayang < 1 jam (setelah materi lengkap) |
| G5 | Data antar pelanggan terisolasi | 0 insiden kebocoran data lintas pelanggan |

## 3. Bukan Tujuan (Non-Goals) versi 1

- Drag-and-drop page builder / pelanggan mengubah layout.
- Toko online dengan keranjang & pembayaran (checkout diarahkan ke WhatsApp / marketplace).
- Payment gateway otomatis (pembayaran ditandai manual oleh admin).
- Pendaftaran mandiri pelanggan (akun dibuat oleh admin).
- Email transaksional (reset password dilakukan admin).
- Multi-bahasa, blog, multi-halaman (v1 = satu halaman / *one-page*).
- Domain milik pelanggan (direncanakan **Fase 7**, sebagai add-on berbayar).

## 4. Persona

### P1 — Pemilik UMKM (peran `owner`)
- Usia 25–55 tahun, mayoritas memakai **HP Android**, literasi teknologi dasar (WhatsApp, Instagram).
- Kebutuhan: memperbarui menu/harga, mengganti foto produk, mengubah jam buka, menambah testimoni.
- Ketakutan: "takut merusak website". Maka UI harus berbentuk **formulir sederhana** dengan pratinjau.

### P2 — Admin / Penyedia (peran `admin`) — Anda
- Membuat situs pelanggan, mengisi konten awal, mencatat pembayaran, reset password, suspend situs, memantau kuota.

## 5. Model Bisnis

| Item | Keterangan |
|---|---|
| Paket pembuatan | **Sekali bayar, mulai dari Rp 100.000.** Detail paket ditentukan saat calon pelanggan bertanya (tidak ditampilkan di website). Termasuk pembuatan situs, subdomain, akses CMS, dan **hosting tahun pertama** |
| Hosting tahunan | **Rp 100.000 / tahun** mulai tahun kedua, selama infrastruktur masih di paket Free Cloudflare (tanpa upgrade Workers Paid). Jika kelak perlu upgrade, tarif ditinjau ulang dan diumumkan ke pelanggan |
| Maintenance | Biaya terpisah per permintaan atau paket (mis. ganti template, perombakan konten besar, perbaikan) |
| Add-on (Fase 7) | Pemasangan domain sendiri (`www.tokoku.com`) |
| Pembayaran | Transfer langsung ke Anda; status dicatat manual di panel admin |

**Aturan masa hosting**

| Kondisi | Perilaku sistem |
|---|---|
| H-30 & H-7 sebelum habis | Muncul di daftar "Segera habis" di panel admin + banner pengingat di CMS pelanggan |
| Hari habis (H+0) | Situs **tetap tayang**; banner CMS berubah menjadi "Masa hosting telah berakhir" |
| Masa tenggang 14 hari (H+14) | Admin memutuskan suspend secara manual (sistem tidak otomatis mematikan situs) |
| Setelah bayar perpanjangan | Admin mencatat pembayaran `hosting` → masa aktif bertambah 1 tahun dari tanggal habis sebelumnya (bukan dari tanggal bayar) |

**Teks landing page (hero):**
> **Buat website usahamu mulai dari Rp 100rb**
> Tampil profesional, bisa diedit sendiri dari HP. Pilih dari 30 template siap pakai.
> [Tanya via WhatsApp]

Harga di landing hanya ditulis "mulai dari", tanpa tabel paket. Tombol utama membuka WhatsApp Anda dengan pesan otomatis, misalnya "Halo, saya mau tanya pembuatan website untuk usaha saya".

**Batasan per situs (fair-use, wajib dicantumkan di syarat layanan):**

| Batasan | Nilai default |
|---|---|
| Produk / layanan | 30 item |
| Foto galeri | 20 foto |
| Testimoni | 10 |
| Total file media | 60 file, maks 15 MB total |
| Ukuran per foto (setelah kompresi) | ≤ 400 KB |
| Publish per hari | 30 kali |

> Batasan ini menjaga 100 situs tetap di dalam kuota R2 Free (10 GB) dan D1 Free.

## 6. Kebutuhan Fungsional

### 6.1 Situs Publik

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-S01 | Situs tayang di `https://{slug}.domainku.id` dengan HTTPS otomatis | Wajib |
| FR-S02 | Situs berupa satu halaman (one-page) dengan section: Hero, Tentang, Produk/Layanan, Galeri, Testimoni, Jam Buka, Kontak, Lokasi (Google Maps), Media Sosial | Wajib |
| FR-S03 | Section yang kosong / dinonaktifkan otomatis tidak ditampilkan | Wajib |
| FR-S04 | Tombol WhatsApp melayang (floating) dengan pesan otomatis | Wajib |
| FR-S05 | Tombol pesan per produk ("Pesan via WA" dengan nama produk) | Wajib |
| FR-S06 | SEO dasar: `<title>`, meta description, Open Graph (preview saat dibagikan ke WA), `sitemap.xml`, `robots.txt`, JSON-LD `LocalBusiness` | Wajib |
| FR-S07 | Mobile-first, responsif, gambar lazy-load | Wajib |
| FR-S08 | Halaman "Situs tidak ditemukan" untuk subdomain yang tidak terdaftar | Wajib |
| FR-S09 | Halaman "Situs sedang tidak aktif" untuk situs yang di-suspend | Wajib |
| FR-S10 | Footer kecil "Dibuat oleh {merek Anda}" (dapat dimatikan per pelanggan oleh admin) | Sebaiknya |
| FR-S11 | Favicon dari logo pelanggan | Sebaiknya |

### 6.2 CMS Pelanggan (`cms.domainku.id`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-C01 | Login dengan **username + password** | Wajib |
| FR-C02 | Wajib ganti password saat login pertama | Wajib |
| FR-C03 | Pelanggan hanya bisa melihat & mengedit situs miliknya sendiri | Wajib |
| FR-C04 | Formulir edit per section (teks, foto, daftar item) — bukan editor layout | Wajib |
| FR-C05 | Aktif/nonaktifkan section dan atur urutan item (produk, galeri, testimoni) | Wajib |
| FR-C06 | Upload foto dari HP; foto otomatis dikompres & dikonversi ke WebP di browser | Wajib |
| FR-C07 | **Simpan draf** terpisah dari **Terbitkan** | Wajib |
| FR-C08 | Pratinjau (preview) sebelum terbit, tampilan HP & desktop | Wajib |
| FR-C09 | Tombol "Terbitkan" — perubahan tayang ≤ 5 menit (target < 1 menit) | Wajib |
| FR-C10 | Pelanggan dapat **mengganti template** (dari 30 pilihan) tanpa kehilangan konten — dapat dikunci admin per pelanggan | Sebaiknya |
| FR-C11 | Tautan "Lihat situs saya" & tombol bagikan ke WhatsApp | Sebaiknya |
| FR-C12 | Antarmuka Bahasa Indonesia, tombol besar, ramah HP | Wajib |
| FR-C13 | Peringatan jika meninggalkan halaman dengan perubahan belum disimpan | Wajib |
| FR-C14 | Banner pengingat masa hosting (H-30, H-7, sudah habis) beserta tombol "Hubungi admin via WA" | Wajib |

### 6.3 Panel Admin (`cms.domainku.id/admin`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-A01 | Login admin (akun terpisah dengan peran `admin`) | Wajib |
| FR-A02 | Buat pelanggan baru: nama usaha, slug subdomain, kategori, template, username, password awal | Wajib |
| FR-A03 | Validasi slug: huruf kecil, angka, tanda hubung, 3–40 karakter, tidak termasuk daftar terlarang | Wajib |
| FR-A04 | Edit konten situs pelanggan mana pun (untuk pengisian awal & maintenance) | Wajib |
| FR-A05 | Catat pembayaran (jenis: pembuatan / maintenance / add-on, nominal, tanggal, catatan) | Wajib |
| FR-A06 | Status situs: `draft` → `active` → `suspended` | Wajib |
| FR-A07 | Reset password pelanggan (menghasilkan password sementara) | Wajib |
| FR-A08 | Kunci/izinkan pelanggan mengganti template | Sebaiknya |
| FR-A09 | Ganti slug (subdomain) pelanggan | Sebaiknya |
| FR-A10 | Tombol "Terbitkan ulang semua situs" (setelah perbaikan template) | Wajib |
| FR-A11 | Log aktivitas (siapa mengubah apa, kapan) | Wajib |
| FR-A12 | Dashboard: jumlah situs, status bayar, penggunaan storage per situs | Sebaiknya |
| FR-A13 | Hapus pelanggan (soft delete 30 hari, lalu hapus permanen beserta media) | Sebaiknya |
| FR-A14 | Masa hosting per pelanggan (`hosting_until`): diisi otomatis 1 tahun saat publish pertama, bisa diubah manual | Wajib |
| FR-A15 | Daftar "Segera habis / Sudah habis" + tombol "Salin pesan pengingat WA" (teks siap kirim berisi nama usaha, tanggal habis, nominal Rp 100.000, rekening) | Wajib |
| FR-A16 | Catat pembayaran jenis `hosting` → otomatis memperpanjang `hosting_until` 1 tahun | Wajib |

## 7. Katalog Template (30)

Template dibangun dari **10 layout** yang masing-masing punya struktur, CSS, dan cara menampilkan produk sendiri, dipadukan dengan **12 tema** (warna + pasangan huruf premium self-hosted). Hasilnya 30 kombinasi unik untuk **6 kategori UMKM**. Semua template memakai **skema konten yang sama**, sehingga ganti template tidak menghilangkan konten. Saat foto belum diunggah, template menampilkan komposisi dekoratif atau monogram, bukan kotak kosong.

### 7.1 Layout

| Kode | Layout | Karakter |
|---|---|---|
| L01 | Sinema | Foto layar penuh, judul raksasa, produk dalam baris geser |
| L02 | Editorial | Gaya majalah: bingkai lengkung, produk berselang-seling kiri-kanan |
| L03 | Katalog | Toko modern: banner bulat, kartu produk rapat dengan tombol Pesan |
| L04 | Papan Menu | Daftar harga ala restoran dengan titik penghubung dan ornamen |
| L05 | Galeri | Visual lebih dulu: mosaik foto, kartu potret |
| L06 | Cerita | Bacaan panjang yang hangat, kisah usaha lebih dulu |
| L07 | Bio-link | Satu kolom ala link-in-bio: avatar, tombol bertumpuk |
| L08 | Poster Promo | Huruf raksasa, pita berjalan, kartu bergaris tebal & stiker |
| L09 | Layanan | Profesional: kartu layanan + Booking, jam & lokasi menonjol |
| L10 | Butik | Mewah & lapang: serif tipis, bingkai halus, koleksi potret |

### 7.2 Tema

| Kode | Tema | Huruf judul / isi |
|---|---|---|
| T01 | Merah Cabai | Fraunces / Manrope |
| T02 | Espresso (gelap) | DM Serif Display / Manrope |
| T03 | Daun Sage | Bricolage Grotesque / Manrope |
| T04 | Biru Laut | Outfit |
| T05 | Blush | Fraunces / Outfit |
| T06 | Monokrom | Space Grotesk |
| T07 | Gading Emas | Cormorant Garamond / Manrope |
| T08 | Kuning Ceria | Bricolage Grotesque / Outfit |
| T09 | Batik Sogan | Playfair Display / Manrope |
| T10 | Lavender | Syne / Outfit |
| T11 | Senja | Anton / Manrope |
| T12 | Navy | Plus Jakarta Sans |

Semua huruf berlisensi SIL Open Font License, disimpan di `/_fonts/` dan dilayani Static Assets (tanpa kuota Worker).

### 7.3 Daftar 30 template

| ID | Nama | Kategori | Layout | Tema |
|---|---|---|---|---|
| kuliner-01 | Warung Nusantara | Kuliner | Sinema | Merah Cabai |
| kuliner-02 | Kedai Kopi | Kuliner | Papan Menu | Espresso |
| kuliner-03 | Jajanan Ceria | Kuliner | Katalog | Kuning Ceria |
| kuliner-04 | Promo Resto | Kuliner | Poster Promo | Senja |
| kuliner-05 | Katering Sehat | Kuliner | Bio-link | Daun Sage |
| fashion-01 | Butik Monokrom | Fashion | Galeri | Monokrom |
| fashion-02 | Hijab Pastel | Fashion | Katalog | Blush |
| fashion-03 | Couture Elegan | Fashion | Butik | Gading Emas |
| fashion-04 | Batik Sogan | Fashion | Editorial | Batik Sogan |
| fashion-05 | Distro Promo | Fashion | Poster Promo | Lavender |
| jasa-01 | Bengkel Pro | Jasa | Layanan | Navy |
| jasa-02 | Laundry Bersih | Jasa | Papan Menu | Biru Laut |
| jasa-03 | Studio Kreatif | Jasa | Editorial | Monokrom |
| jasa-04 | Servis Elektronik | Jasa | Layanan | Senja |
| jasa-05 | Jasa Freelance | Jasa | Bio-link | Navy |
| cantik-01 | Salon Emas | Kecantikan | Butik | Gading Emas |
| cantik-02 | Spa Pastel | Kecantikan | Layanan | Blush |
| cantik-03 | Nail Art | Kecantikan | Galeri | Lavender |
| cantik-04 | Skincare Herbal | Kecantikan | Editorial | Daun Sage |
| cantik-05 | Barbershop | Kecantikan | Papan Menu | Monokrom |
| toko-01 | Toko Kelontong | Toko / Retail | Katalog | Daun Sage |
| toko-02 | Toko Elektronik | Toko / Retail | Katalog | Navy |
| toko-03 | Toko Grosir | Toko / Retail | Poster Promo | Kuning Ceria |
| toko-04 | Toko Online Mini | Toko / Retail | Bio-link | Biru Laut |
| toko-05 | Toko Oleh-oleh | Toko / Retail | Sinema | Senja |
| kriya-01 | Kriya Batik | Kerajinan | Cerita | Batik Sogan |
| kriya-02 | Kerajinan Kayu | Kerajinan | Galeri | Espresso |
| kriya-03 | Anyaman Alam | Kerajinan | Cerita | Daun Sage |
| kriya-04 | Handmade Craft | Kerajinan | Sinema | Lavender |
| kriya-05 | Galeri Seni | Kerajinan | Butik | Monokrom |

Pelanggan **boleh** memilih template di luar kategorinya.

## 8. Skema Konten (ringkas)

Satu dokumen JSON per situs (detail di `DATABASE.md` §4):

- `business`: nama, tagline, logo, kategori
- `hero`: judul, subjudul, gambar, teks tombol
- `about`: judul, isi, gambar
- `products[]`: nama, harga (angka atau teks "mulai 15rb"), deskripsi, gambar, label (Terlaris/Baru/Promo), tersedia
- `gallery[]`: gambar, keterangan
- `testimonials[]`: nama, isi, rating
- `hours[]`: hari, buka, tutup, libur
- `contact`: WhatsApp, telepon, email, alamat, tautan Google Maps
- `social`: Instagram, Facebook, TikTok, Shopee, Tokopedia, YouTube
- `seo`: judul, deskripsi, gambar share
- `sections`: aktif/nonaktif per section

## 9. Kebutuhan Non-Fungsional

| ID | Kategori | Kebutuhan |
|---|---|---|
| NFR-01 | Biaya | Seluruh layanan muat di Cloudflare Free untuk 100 situs |
| NFR-02 | Performa | HTML situs ≤ 60 KB, CSS template ≤ 25 KB, tanpa JS wajib; TTFB < 200 ms dari cache |
| NFR-03 | Ketersediaan | Mengikuti Cloudflare (tanpa SLA di paket Free) — disampaikan di syarat layanan |
| NFR-04 | Keamanan | Lihat `SECURITY.md`: hash password PBKDF2, isolasi tenant, escaping XSS, rate limit login, Turnstile |
| NFR-05 | Privasi | Hanya menyimpan data minimum (UU PDP): tidak menyimpan KTP, data pengunjung tidak dilacak |
| NFR-06 | Backup | Point-in-time 7 hari (D1 Time Travel) + ekspor mingguan ke R2 |
| NFR-07 | Aksesibilitas | Kontras warna WCAG AA, alt text gambar, ukuran sentuh ≥ 44px |
| NFR-08 | Kompatibilitas | Chrome Android 5 versi terakhir, Safari iOS 15+, browser desktop modern |
| NFR-09 | Skalabilitas | Arsitektur yang sama bisa naik ke 1.000+ situs hanya dengan upgrade Workers Paid ($5/bulan) |

## 10. Batasan & Asumsi

1. **Hanya Cloudflare** (Workers, Static Assets, D1, R2, Turnstile, WAF, DNS, Cron Triggers). Tidak memakai Supabase/Firebase atau server lain.
2. **Satu database D1 bersama** untuk semua pelanggan.
3. **Tidak ada deployment per pelanggan** — satu Worker situs melayani semua subdomain.
4. **SSG**: HTML dirender saat "Terbitkan", bukan saat dikunjungi.
5. **Subdomain satu tingkat** (`toko.domainku.id`) agar tercakup Universal SSL gratis.
6. Domain utama harus dikelola DNS-nya di Cloudflare (nameserver Cloudflare).
7. Kapasitas awal: **100 situs**.

## 11. Alur Utama

### 11.1 Onboarding pelanggan baru
1. Pelanggan memilih template & mengirim materi (logo, foto, menu, kontak) via WA.
2. Pelanggan membayar → Admin mencatat pembayaran.
3. Admin membuat pelanggan di panel admin (slug, template, akun).
4. Admin mengisi konten → Pratinjau → Terbitkan → status `active`.
5. Admin mengirim ke pelanggan: alamat situs, alamat CMS, username, password sementara.
6. Pelanggan login → wajib ganti password → bisa mengedit.

### 11.2 Pelanggan memperbarui harga
Login → menu "Produk" → ubah harga → Simpan → Pratinjau → Terbitkan → situs diperbarui.

## 12. Metrik

- Jumlah situs aktif, persentase situs yang di-update pelanggan per bulan.
- Rata-rata waktu onboarding.
- Pemakaian kuota harian (Workers request, D1 rows, R2 storage) — peringatan pada 70%.

## 13. Pertanyaan Terbuka

| No | Pertanyaan | Default sementara |
|---|---|---|
| Q1 | Nama domain & merek platform | `domainku.id` (placeholder) |
| Q2 | Apakah pelanggan boleh ganti template sendiri? | Boleh, dapat dikunci admin |
| Q3 | ~~Berapa lama layanan untuk paket sekali bayar?~~ | **Diputuskan:** hosting tahun pertama termasuk, lalu Rp 100.000/tahun (§5) |
| Q4 | ~~Apakah perlu landing page pemasaran?~~ | **Diputuskan:** ya, hero "mulai dari Rp 100rb" + tombol WA (§5, Fase 6) |
| Q6 | Berapa masa tenggang sebelum situs di-suspend? | 14 hari, suspend manual oleh admin |
| Q5 | Bagaimana jika pelanggan berhenti / minta data? | Ekspor JSON + ZIP foto dari admin |

## 14. Glosarium

- **Tenant**: satu pelanggan / satu situs.
- **Slug**: nama subdomain pelanggan.
- **SSG**: *Static Site Generation* — HTML dibuat sekali saat terbit.
- **Draf / Terbit**: konten yang sedang diedit vs konten yang tayang.

## 15. Dokumen Terkait

`TAD.md` · `DATABASE.md` · `API.md` · `SECURITY.md` · `DEPLOYMENT.md` · `DEVELOPMENT_PLAN.md`
