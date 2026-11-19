export const RESERVED_SLUGS = new Set([
  "www", "cms", "admin", "api", "media", "assets", "static", "cdn", "mail", "email", "smtp", "ftp",
  "app", "dev", "staging", "test", "demo", "status", "help", "support", "docs", "blog", "billing",
  "login", "auth", "root", "ns1", "ns2", "_tpl", "fallback", "cname",
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

export type SlugCheck = { ok: true } | { ok: false; reason: string };

export function checkSlug(slug: string): SlugCheck {
  if (!SLUG_RE.test(slug)) {
    return { ok: false, reason: "Gunakan 3–40 huruf kecil, angka, atau tanda hubung (tidak di awal/akhir)" };
  }
  if (slug.includes("--")) return { ok: false, reason: "Tanda hubung tidak boleh berurutan" };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, reason: "Nama ini dicadangkan sistem" };
  return { ok: true };
}

/** Saran slug dari nama usaha: "Warung Bu Sri" → "warung-bu-sri". */
export function suggestSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
