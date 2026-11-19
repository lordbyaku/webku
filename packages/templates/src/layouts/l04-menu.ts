import { html } from "@umkm/shared";
import {
  accentTitle, contactLines, ctaButton, footer, hasImg, hoursList, img, mapEmbed, mapsHref, orderHref, paras, price,
  sectionsPresent, socialLinks, stars, wa, waFloat, brand, WA_ICON, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

const ORN = html`<span class="m-orn" aria-hidden="true"><i></i>✦<i></i></span>`;

/** Papan Menu — daftar harga ala restoran dengan titik penghubung dan ornamen. */
export const L04: LayoutDef = {
  id: "L04",
  name: "Papan Menu",
  products: "menu",
  css: `
.m-nav{padding:22px 0;text-align:center}
.m-nav .brand{justify-content:center;font-size:1.05rem;letter-spacing:.14em;text-transform:uppercase;font-family:var(--fb);font-weight:700}
.m-orn{display:flex;align-items:center;justify-content:center;gap:14px;color:var(--pt);font-size:.9rem}
.m-orn i{display:block;width:56px;height:1px;background:currentColor;opacity:.6}
.m-hero{text-align:center;padding:clamp(32px,6vw,80px) 0 clamp(48px,7vw,96px)}
.m-hero .w{display:grid;justify-items:center;gap:22px;max-width:820px}
.m-hero .kick{font-family:var(--fd);font-style:italic;font-size:1.2rem;color:var(--pt);text-transform:none}
.m-hero h1{font-size:clamp(2.8rem,9vw,6rem);line-height:.98}
.m-hero h1 em{color:var(--pt)}
.m-hero .sub{color:var(--mu);font-size:1.12rem;max-width:32em}
.m-plate{position:relative;width:min(100%,960px);margin:clamp(40px,6vw,72px) auto 0;aspect-ratio:16/8;border-radius:var(--r);overflow:hidden;background:var(--sf)}
.m-plate img{width:100%;height:100%;object-fit:cover}
.m-plate::after{content:"";position:absolute;inset:12px;border:1px solid rgba(255,255,255,.55);border-radius:calc(var(--r)*.6);pointer-events:none}
.m-sec{padding:clamp(64px,9vw,112px) 0}
.m-alt{background:var(--sf)}
.m-title{text-align:center;display:grid;gap:14px;margin-bottom:clamp(36px,5vw,60px)}
.m-title h2{font-size:clamp(2.2rem,6vw,3.6rem)}
.m-list{display:grid;gap:4px 64px;max-width:1040px;margin:auto}
.m-item{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start;padding:18px 0}
.m-item img{width:64px;height:64px;border-radius:50%;object-fit:cover}
.m-item.no-img{grid-template-columns:1fr}
.m-line{display:flex;align-items:baseline;gap:10px}
.m-line h3{font-size:clamp(1.2rem,2.4vw,1.45rem);line-height:1.25}
.m-dots{flex:1;border-bottom:1.5px dotted var(--line);border-bottom:1.5px dotted color-mix(in srgb,var(--tx) 35%,transparent);transform:translateY(-5px);min-width:24px}
.m-line .price{font-family:var(--fd);font-size:1.25rem;color:var(--pt)}
.m-item p{color:var(--mu);font-size:.95rem;margin-top:4px;font-style:italic}
.m-item .meta{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:8px;font-size:.88rem}
.m-item .meta a{color:var(--pt);font-weight:700;text-decoration:none}
.m-item .meta a:hover{text-decoration:underline}
.m-item .tag{font-size:.62rem;padding:4px 8px}
.m-story{max-width:680px;margin:auto;text-align:center;font-size:1.12rem}
.m-story p+p{margin-top:16px}
.m-story .ph{margin:40px auto 0;border-radius:var(--r);overflow:hidden;max-width:560px}
.m-strip{display:grid;grid-auto-flow:column;grid-auto-columns:min(70%,300px);gap:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:6px}
.m-strip figure{margin:0}
.m-strip img{aspect-ratio:4/5;object-fit:cover;width:100%;border-radius:var(--r)}
.m-strip figcaption{text-align:center;font-family:var(--fd);font-style:italic;color:var(--mu);margin-top:8px;text-transform:none}
.m-quotes{display:grid;gap:36px;max-width:760px;margin:auto;text-align:center}
.m-quotes blockquote{margin:0}
.m-quotes p{font-family:var(--fd);font-size:clamp(1.3rem,3vw,1.75rem);line-height:1.35;text-transform:none}
.m-quotes cite{display:block;margin-top:12px;font-style:normal;color:var(--mu);font-weight:600}
.m-info{display:grid;gap:44px;max-width:1000px;margin:auto}
.m-info h3{font-size:1.5rem;margin-bottom:18px;text-align:center}
.m-info .hours div{border-bottom-style:dotted}
.m-info .contact{text-align:center}
.m-info .socials{justify-content:center;margin-top:20px}
.m-info .actions{justify-content:center;margin-top:24px}
@media(min-width:880px){
.m-list{grid-template-columns:1fr 1fr}
.m-strip{grid-auto-flow:row;grid-template-columns:repeat(4,1fr);overflow:visible}
.m-info{grid-template-columns:1fr 1fr}
}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const maps = mapsHref(ctx);
    const hero = img(ctx, c.hero.imageMediaId, "", c.hero.title, true);
    return html`<header class="m-nav"><div class="w">${brand(ctx)}</div></header><main id="top"><section class="m-hero"><div class="w">${ORN}${
      c.business.tagline ? html`<div class="kick">${c.business.tagline}</div>` : ""
    }<h1>${accentTitle(ctx, c.hero.title)}</h1>${c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : ""}<div class="actions" style="justify-content:center">${ctaButton(ctx) ?? ""}${
      s.products ? html`<a class="btn btn-o" href="#produk">Lihat ${(c.products.title ?? "menu").toLowerCase()}</a>` : ""
    }</div></div>${hero ? html`<div class="w"><div class="m-plate">${hero}</div></div>` : ""}</section>${
      s.products
        ? html`<section id="produk" class="m-sec m-alt"><div class="w"><div class="m-title">${ORN}<h2>${c.products.title ?? "Menu"}</h2></div><div class="m-list">${c.products.items.map((p) => {
            const href = orderHref(ctx, p);
            const pic = img(ctx, p.imageMediaId, "", p.name);
            return html`<div class="m-item${pic ? "" : " no-img"}${p.available ? "" : " is-sold"}">${pic ?? ""}<div><div class="m-line"><h3>${p.name}</h3><span class="m-dots"></span>${
              price(p) ? html`<span class="price">${price(p)}</span>` : ""
            }</div>${p.description ? html`<p>${p.description}</p>` : ""}<div class="meta">${p.badge ? html`<span class="tag">${{ terlaris: "Terlaris", baru: "Baru", promo: "Promo" }[p.badge]}</span>` : ""}${
              href ? html`<a href="${href}" target="_blank" rel="noopener">Pesan</a>` : p.available ? "" : p.available ? "" : html`<span class="sold">Stok habis</span>`
            }</div></div></div>`;
          })}</div></div></section>`
        : ""
    }${
      s.about
        ? html`<section id="tentang" class="m-sec"><div class="w"><div class="m-title">${ORN}<h2>${c.about.title ?? "Cerita Kami"}</h2></div><div class="m-story">${paras(c.about.body)}${
            hasImg(ctx, c.about.imageMediaId) ? html`<div class="ph">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""
          }</div></div></section>`
        : ""
    }${
      s.gallery
        ? html`<section id="galeri" class="m-sec m-alt"><div class="w"><div class="m-title">${ORN}<h2>${c.gallery.title ?? "Galeri"}</h2></div><div class="m-strip">${c.gallery.items
            .filter((g) => ctx.media.has(g.mediaId))
            .map((g) => html`<figure>${img(ctx, g.mediaId, "", g.caption ?? c.business.name)}${g.caption ? html`<figcaption>${g.caption}</figcaption>` : ""}</figure>`)}</div></div></section>`
        : ""
    }${
      s.testimonials
        ? html`<section class="m-sec"><div class="w"><div class="m-title">${ORN}<h2>${c.testimonials.title ?? "Kata Mereka"}</h2></div><div class="m-quotes">${c.testimonials.items.map(
            (q) => html`<blockquote>${stars(q.rating)}<p>“${q.text}”</p><cite>${q.name}</cite></blockquote>`,
          )}</div></div></section>`
        : ""
    }${
      s.contact
        ? html`<section id="kontak" class="m-sec m-alt"><div class="w"><div class="m-title">${ORN}<h2>Kunjungi Kami</h2></div><div class="m-info"><div><h3>Jam Buka</h3>${hoursList(ctx) ?? ""}</div><div><h3>Lokasi & Kontak</h3>${
            contactLines(ctx) ?? ""
          }${socialLinks(ctx) ?? ""}<div class="actions">${wa(ctx) ? html`<a class="btn" href="${wa(ctx)!}" target="_blank" rel="noopener">${WA_ICON}<span>Reservasi / Pesan</span></a>` : ""}${
            maps ? html`<a class="btn btn-o" href="${maps}" target="_blank" rel="noopener">Petunjuk arah</a>` : ""
          }</div></div></div>${mapEmbed(ctx) ? html`<div style="margin-top:48px">${mapEmbed(ctx)}</div>` : ""}</div></section>`
        : ""
    }</main>${footer(ctx)}${waFloat(ctx) ?? ""}`;
  },
};
