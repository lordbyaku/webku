/** Potongan HTML bersama untuk semua layout. Semua interpolasi lewat `html` (escape otomatis). */
import type { Content, Product } from "@umkm/content-schema";
import { formatRupiah, html, multiline, unsafeRaw, type SafeHtml } from "@umkm/shared";
import type { Theme } from "./themes";

export interface MediaInfo {
  key: string;
  width: number | null;
  height: number | null;
  alt: string | null;
}

export interface Ctx {
  c: Content;
  th: Theme;
  media: Map<string, MediaInfo>;
  mediaOrigin: string;
  showBranding: boolean;
  brandName: string;
  brandUrl: string;
}

export const DAY = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BADGE: Record<string, string> = { terlaris: "Terlaris", baru: "Baru", promo: "Promo" };

// ---------- media ----------
export function mediaUrl(ctx: Ctx, id: string | null | undefined): string | null {
  if (!id) return null;
  const m = ctx.media.get(id);
  return m ? `${ctx.mediaOrigin}/${m.key}` : null;
}

export function hasImg(ctx: Ctx, id: string | null | undefined): boolean {
  return !!id && ctx.media.has(id);
}

export function img(ctx: Ctx, id: string | null | undefined, cls: string, alt: string, eager = false): SafeHtml | null {
  if (!id) return null;
  const m = ctx.media.get(id);
  if (!m) return null;
  return html`<img class="${cls}" src="${ctx.mediaOrigin}/${m.key}" alt="${m.alt || alt}"${
    m.width && m.height ? html` width="${m.width}" height="${m.height}"` : ""
  } ${eager ? html`fetchpriority="high"` : html`loading="lazy" decoding="async"`}>`;
}

/** Komposisi dekoratif pengganti foto (CSS murni, warna dari tema). */
export function art(variant: string, label?: string): SafeHtml {
  return html`<div class="art art-${variant}" aria-hidden="true"><i></i><i></i><i></i>${label ? html`<b>${label}</b>` : ""}</div>`;
}

export function pic(ctx: Ctx, id: string | null | undefined, cls: string, alt: string, fallback: string, eager = false): SafeHtml {
  return img(ctx, id, cls, alt, eager) ?? html`<div class="${cls} ${cls}-art">${art(fallback)}</div>`;
}

