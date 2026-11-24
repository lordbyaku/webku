import type { Content } from "@umkm/content-schema";
import { escapeHtml, html, jsonForScript, unsafeRaw } from "@umkm/shared";
import { BASE_CSS, minify } from "./base-css";
import { fontFaceCss, fontFile, type FontKey } from "./fonts";
import { LAYOUTS } from "./layouts";
import { mediaUrl, type Ctx, type MediaInfo } from "./parts";
import { getTemplate } from "./registry";
import { THEMES, themeVars, type Theme } from "./themes";

export interface RenderOptions {
  /** kunci internal situs (mis. "toko.web.rela.my.id") */
  host: string;
  /** URL publik situs, diakhiri "/" (mis. "https://web.rela.my.id/toko/"). Default: https://<host>/ */
  publicUrl?: string;
  mediaOrigin: string;
  media: Map<string, MediaInfo>;
  showBranding: boolean;
  brandName: string;
  brandUrl: string;
  preview?: boolean;
  now?: number;
}

export interface RenderOutput {
  html: string;
  sitemap: string;
  robots: string;
}

export class UnknownTemplateError extends Error {}

const STATUS_CSS = `body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f6f7f9;color:#1f2937;padding:24px;text-align:center}main{max-width:480px}h1{font-size:1.6rem;margin:0 0 .5em}p{color:#4b5563;line-height:1.6}a{color:#1d4ed8}`;

const SERIF_KEYS = new Set<FontKey>(["fraunces", "playfair", "dmserif", "cormorant", "instrument"]);

function clip(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

const DAY_SCHEMA = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function jsonLd(c: Content, url: string, image: string | null) {
  const sameAs: string[] = [];
  if (c.social.instagram) sameAs.push(`https://instagram.com/${c.social.instagram}`);
  if (c.social.tiktok) sameAs.push(`https://www.tiktok.com/@${c.social.tiktok}`);
  if (c.social.facebook) sameAs.push(`https://facebook.com/${c.social.facebook}`);
  if (c.social.youtube) sameAs.push(`https://www.youtube.com/@${c.social.youtube}`);
  if (c.social.shopee) sameAs.push(c.social.shopee);
  if (c.social.tokopedia) sameAs.push(c.social.tokopedia);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: c.business.name,
    description: c.business.tagline ?? c.hero.subtitle ?? undefined,
    url,
    image: image ?? undefined,
    telephone: c.contact.whatsapp ? `+${c.contact.whatsapp}` : (c.contact.phone ?? undefined),
    email: c.contact.email ?? undefined,
    address: c.contact.address ? { "@type": "PostalAddress", streetAddress: c.contact.address, addressCountry: "ID" } : undefined,
    openingHoursSpecification: c.sections.hours
      ? c.hours.filter((h) => !h.closed).map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: DAY_SCHEMA[h.day], opens: h.open, closes: h.close }))
      : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
}

/** Tema efektif: layout "serif" memaksa huruf judul serif bila tema memakai sans. */
function effectiveTheme(th: Theme, forceSerif?: boolean): Theme {
  if (!forceSerif || SERIF_KEYS.has(th.fd)) return th;
  return { ...th, fd: "cormorant", dw: 500, dt: "-0.01em", du: false, it: true };
}

export function renderSite(templateId: string, content: Content, opts: RenderOptions): RenderOutput {
  const tpl = getTemplate(templateId);
  if (!tpl) throw new UnknownTemplateError(`Template tidak dikenal: ${templateId}`);
  const layout = LAYOUTS[tpl.layout]!;
  const theme = effectiveTheme(THEMES[tpl.theme]!, layout.forceSerif);
  const ctx: Ctx = {
    c: content,
    th: theme,
    media: opts.media,
    mediaOrigin: opts.mediaOrigin,
    showBranding: opts.showBranding,
    brandName: opts.brandName,
    brandUrl: opts.brandUrl,
  };

  const url = opts.publicUrl ?? `https://${opts.host}/`;
  const title = content.seo.title ?? clip(content.business.tagline ? `${content.business.name} — ${content.business.tagline}` : content.business.name, 70);
  const description = content.seo.description ?? clip(content.hero.subtitle ?? content.about.body ?? content.business.name, 160);
  const ogImage = mediaUrl(ctx, content.seo.ogImageMediaId) ?? mediaUrl(ctx, content.hero.imageMediaId) ?? mediaUrl(ctx, content.business.logoMediaId);
  const favicon = mediaUrl(ctx, content.business.logoMediaId);

  const italic: FontKey[] = theme.it ? [theme.fd] : [];
  const css = fontFaceCss([theme.fd, theme.fb], italic) + themeVars(theme) + minify(BASE_CSS) + minify(layout.css);
  const preloads = [theme.fd, theme.fb].filter((k, i, a) => a.indexOf(k) === i);

  const doc = html`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}">${
    opts.preview ? html`<meta name="robots" content="noindex,nofollow">` : html`<link rel="canonical" href="${url}">`
  }<meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:locale" content="id_ID">${
    ogImage ? html`<meta property="og:image" content="${ogImage}"><meta name="twitter:card" content="summary_large_image">` : ""
  }<meta name="theme-color" content="${theme.bg}">${favicon ? html`<link rel="icon" href="${favicon}">` : ""}${preloads.map(
    (k) => html`<link rel="preload" href="${fontFile(k)}" as="font" type="font/woff2" crossorigin>`,
  )}<link rel="preconnect" href="${opts.mediaOrigin}"><style>${unsafeRaw(css)}</style><script type="application/ld+json">${jsonForScript(
    jsonLd(content, url, ogImage),
  )}</script></head><body class="tpl-${tpl.id}">${layout.render(ctx)}</body></html>`;

  const lastmod = new Date(opts.now ?? Date.now()).toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHtml(url)}</loc><lastmod>${lastmod}</lastmod></url></urlset>\n`;
  const robots = `User-agent: *\nAllow: /\nSitemap: ${url}sitemap.xml\n`;
  return { html: doc.value, sitemap, robots };
}

export type StatusKind = "not_found" | "suspended";

export function renderStatusPage(kind: StatusKind, brandName: string, brandUrl: string): string {
  const [title, msg] =
    kind === "suspended"
      ? ["Situs sedang tidak aktif", "Situs ini untuk sementara tidak dapat diakses. Silakan kembali lagi nanti."]
      : ["Situs tidak ditemukan", "Alamat yang Anda buka belum terdaftar atau sudah tidak digunakan."];
  return html`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>${unsafeRaw(
    STATUS_CSS,
  )}</style></head><body><main><h1>${title}</h1><p>${msg}</p><p><a href="${brandUrl}">Buat website usaha Anda bersama ${brandName}</a></p></main></body></html>`.value;
}


