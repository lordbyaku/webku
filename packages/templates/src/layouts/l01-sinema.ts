import { html } from "@umkm/shared";
import {
  accentTitle, art, brand, contactLines, ctaButton, footer, hasImg, hoursList, img, mapEmbed, mapsHref, navLinks, orderHref,
  paras, price, badge, sectionsPresent, socialLinks, soldOut, stars, wa, waFloat, WA_ICON, ARROW, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

/** Sinema — foto layar penuh, judul raksasa, produk dalam baris geser. */
export const L01: LayoutDef = {
  id: "L01",
  name: "Sinema",
  products: "grid",
  css: `
.s-nav{position:absolute;top:0;left:0;right:0;z-index:5;color:#fff}
.s-nav .nav-cta{background:rgba(255,255,255,.16);color:#fff;backdrop-filter:blur(8px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)}
.s-hero{position:relative;min-height:92svh;display:flex;align-items:flex-end;color:#fff;background:#111;isolation:isolate}
.s-hero>.bg,.s-hero>.bg-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
.s-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,.15) 55%,rgba(0,0,0,.78) 100%)}
.s-hero .bg-art .art{background:var(--p)}
.s-hero .bg-art .art i:nth-child(1){background:var(--ac);opacity:.55}
.s-hero .bg-art .art i:nth-child(2){background:var(--tx);opacity:.5}
.s-hero-in{padding:120px 0 56px;display:grid;gap:22px;max-width:980px}
.s-kicker{font-size:.95rem;font-weight:600;letter-spacing:.02em;opacity:.9;display:flex;align-items:center;gap:12px}
.s-kicker::before{content:"";width:36px;height:1.5px;background:currentColor}
.s-hero h1{font-size:clamp(2.9rem,10.5vw,7.2rem);line-height:.94}
.s-hero .sub{font-size:clamp(1.05rem,2.2vw,1.3rem);max-width:34em;opacity:.92}
.s-hero .btn-o{color:#fff}
.s-hero .btn:not(.btn-o){background:#fff;color:#141414}
.s-sec{padding:clamp(64px,10vw,120px) 0}
.s-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:clamp(28px,4vw,48px)}
.s-head h2{font-size:clamp(2.1rem,6vw,4rem)}
.s-head p{color:var(--mu);max-width:22em}
.s-row{display:grid;grid-auto-flow:column;grid-auto-columns:min(74%,300px);gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 20px 18px;margin:0 -20px;scrollbar-width:none;scroll-padding-inline:20px}
.s-row::-webkit-scrollbar{display:none}
.s-card{scroll-snap-align:start;display:flex;flex-direction:column;gap:14px}
.s-media{position:relative;aspect-ratio:4/5;border-radius:var(--r);overflow:hidden;background:var(--sf)}
.s-media img{width:100%;height:100%;object-fit:cover;transition:transform .6s ease}
.s-card:hover .s-media img{transform:scale(1.04)}
.s-media .tag{position:absolute;top:12px;left:12px}
.s-mono{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);font-size:4.5rem;color:var(--pt);background:radial-gradient(circle at 30% 20%,var(--tint),var(--sf))}
.s-card h3{font-size:1.35rem;line-height:1.15}
.s-meta{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.s-meta .price{font-weight:700;color:var(--pt)}
.s-card p{color:var(--mu);font-size:.95rem}
.s-about{display:grid;gap:clamp(32px,6vw,80px);align-items:center}
.s-about .lead{font-family:var(--fd);font-weight:var(--dw);font-size:clamp(1.6rem,3.6vw,2.6rem);line-height:1.2;letter-spacing:var(--dt);margin-bottom:22px;text-transform:none}
.s-about p+p{margin-top:14px;color:var(--mu)}
.s-about .ph{aspect-ratio:4/5;border-radius:var(--r);overflow:hidden;position:relative}
.s-about .ph img{width:100%;height:100%;object-fit:cover}
.s-gal{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.s-gal figure{margin:0;position:relative;overflow:hidden;border-radius:calc(var(--r)*.6)}
.s-gal img{width:100%;height:100%;aspect-ratio:1;object-fit:cover}
.s-gal figure:first-child{grid-column:span 2}
.s-gal figure:first-child img{aspect-ratio:16/9}
.s-gal figcaption{position:absolute;left:12px;bottom:10px;color:#fff;font-size:.85rem;font-weight:600;text-shadow:0 1px 8px rgba(0,0,0,.6)}
.s-quotes{display:grid;gap:clamp(28px,4vw,48px)}
.s-quote{border-top:1px solid var(--line);padding-top:24px}
.s-quote p{font-family:var(--fd);font-weight:var(--dw);font-size:clamp(1.3rem,2.6vw,1.8rem);line-height:1.3;letter-spacing:var(--dt);text-transform:none}
.s-quote footer{margin-top:16px;display:flex;gap:12px;align-items:center;color:var(--mu);font-weight:600}
.s-info{background:var(--tx);color:var(--bg)}
.s-info .s-head p,.s-info .contact li span{color:inherit;opacity:.65}
.s-info-grid{display:grid;gap:40px}
.s-info .hours div{border-color:color-mix(in srgb,var(--bg) 18%,transparent)}
.s-info .socials a{border-color:color-mix(in srgb,var(--bg) 25%,transparent)}
.s-info .btn{background:var(--bg);color:var(--tx)}
.s-info .btn-o{background:transparent;color:var(--bg)}
.s-info .map{margin-top:28px}
.s-info + .foot{border:0}
@media(min-width:880px){
.s-row{grid-auto-flow:row;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));overflow:visible;margin:0;padding:0;gap:32px 24px}
.s-about{grid-template-columns:1.1fr .9fr}
.s-gal{grid-template-columns:repeat(4,1fr)}
.s-gal figure:first-child{grid-column:span 2;grid-row:span 2}
.s-gal figure:first-child img{aspect-ratio:1}
.s-quotes{grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.s-info-grid{grid-template-columns:1.2fr 1fr 1fr}
}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const heroImg = img(ctx, c.hero.imageMediaId, "bg", c.hero.title, true);
    const products = s.products
      ? html`<section id="produk" class="s-sec"><div class="w"><div class="s-head"><h2>${c.products.title ?? "Produk"}</h2></div><div class="s-row">${c.products.items.map((p) => {
          const href = orderHref(ctx, p);
          return html`<article class="s-card${p.available ? "" : " is-sold"}"><div class="s-media">${
            img(ctx, p.imageMediaId, "", p.name) ?? html`<div class="s-mono" aria-hidden="true">${p.name.trim()[0] ?? "•"}</div>`
          }${badge(p)}</div><div class="s-meta"><h3>${p.name}</h3>${price(p) ? html`<span class="price">${price(p)}</span>` : ""}</div>${
            p.description ? html`<p>${p.description}</p>` : ""
          }${href ? html`<a class="lnk" href="${href}" target="_blank" rel="noopener">Pesan sekarang ${ARROW}</a>` : soldOut(p)}</article>`;
        })}</div></div></section>`
      : "";
    const about = s.about
      ? html`<section id="tentang" class="s-sec" style="background:var(--sf)"><div class="w s-about"><div><div class="s-head" style="margin-bottom:24px"><h2>${c.about.title ?? "Tentang Kami"}</h2></div>${paras(
          c.about.body,
          "lead",
        )}</div>${hasImg(ctx, c.about.imageMediaId) ? html`<div class="ph">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""}</div></section>`
      : "";
    const gallery = s.gallery
      ? html`<section id="galeri" class="s-sec"><div class="w"><div class="s-head"><h2>${c.gallery.title ?? "Galeri"}</h2></div><div class="s-gal">${c.gallery.items
          .filter((g) => ctx.media.has(g.mediaId))
          .map((g) => html`<figure>${img(ctx, g.mediaId, "", g.caption ?? c.business.name)}${g.caption ? html`<figcaption>${g.caption}</figcaption>` : ""}</figure>`)}</div></div></section>`
      : "";
    const testi = s.testimonials
      ? html`<section class="s-sec" style="padding-top:0"><div class="w"><div class="s-head"><h2>${c.testimonials.title ?? "Kata Pelanggan"}</h2></div><div class="s-quotes">${c.testimonials.items.map(
          (q) => html`<blockquote class="s-quote" style="margin:0"><p>“${q.text}”</p><footer>${stars(q.rating)}<span>${q.name}</span></footer></blockquote>`,
        )}</div></div></section>`
      : "";
    const maps = mapsHref(ctx);
    const info = s.contact
      ? html`<section id="kontak" class="s-sec s-info"><div class="w"><div class="s-head"><h2>Datang & pesan</h2>${
          c.business.tagline ? html`<p>${c.business.tagline}</p>` : ""
        }</div><div class="s-info-grid"><div>${contactLines(ctx) ?? ""}<div class="actions" style="margin-top:28px">${
          wa(ctx) ? html`<a class="btn" href="${wa(ctx)!}" target="_blank" rel="noopener">${WA_ICON}<span>Chat WhatsApp</span></a>` : ""
        }${maps ? html`<a class="btn btn-o" href="${maps}" target="_blank" rel="noopener">Petunjuk arah</a>` : ""}</div></div><div>${hoursList(ctx) ?? ""}</div><div>${
          socialLinks(ctx) ?? ""
        }</div></div>${mapEmbed(ctx) ?? ""}</div></section>`
      : "";
    return html`<header class="s-nav"><div class="w nav-in">${brand(ctx)}${navLinks(ctx)}${
      wa(ctx) ? html`<a class="nav-cta" href="${wa(ctx)!}" target="_blank" rel="noopener">${WA_ICON}<span>Chat</span></a>` : ""
    }</div></header><main id="top"><section class="s-hero">${heroImg ?? html`<div class="bg-art">${art("orb")}</div>`}<div class="w s-hero-in">${
      c.business.tagline ? html`<div class="s-kicker">${c.business.tagline}</div>` : ""
    }<h1>${accentTitle(ctx, c.hero.title)}</h1>${c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : ""}<div class="actions">${ctaButton(ctx) ?? ""}${
      s.products ? html`<a class="btn btn-o" href="#produk">Lihat ${(c.products.title ?? "produk").toLowerCase()}</a>` : ""
    }</div></div></section>${products}${about}${gallery}${testi}${info}</main>${footer(ctx)}${waFloat(ctx) ?? ""}`;
  },
};