// ---------- WhatsApp ----------
export function wa(ctx: Ctx, message?: string | null): string | null {
  const n = ctx.c.contact.whatsapp;
  if (!n) return null;
  const msg = message ?? ctx.c.contact.waMessage ?? "";
  return `https://wa.me/${n}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}

export function orderHref(ctx: Ctx, p: Product): string | null {
  return p.available ? wa(ctx, `Halo ${ctx.c.business.name}, saya mau pesan: ${p.name}`) : null;
}

export function ctaHref(ctx: Ctx): string {
  return wa(ctx) ?? "#kontak";
}

export function ext(href: string): SafeHtml {
  return href.startsWith("http") ? html` target="_blank" rel="noopener"` : html``;
}

export const WA_ICON = unsafeRaw(
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z"/></svg>`,
);
export const ARROW = unsafeRaw(`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
export const PIN = unsafeRaw(`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`);

export function ctaButton(ctx: Ctx, cls = "btn"): SafeHtml | null {
  const label = ctx.c.hero.ctaText;
  if (!label) return null;
  const href = ctaHref(ctx);
  return html`<a class="${cls}" href="${href}"${ext(href)}>${href.startsWith("http") ? WA_ICON : ""}<span>${label}</span></a>`;
}

// ---------- teks ----------
export function paras(text: string | null | undefined, firstCls = ""): SafeHtml {
  const ps = (text ?? "").split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  return html`${ps.map((p, i) => html`<p${i === 0 && firstCls ? html` class="${firstCls}"` : ""}>${multiline(p)}</p>`)}`;
}

export function initial(name: string): string {
  return (name.trim()[0] ?? "•").toUpperCase();
}

/** Pisahkan judul jadi dua bagian untuk aksen miring di tema yang mendukung: kata terakhir dimiringkan. */
export function accentTitle(ctx: Ctx, title: string): SafeHtml {
  if (!ctx.th.it) return html`${title}`;
  const words = title.trim().split(/\s+/);
  if (words.length < 3) return html`${title}`;
  const last = words.pop()!;
  return html`${words.join(" ")} <em>${last}</em>`;
}

// ---------- produk ----------
export function price(p: Product): string | null {
  if (p.price != null) return formatRupiah(p.price);
  return p.priceText ?? null;
}

export function badge(p: Product, cls = "tag"): SafeHtml | null {
  return p.badge ? html`<span class="${cls} ${cls}-${p.badge}">${BADGE[p.badge]}</span>` : null;
}

export function soldOut(p: Product): SafeHtml | null {
  return p.available ? null : html`<span class="sold">Stok habis</span>`;
}

// ---------- jam buka (dikelompokkan) ----------
export interface HourRow {
  label: string;
  value: string;
  closed: boolean;
}

export function groupedHours(c: Content): HourRow[] {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const byDay = new Map(c.hours.map((h) => [h.day, h]));
  const rows: Array<{ days: number[]; value: string; closed: boolean }> = [];
  for (const d of order) {
    const h = byDay.get(d);
    if (!h) continue;
    const value = h.closed ? "Tutup" : `${h.open.replace(":", ".")} – ${h.close.replace(":", ".")}`;
    const last = rows[rows.length - 1];
    const prevDay = last ? last.days[last.days.length - 1]! : -1;
    const consecutive = last && order.indexOf(d) === order.indexOf(prevDay) + 1;
    if (last && consecutive && last.value === value) last.days.push(d);
    else rows.push({ days: [d], value, closed: !!h.closed });
  }
  return rows.map((r) => ({
    label: r.days.length > 2 ? `${DAY[r.days[0]!]} – ${DAY[r.days[r.days.length - 1]!]}` : r.days.map((d) => DAY[d]).join(" & "),
    value: r.value,
    closed: r.closed,
  }));
}

export function hoursList(ctx: Ctx, cls = "hours"): SafeHtml | null {
  if (!ctx.c.sections.hours || ctx.c.hours.length === 0) return null;
  return html`<dl class="${cls}">${groupedHours(ctx.c).map(
    (r) => html`<div class="${r.closed ? "off" : ""}"><dt>${r.label}</dt><dd>${r.value}</dd></div>`,
  )}</dl>`;
}

// ---------- kontak ----------
export function mapsHref(ctx: Ctx): string | null {
  const k = ctx.c.contact;
  return k.mapsUrl ?? (k.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(k.address)}` : null);
}

export function mapEmbed(ctx: Ctx, cls = "map"): SafeHtml | null {
  const a = ctx.c.contact.address;
  if (!ctx.c.sections.map || !a) return null;
  return html`<div class="${cls}"><iframe src="https://maps.google.com/maps?q=${encodeURIComponent(a)}&amp;output=embed" title="Peta lokasi" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`;
}

export function contactLines(ctx: Ctx): SafeHtml | null {
  const k = ctx.c.contact;
  if (!ctx.c.sections.contact) return null;
  const items: SafeHtml[] = [];
  if (k.address) items.push(html`<li><span>Alamat</span>${multiline(k.address)}</li>`);
  if (k.whatsapp) items.push(html`<li><span>WhatsApp</span><a href="${wa(ctx)!}" target="_blank" rel="noopener">+${k.whatsapp.replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/, "$1 $2-$3-$4")}</a></li>`);
  if (k.phone) items.push(html`<li><span>Telepon</span><a href="tel:${k.phone.replace(/[^0-9+]/g, "")}">${k.phone}</a></li>`);
  if (k.email) items.push(html`<li><span>Email</span><a href="mailto:${k.email}">${k.email}</a></li>`);
  return items.length ? html`<ul class="contact">${items}</ul>` : null;
}

