import * as v from "valibot";

export const CATEGORIES = ["kuliner", "fashion", "jasa", "cantik", "toko", "kriya", "lainnya"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  kuliner: "Kuliner",
  fashion: "Fashion",
  jasa: "Jasa",
  cantik: "Kecantikan",
  toko: "Toko / Retail",
  kriya: "Kerajinan",
  lainnya: "Lainnya",
};

export const LIMITS = {
  products: 30,
  gallery: 20,
  testimonials: 10,
  mediaFiles: 60,
  mediaFileBytes: 512_000,
  publishPerDay: 30,
  contentJsonBytes: 100_000,
} as const;

// ---------- helper string ----------

// Karakter kontrol, zero-width, dan bidi override dibuang (tab, \n, \r dipertahankan).
const STRIP_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

function clean(s: string, multiline: boolean): string {
  let out = s.replace(STRIP_RE, "").replace(/\u2028|\u2029/g, "\n");
  out = multiline ? out.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n") : out.replace(/[\r\n\t]+/g, " ");
  return out.trim();
}

const text = (max: number, min = 0, multiline = false) =>
  v.pipe(
    v.string(),
    v.transform((s) => clean(s, multiline)),
    v.minLength(min, min > 0 ? "Wajib diisi" : undefined),
    v.maxLength(max, `Maksimal ${max} karakter`),
  );

/** String opsional: kosong → null. */
const optText = (max: number, multiline = false) =>
  v.pipe(
    v.optional(v.nullable(v.string()), null),
    v.transform((s) => {
      if (s == null) return null;
      const c = clean(s, multiline);
      return c === "" ? null : c;
    }),
    v.check((s) => s === null || s.length <= max, `Maksimal ${max} karakter`),
  );

const mediaId = v.optional(v.nullable(v.pipe(v.string(), v.regex(/^m_[A-Za-z0-9_-]{21}$/, "ID media tidak valid"))), null);

function hostAllowed(url: string, hosts: string[]): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
    const h = u.hostname.toLowerCase();
    return hosts.some((a) => h === a || h.endsWith("." + a));
  } catch {
    return false;
  }
}

const urlFrom = (hosts: string[], msg: string) =>
  v.pipe(
    optText(500),
    v.check((s) => s === null || hostAllowed(s, hosts), msg),
  );

export const MAPS_HOSTS = ["maps.app.goo.gl", "goo.gl", "google.com", "google.co.id"];
export const MARKET_HOSTS = ["shopee.co.id", "shope.ee", "tokopedia.com", "tokopedia.link", "tk.tokopedia.com"];

const socialUser = v.pipe(
  optText(60),
  v.transform((s) => (s === null ? null : s.replace(/^@/, ""))),
  v.check((s) => s === null || /^[A-Za-z0-9._-]{1,60}$/.test(s), "Isi username saja, tanpa tautan"),
);

/** Normalisasi nomor WA Indonesia → "628xxxx". */
export function normalizeWhatsapp(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d;
}

const whatsapp = v.pipe(
  v.optional(v.nullable(v.string()), null),
  v.transform((s) => (s == null || s.trim() === "" ? null : normalizeWhatsapp(s))),
  v.check((s) => s === null || /^62\d{8,13}$/.test(s), "Nomor WhatsApp tidak valid (contoh: 081234567890)"),
);

const timeHHMM = v.pipe(v.string(), v.regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam HH:MM"));

// ---------- skema ----------

export const ProductSchema = v.object({
  id: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{1,24}$/)),
  name: text(60, 1),
  price: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1_000_000_000))), null),
  priceText: optText(30),
  description: optText(200, true),
  imageMediaId: mediaId,
  badge: v.optional(v.nullable(v.picklist(["terlaris", "baru", "promo"])), null),
  available: v.optional(v.boolean(), true),
});

