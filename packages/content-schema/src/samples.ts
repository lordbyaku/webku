import type { Category, Content } from "./index";

const defaultHours: Content["hours"] = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
  day,
  open: "08:00",
  close: "20:00",
  closed: day === 0,
}));

interface Sample {
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  cta: string;
  about: string;
  productsTitle: string;
  products: Array<{ name: string; price: number | null; priceText?: string; description: string; badge?: "terlaris" | "baru" | "promo" }>;
}

const SAMPLES: Record<Category, Sample> = {
  kuliner: {
    tagline: "Masakan rumahan, rasa juara",
    heroTitle: "Rasa Rumah, Harga Bersahabat",
    heroSubtitle: "Dimasak segar setiap hari. Bisa pesan antar.",
    cta: "Pesan Sekarang",
    about: "Kami menyajikan masakan rumahan dengan bahan segar pilihan dan resep keluarga.",
    productsTitle: "Menu Kami",
    products: [
      { name: "Nasi Ayam Bakar", price: 25000, description: "Ayam bakar bumbu kecap dengan sambal & lalapan", badge: "terlaris" },
      { name: "Soto Ayam", price: 18000, description: "Kuah bening gurih dengan koya" },
      { name: "Es Teh Manis", price: 5000, description: "Segar dan manisnya pas" },
    ],
  },
  fashion: {
    tagline: "Gaya nyaman untuk setiap hari",
    heroTitle: "Koleksi Terbaru Sudah Tersedia",
    heroSubtitle: "Bahan adem, jahitan rapi, harga terjangkau.",
    cta: "Tanya Stok",
    about: "Kami memproduksi pakaian dengan bahan berkualitas dan desain yang mengikuti tren.",
    productsTitle: "Koleksi",
    products: [
      { name: "Kemeja Linen", price: 149000, description: "Tersedia ukuran S–XL", badge: "baru" },
      { name: "Hijab Voal Premium", price: 65000, description: "Mudah dibentuk, tidak menerawang" },
      { name: "Celana Kulot", price: 120000, description: "Pinggang karet, nyaman dipakai" },
    ],
  },
  jasa: {
    tagline: "Cepat, rapi, bergaransi",
    heroTitle: "Layanan Profesional yang Bisa Diandalkan",
    heroSubtitle: "Konsultasi gratis lewat WhatsApp.",
    cta: "Booking via WA",
    about: "Berpengalaman melayani pelanggan dengan pengerjaan cepat dan harga transparan.",
    productsTitle: "Layanan",
    products: [
      { name: "Servis Ringan", price: 75000, description: "Pengecekan & perawatan rutin" },
      { name: "Servis Besar", price: null, priceText: "mulai 250rb", description: "Tergantung kondisi", badge: "terlaris" },
      { name: "Panggilan ke Rumah", price: 50000, description: "Area dalam kota" },
    ],
  },
  cantik: {
    tagline: "Tampil cantik, percaya diri",
    heroTitle: "Rawat Dirimu Bersama Kami",
    heroSubtitle: "Perawatan nyaman oleh terapis berpengalaman.",
    cta: "Reservasi",
    about: "Salon dan perawatan kecantikan dengan produk aman dan suasana yang nyaman.",
    productsTitle: "Perawatan",
    products: [
      { name: "Creambath", price: 60000, description: "Relaksasi & nutrisi rambut" },
      { name: "Facial Glow", price: 120000, description: "Membersihkan & mencerahkan", badge: "terlaris" },
      { name: "Manicure Pedicure", price: 90000, description: "Kuku rapi dan bersih" },
    ],
  },
  toko: {
    tagline: "Lengkap, murah, dekat",
    heroTitle: "Belanja Kebutuhan Harian Jadi Mudah",
    heroSubtitle: "Pesan lewat WA, bisa diantar.",
    cta: "Belanja via WA",
    about: "Toko kami menyediakan kebutuhan sehari-hari dengan harga bersaing.",
    productsTitle: "Produk",
    products: [
      { name: "Beras 5 kg", price: 72000, description: "Beras pulen kualitas premium" },
      { name: "Minyak Goreng 2 L", price: 36000, description: "Promo minggu ini", badge: "promo" },
      { name: "Telur 1 kg", price: 28000, description: "Telur ayam segar" },
    ],
  },
  kriya: {
    tagline: "Karya tangan, sepenuh hati",
    heroTitle: "Kerajinan Asli Buatan Tangan",
    heroSubtitle: "Setiap karya unik dan dibuat dengan teliti.",
    cta: "Pesan Custom",
    about: "Kami adalah perajin lokal yang melestarikan teknik tradisional dalam desain modern.",
    productsTitle: "Karya Kami",
    products: [
      { name: "Tas Anyaman", price: 175000, description: "Anyaman pandan, tahan lama", badge: "terlaris" },
      { name: "Hiasan Dinding", price: 95000, description: "Ukiran kayu jati" },
      { name: "Pesanan Custom", price: null, priceText: "hubungi kami", description: "Desain sesuai keinginan" },
    ],
  },
  lainnya: {
    tagline: "Melayani dengan sepenuh hati",
    heroTitle: "Selamat Datang",
    heroSubtitle: "Hubungi kami untuk informasi lebih lanjut.",
    cta: "Hubungi Kami",
    about: "Ceritakan tentang usaha Anda di sini.",
    productsTitle: "Produk & Layanan",
    products: [{ name: "Produk Pertama", price: 10000, description: "Deskripsi singkat" }],
  },
};

export function sampleContent(category: Category, businessName: string): Content {
  const s = SAMPLES[category];
  return {
    schemaVersion: 1,
    business: { name: businessName, tagline: s.tagline, logoMediaId: null },
    sections: { about: true, products: true, gallery: true, testimonials: true, hours: true, contact: true, map: true },
    hero: { title: s.heroTitle, subtitle: s.heroSubtitle, imageMediaId: null, ctaText: s.cta },
    about: { title: "Tentang Kami", body: s.about, imageMediaId: null },
    products: {
      title: s.productsTitle,
      items: s.products.map((p, i) => ({
        id: `p${i + 1}`,
        name: p.name,
        price: p.price,
        priceText: p.priceText ?? null,
        description: p.description,
        imageMediaId: null,
        badge: p.badge ?? null,
        available: true,
      })),
    },
    gallery: { title: "Galeri", items: [] },
    testimonials: {
      title: "Kata Pelanggan",
      items: [{ name: "Pelanggan Setia", text: "Pelayanannya ramah dan hasilnya memuaskan!", rating: 5 }],
    },
    hours: defaultHours,
    contact: { whatsapp: null, waMessage: "Halo, saya mau tanya", phone: null, email: null, address: null, mapsUrl: null },
    social: { instagram: null, facebook: null, tiktok: null, youtube: null, shopee: null, tokopedia: null },
    seo: { title: null, description: null, ogImageMediaId: null },
  };
}