export function socials(ctx: Ctx): Array<{ label: string; href: string }> {
  const s = ctx.c.social;
  const out: Array<{ label: string; href: string }> = [];
  if (s.instagram) out.push({ label: "Instagram", href: `https://instagram.com/${s.instagram}` });
  if (s.tiktok) out.push({ label: "TikTok", href: `https://www.tiktok.com/@${s.tiktok}` });
  if (s.facebook) out.push({ label: "Facebook", href: `https://facebook.com/${s.facebook}` });
  if (s.youtube) out.push({ label: "YouTube", href: `https://www.youtube.com/@${s.youtube}` });
  if (s.shopee) out.push({ label: "Shopee", href: s.shopee });
  if (s.tokopedia) out.push({ label: "Tokopedia", href: s.tokopedia });
  return out;
}

export function socialLinks(ctx: Ctx, cls = "socials"): SafeHtml | null {
  const list = socials(ctx);
  if (!list.length) return null;
  return html`<ul class="${cls}">${list.map((l) => html`<li><a href="${l.href}" target="_blank" rel="noopener">${l.label}</a></li>`)}</ul>`;
}

// ---------- navigasi & penutup ----------
export function sectionsPresent(ctx: Ctx) {
  const c = ctx.c;
  return {
    about: c.sections.about && !!(c.about.body || c.about.imageMediaId),
    products: c.sections.products && c.products.items.length > 0,
    gallery: c.sections.gallery && c.gallery.items.some((g) => ctx.media.has(g.mediaId)),
    testimonials: c.sections.testimonials && c.testimonials.items.length > 0,
    contact: (c.sections.contact && !!(c.contact.address || c.contact.whatsapp || c.contact.phone || c.contact.email)) || (c.sections.hours && c.hours.length > 0),
  };
}

export function brand(ctx: Ctx, cls = "brand"): SafeHtml {
  const logo = img(ctx, ctx.c.business.logoMediaId, "", `Logo ${ctx.c.business.name}`, true);
  return html`<a class="${cls}" href="#top">${logo}<span>${ctx.c.business.name}</span></a>`;
}

export function navLinks(ctx: Ctx): SafeHtml {
  const s = sectionsPresent(ctx);
  const links: Array<[string, string]> = [];
  if (s.products) links.push(["#produk", ctx.c.products.title ?? "Produk"]);
  if (s.about) links.push(["#tentang", "Tentang"]);
  if (s.gallery) links.push(["#galeri", "Galeri"]);
  if (s.contact) links.push(["#kontak", "Kontak"]);
  return html`<nav class="links" aria-label="Navigasi">${links.map(([h, l]) => html`<a href="${h}">${l}</a>`)}</nav>`;
}

export function navBar(ctx: Ctx, cls = "nav"): SafeHtml {
  const href = wa(ctx);
  return html`<header class="${cls}"><div class="w nav-in">${brand(ctx)}${navLinks(ctx)}${
    href ? html`<a class="nav-cta" href="${href}" target="_blank" rel="noopener">${WA_ICON}<span>Chat</span></a>` : ""
  }</div></header>`;
}

export function waFloat(ctx: Ctx): SafeHtml | null {
  const href = wa(ctx);
  return href ? html`<a class="wa-f" href="${href}" target="_blank" rel="noopener" aria-label="Chat WhatsApp">${WA_ICON}<span>WhatsApp</span></a>` : null;
}

export function footer(ctx: Ctx, cls = "foot"): SafeHtml {
  return html`<footer class="${cls}"><div class="w foot-in"><span>© ${new Date().getUTCFullYear()} ${ctx.c.business.name}</span>${
    ctx.showBranding ? html`<a href="${ctx.brandUrl}" rel="noopener">Dibuat dengan ${ctx.brandName}</a>` : ""
  }</div></footer>`;
}

export function stars(n: number | null | undefined): SafeHtml {
  const r = n ?? 5;
  return html`<span class="stars" aria-label="${r} dari 5 bintang">${"★".repeat(r)}<span class="stars-off">${"★".repeat(5 - r)}</span></span>`;
}