export const ContentSchema = v.object({
  schemaVersion: v.literal(1),
  business: v.object({
    name: text(60, 1),
    tagline: optText(100),
    logoMediaId: mediaId,
  }),
  sections: v.object({
    about: v.optional(v.boolean(), true),
    products: v.optional(v.boolean(), true),
    gallery: v.optional(v.boolean(), true),
    testimonials: v.optional(v.boolean(), true),
    hours: v.optional(v.boolean(), true),
    contact: v.optional(v.boolean(), true),
    map: v.optional(v.boolean(), true),
  }),
  hero: v.object({
    title: text(80, 1),
    subtitle: optText(160),
    imageMediaId: mediaId,
    ctaText: optText(30),
  }),
  about: v.object({
    title: optText(60),
    body: optText(1500, true),
    imageMediaId: mediaId,
  }),
  products: v.object({
    title: optText(60),
    items: v.pipe(v.array(ProductSchema), v.maxLength(LIMITS.products, `Maksimal ${LIMITS.products} produk`)),
  }),
  gallery: v.object({
    title: optText(60),
    items: v.pipe(
      v.array(v.object({ mediaId: v.pipe(v.string(), v.regex(/^m_[A-Za-z0-9_-]{21}$/)), caption: optText(100) })),
      v.maxLength(LIMITS.gallery, `Maksimal ${LIMITS.gallery} foto`),
    ),
  }),
  testimonials: v.object({
    title: optText(60),
    items: v.pipe(
      v.array(
        v.object({
          name: text(40, 1),
          text: text(300, 1, true),
          rating: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5))), 5),
        }),
      ),
      v.maxLength(LIMITS.testimonials, `Maksimal ${LIMITS.testimonials} testimoni`),
    ),
  }),
  hours: v.pipe(
    v.array(
      v.object({
        day: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(6)),
        open: timeHHMM,
        close: timeHHMM,
        closed: v.optional(v.boolean(), false),
      }),
    ),
    v.maxLength(7),
  ),
  contact: v.object({
    whatsapp,
    waMessage: optText(200),
    phone: v.pipe(optText(20), v.check((s) => s === null || /^[0-9+\-\s()]{6,20}$/.test(s), "Nomor telepon tidak valid")),
    email: v.pipe(optText(120), v.check((s) => s === null || /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s), "Email tidak valid")),
    address: optText(200, true),
    mapsUrl: urlFrom(MAPS_HOSTS, "Tautan harus dari Google Maps"),
  }),
  social: v.object({
    instagram: socialUser,
    facebook: socialUser,
    tiktok: socialUser,
    youtube: socialUser,
    shopee: urlFrom(MARKET_HOSTS, "Tautan harus dari Shopee atau Tokopedia"),
    tokopedia: urlFrom(MARKET_HOSTS, "Tautan harus dari Shopee atau Tokopedia"),
  }),
  seo: v.object({
    title: optText(70),
    description: optText(160),
    ogImageMediaId: mediaId,
  }),
});

export type Content = v.InferOutput<typeof ContentSchema>;
export type ContentInput = v.InferInput<typeof ContentSchema>;
export type Product = v.InferOutput<typeof ProductSchema>;

export type ParseResult = { ok: true; content: Content } | { ok: false; fields: Record<string, string> };

export function parseContent(input: unknown): ParseResult {
  const r = v.safeParse(ContentSchema, input);
  if (r.success) return { ok: true, content: r.output };
  const fields: Record<string, string> = {};
  for (const issue of r.issues) {
    const path = v.getDotPath(issue) ?? "_";
    if (!fields[path]) fields[path] = issue.message;
  }
  return { ok: false, fields };
}

/** Semua mediaId yang dirujuk konten (untuk cek kepemilikan & render). */
export function collectMediaIds(c: Content): string[] {
  const ids = new Set<string>();
  const add = (id: string | null | undefined) => id && ids.add(id);
  add(c.business.logoMediaId);
  add(c.hero.imageMediaId);
  add(c.about.imageMediaId);
  add(c.seo.ogImageMediaId);
  c.products.items.forEach((p) => add(p.imageMediaId));
  c.gallery.items.forEach((g) => add(g.mediaId));
  return [...ids];
}

export { sampleContent } from "./samples";
