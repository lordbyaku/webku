import { html } from "@umkm/shared";
import {
  accentTitle, art, initial, brand, contactLines, ctaButton, footer, hasImg, hoursList, img, mapEmbed, mapsHref, navLinks, orderHref,
  paras, price, sectionsPresent, socialLinks, wa, waFloat, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

/** Butik — mewah & lapang: huruf serif tipis, bingkai halus, koleksi potret. */
export const L10: LayoutDef = {
  id: "L10",
  name: "Butik",
  products: "menu",
  forceSerif: true,
  css: `
body{font-size:16px}
.l-nav{border-bottom:1px solid var(--line)}
.l-nav .nav-in{min-height:84px}
.l-nav .brand{font-size:1.5rem;letter-spacing:.02em;font-weight:500}
.l-nav .nav-cta{background:transparent;color:var(--tx);box-shadow:inset 0 0 0 1px var(--tx);border-radius:0;font-weight:600;letter-spacing:.06em;font-size:.8rem;text-transform:uppercase}
.l-nav .nav-cta svg{display:none}
.l-hero{padding:clamp(48px,9vw,120px) 0 clamp(40px,6vw,72px);text-align:center}
.l-hero .w{display:grid;justify-items:center;gap:26px;max-width:880px}
.l-kick{font-size:.78rem;letter-spacing:.32em;text-transform:uppercase;color:var(--mu)}
.l-hero h1{font-size:clamp(3rem,10vw,7rem);line-height:.95;font-weight:calc(var(--dw) - 100)}
.l-hero h1 em{color:var(--pt)}
.l-hero .sub{color:var(--mu);font-size:1.1rem;max-width:30em}
.l-hero .btn{border-radius:0;letter-spacing:.08em;text-transform:uppercase;font-size:.82rem;min-height:54px;padding:0 34px}
.l-cover{position:relative;height:clamp(320px,62vw,720px);overflow:hidden;background:var(--sf)}
.l-cover img{width:100%;height:100%;object-fit:cover}
.l-cover.empty{height:clamp(200px,34vw,360px)}
.l-cover.empty::after{display:none}
.art-frame b{font-style:italic;font-weight:400;color:var(--pt);opacity:.75}
.l-item .art b{font-size:4rem}
.l-cover::after{content:"";position:absolute;inset:clamp(10px,2vw,22px);border:1px solid rgba(255,255,255,.6);pointer-events:none}
.l-sec{padding:clamp(72px,10vw,136px) 0}
.l-title{text-align:center;margin-bottom:clamp(40px,6vw,72px);display:grid;gap:12px;justify-items:center}
.l-title span{font-size:.75rem;letter-spacing:.32em;text-transform:uppercase;color:var(--mu)}
.l-title h2{font-size:clamp(2.4rem,6.4vw,4.2rem);font-weight:calc(var(--dw) - 100)}
.l-col{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(28px,4vw,56px) clamp(14px,3vw,36px)}
.l-item{text-align:center}
.l-item .ph{position:relative;aspect-ratio:3/4;overflow:hidden;background:var(--sf);margin-bottom:18px}
.l-item .ph img{width:100%;height:100%;object-fit:cover;transition:transform 1s ease}
.l-item:hover .ph img{transform:scale(1.04)}
.l-item .ph .art{background:var(--sf)}
.l-item h3{font-size:clamp(1.25rem,2.4vw,1.6rem);font-weight:calc(var(--dw) - 50);line-height:1.15}
.l-item .price{display:block;margin-top:6px;font-size:.9rem;letter-spacing:.08em;color:var(--mu)}
.l-item p{font-size:.88rem;color:var(--mu);margin-top:6px}
.l-item .ask{display:inline-block;margin-top:10px;font-size:.75rem;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:2px}
.l-item .flag{position:absolute;top:12px;left:12px;font-size:.66rem;letter-spacing:.2em;text-transform:uppercase;background:var(--bg);padding:6px 10px}
.l-about{display:grid;gap:clamp(32px,6vw,96px);align-items:center}
.l-about .ph{aspect-ratio:4/5;overflow:hidden}
.l-about .ph img{width:100%;height:100%;object-fit:cover}
.l-about .lead{font-family:var(--fd);font-style:italic;font-size:clamp(1.6rem,3.6vw,2.4rem);line-height:1.25;margin-bottom:24px;color:var(--pt);text-transform:none}
.l-about p+p{margin-top:14px;color:var(--mu)}
.l-gal{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(8px,1.5vw,16px)}
.l-gal img{aspect-ratio:4/5;object-fit:cover;width:100%}
.l-quote{max-width:780px;margin:auto;text-align:center;display:grid;gap:48px}
.l-quote blockquote{margin:0}
.l-quote p{font-family:var(--fd);font-style:italic;font-size:clamp(1.45rem,3.4vw,2.2rem);line-height:1.3;text-transform:none}
.l-quote cite{display:block;margin-top:16px;font-style:normal;font-size:.75rem;letter-spacing:.28em;text-transform:uppercase;color:var(--mu)}
.l-info{display:grid;gap:44px;text-align:center;max-width:1000px;margin:auto}
.l-info h3{font-size:.78rem;font-family:var(--fb);letter-spacing:.3em;text-transform:uppercase;font-weight:600;margin-bottom:18px;color:var(--mu)}
.l-info .hours div{justify-content:center;gap:24px}
.l-info .socials{justify-content:center}
.l-info .socials a{border-radius:0}
.l-info .contact{justify-items:center}
@media(min-width:880px){
.l-col{grid-template-columns:repeat(3,1fr)}
.l-about{grid-template-columns:1fr 1.1fr}
.l-gal{grid-template-columns:repeat(4,1fr)}
.l-info{grid-template-columns:repeat(3,1fr)}
}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const maps = mapsHref(ctx);
    return html`<header class="l-nav"><div class="w nav-in">${brand(ctx)}${navLinks(ctx)}${
      wa(ctx) ? html`<a class="nav-cta" href="${wa(ctx)!}" target="_blank" rel="noopener"><span>Hubungi</span></a>` : ""
    }</div></header><main id="top"><section class="l-hero"><div class="w">${c.business.tagline ? html`<span class="l-kick">${c.business.tagline}</span>` : ""}<h1>${accentTitle(
      ctx,
      c.hero.title,
    )}</h1>${c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : ""}${ctaButton(ctx) ?? ""}</div></section><div class="w"><div class="l-cover${hasImg(ctx, c.hero.imageMediaId) ? "" : " empty"}">${
      img(ctx, c.hero.imageMediaId, "", c.hero.title, true) ?? art("frame", initial(c.business.name))
    }</div></div>${
      s.products
        ? html`<section id="produk" class="l-sec"><div class="w"><div class="l-title"><span>${c.business.name}</span><h2>${c.products.title ?? "Koleksi"}</h2></div><div class="l-col">${c.products.items.map((p) => {
            const href = orderHref(ctx, p);
            return html`<article class="l-item${p.available ? "" : " is-sold"}"><div class="ph">${img(ctx, p.imageMediaId, "", p.name) ?? art("frame", initial(p.name))}${
              p.badge ? html`<span class="flag">${{ terlaris: "Favorit", baru: "Baru", promo: "Spesial" }[p.badge]}</span>` : ""
            }</div><h3>${p.name}</h3>${price(p) ? html`<span class="price">${price(p)}</span>` : ""}${p.description ? html`<p>${p.description}</p>` : ""}${
              href ? html`<a class="ask" href="${href}" target="_blank" rel="noopener">Pesan</a>` : p.available ? "" : html`<span class="sold">Habis</span>`
            }</article>`;
          })}</div></div></section>`
        : ""
    }${
      s.about
        ? html`<section id="tentang" class="l-sec" style="background:var(--sf)"><div class="w l-about">${
            hasImg(ctx, c.about.imageMediaId) ? html`<div class="ph">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""
          }<div><div class="l-title" style="text-align:left;justify-items:start;margin-bottom:28px"><span>Tentang</span><h2>${c.about.title ?? "Kisah Kami"}</h2></div>${paras(
            c.about.body,
            "lead",
          )}</div></div></section>`
        : ""
    }${
      s.gallery
        ? html`<section id="galeri" class="l-sec"><div class="w"><div class="l-title"><span>Galeri</span><h2>${c.gallery.title ?? "Momen"}</h2></div><div class="l-gal">${c.gallery.items
            .filter((g) => ctx.media.has(g.mediaId))
            .map((g) => img(ctx, g.mediaId, "", g.caption ?? c.business.name))}</div></div></section>`
        : ""
    }${
      s.testimonials
        ? html`<section class="l-sec" style="padding-top:0"><div class="w"><div class="l-quote">${c.testimonials.items.map(
            (q) => html`<blockquote><p>“${q.text}”</p><cite>${q.name}</cite></blockquote>`,
          )}</div></div></section>`
        : ""
    }${
      s.contact
        ? html`<section id="kontak" class="l-sec" style="border-top:1px solid var(--line)"><div class="w"><div class="l-info"><div><h3>Kunjungi</h3>${contactLines(ctx) ?? ""}${
            maps ? html`<p style="margin-top:16px"><a class="ask" href="${maps}" target="_blank" rel="noopener" style="font-size:.75rem;letter-spacing:.2em;text-transform:uppercase">Petunjuk arah</a></p>` : ""
          }</div><div><h3>Jam</h3>${hoursList(ctx) ?? ""}</div><div><h3>Ikuti</h3>${socialLinks(ctx) ?? ""}</div></div>${
            mapEmbed(ctx) ? html`<div style="margin-top:56px">${mapEmbed(ctx)}</div>` : ""
          }</div></section>`
        : ""
    }</main>${footer(ctx)}${waFloat(ctx) ?? ""}`;
  },
};
