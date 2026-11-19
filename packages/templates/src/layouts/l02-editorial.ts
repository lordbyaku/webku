import { html } from "@umkm/shared";
import {
  accentTitle, art, contactLines, ctaButton, footer, hasImg, hoursList, img, mapEmbed, mapsHref, navBar, orderHref, paras,
  price, badge, sectionsPresent, socialLinks, soldOut, stars, waFloat, ARROW, PIN, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

/** Editorial — gaya majalah: judul besar, bingkai lengkung, produk berselang-seling. */
export const L02: LayoutDef = {
  id: "L02",
  name: "Editorial",
  products: "rows",
  css: `
.e-nav{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.e-hero{padding:clamp(40px,7vw,96px) 0 clamp(56px,8vw,110px)}
.e-hero-in{display:grid;gap:clamp(36px,6vw,72px);align-items:center}
.e-kicker{font-family:var(--fd);font-style:italic;font-size:1.15rem;color:var(--pt);margin-bottom:18px;text-transform:none}
.e-hero h1{font-size:clamp(2.7rem,8.4vw,6rem);line-height:.98;margin-bottom:24px}
.e-hero h1 em{color:var(--pt)}
.e-hero .sub{font-size:1.15rem;color:var(--mu);max-width:30em;margin-bottom:32px}
.e-frame{position:relative;max-width:440px;width:calc(100% - 10px);justify-self:center}
.e-frame::before{content:"";position:absolute;inset:14px -10px -14px 10px;border-radius:999px 999px var(--r) var(--r);background:var(--tint)}
.e-arch{position:relative;aspect-ratio:4/5;border-radius:999px 999px var(--r) var(--r);overflow:hidden;background:var(--sf)}
.e-arch img{width:100%;height:100%;object-fit:cover}
.e-sec{padding:clamp(64px,9vw,112px) 0;border-top:1px solid var(--line)}
.e-title{display:grid;gap:10px;margin-bottom:clamp(36px,5vw,64px)}
.e-title h2{font-size:clamp(2.2rem,5.6vw,3.8rem)}
.e-title p{color:var(--mu);max-width:36em}
.e-rows{display:grid;gap:clamp(40px,6vw,72px)}
.e-row{display:grid;gap:22px;align-items:center}
.e-row .ph{position:relative;aspect-ratio:4/3;border-radius:var(--r);overflow:hidden;background:var(--sf)}
.e-row .ph img{width:100%;height:100%;object-fit:cover}
.e-row .ph .tag{position:absolute;top:14px;left:14px}
.e-row .mono{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);font-style:italic;font-size:5rem;color:var(--pt);background:linear-gradient(135deg,var(--tint),var(--sf))}
.e-row h3{font-size:clamp(1.7rem,3.4vw,2.4rem);margin-bottom:10px}
.e-row .price{display:block;font-family:var(--fd);font-size:1.35rem;color:var(--pt);margin-bottom:12px}
.e-row p{color:var(--mu);margin-bottom:18px;max-width:30em}
.e-story{max-width:720px;margin:auto;font-size:1.12rem}
.e-story .drop::first-letter{float:left;font-family:var(--fd);font-weight:var(--dw);font-size:4.6em;line-height:.82;padding:6px 12px 0 0;color:var(--pt)}
.e-story p+p{margin-top:18px}
.e-story .ph{margin-top:40px;border-radius:var(--r);overflow:hidden}
.e-gal{display:grid;grid-template-columns:repeat(2,1fr);gap:clamp(10px,2vw,20px)}
.e-gal figure{margin:0}
.e-gal img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:var(--r)}
.e-gal figcaption{margin-top:8px;font-family:var(--fd);font-style:italic;color:var(--mu);text-transform:none}
.e-quotes{display:grid;gap:0}
.e-quote{margin:0;padding:28px 0;border-bottom:1px solid var(--line);display:grid;gap:12px}
.e-quote p{font-family:var(--fd);font-weight:var(--dw);font-size:clamp(1.35rem,2.8vw,1.9rem);line-height:1.3;text-transform:none}
.e-quote footer{color:var(--mu);font-weight:600;display:flex;gap:12px;align-items:center}
.e-info{display:grid;gap:36px}
.e-info>div{border-top:2px solid var(--tx);padding-top:18px}
.e-info h3{font-size:1.4rem;margin-bottom:16px}
.e-info .hours div:first-child{padding-top:0}
@media(min-width:880px){
.e-hero-in{grid-template-columns:1.25fr 1fr}
.e-row{grid-template-columns:1fr 1fr;gap:56px}
.e-row:nth-child(even) .ph{order:2}
.e-gal{grid-template-columns:repeat(3,1fr)}
.e-gal figure:nth-child(3n+2){margin-top:48px}
.e-quotes{grid-template-columns:1fr 1fr;column-gap:56px}
.e-info{grid-template-columns:repeat(3,1fr)}
.e-title{grid-template-columns:1fr 1fr;align-items:end}
}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const maps = mapsHref(ctx);
    return html`${navBar(ctx, "e-nav")}<main id="top"><section class="e-hero"><div class="w e-hero-in"><div>${
      c.business.tagline ? html`<div class="e-kicker">${c.business.tagline}</div>` : ""
    }<h1>${accentTitle(ctx, c.hero.title)}</h1>${c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : ""}<div class="actions">${ctaButton(ctx) ?? ""}</div></div><div class="e-frame"><div class="e-arch">${
      img(ctx, c.hero.imageMediaId, "", c.hero.title, true) ?? art("arch")
    }</div></div></div></section>${
      s.products
        ? html`<section id="produk" class="e-sec"><div class="w"><div class="e-title"><h2>${c.products.title ?? "Produk"}</h2>${
            c.hero.subtitle ? html`<p>${c.hero.subtitle}</p>` : ""
          }</div><div class="e-rows">${c.products.items.map((p) => {
            const href = orderHref(ctx, p);
            return html`<article class="e-row${p.available ? "" : " is-sold"}"><div class="ph">${
              img(ctx, p.imageMediaId, "", p.name) ?? html`<div class="mono" aria-hidden="true">${p.name.trim()[0] ?? "•"}</div>`
            }${badge(p)}</div><div><h3>${p.name}</h3>${price(p) ? html`<span class="price">${price(p)}</span>` : ""}${p.description ? html`<p>${p.description}</p>` : ""}${
              href ? html`<a class="lnk" href="${href}" target="_blank" rel="noopener">Pesan lewat WhatsApp ${ARROW}</a>` : soldOut(p)
            }</div></article>`;
          })}</div></div></section>`
        : ""
    }${
      s.about
        ? html`<section id="tentang" class="e-sec"><div class="w"><div class="e-title" style="text-align:center;justify-items:center;grid-template-columns:1fr"><h2>${c.about.title ?? "Tentang Kami"}</h2></div><div class="e-story">${paras(
            c.about.body,
            "drop",
          )}${hasImg(ctx, c.about.imageMediaId) ? html`<div class="ph">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""}</div></div></section>`
        : ""
    }${
      s.gallery
        ? html`<section id="galeri" class="e-sec"><div class="w"><div class="e-title"><h2>${c.gallery.title ?? "Galeri"}</h2></div><div class="e-gal">${c.gallery.items
            .filter((g) => ctx.media.has(g.mediaId))
            .map((g) => html`<figure>${img(ctx, g.mediaId, "", g.caption ?? c.business.name)}${g.caption ? html`<figcaption>${g.caption}</figcaption>` : ""}</figure>`)}</div></div></section>`
        : ""
    }${
      s.testimonials
        ? html`<section class="e-sec"><div class="w"><div class="e-title"><h2>${c.testimonials.title ?? "Kata Pelanggan"}</h2></div><div class="e-quotes">${c.testimonials.items.map(
            (q) => html`<blockquote class="e-quote"><p>“${q.text}”</p><footer>${stars(q.rating)}<span>${q.name}</span></footer></blockquote>`,
          )}</div></div></section>`
        : ""
    }${
      s.contact
        ? html`<section id="kontak" class="e-sec"><div class="w"><div class="e-title"><h2>Kunjungi kami</h2></div><div class="e-info"><div><h3>Kontak</h3>${contactLines(ctx) ?? ""}</div><div><h3>Jam buka</h3>${
            hoursList(ctx) ?? html`<p>Hubungi kami untuk jam buka.</p>`
          }</div><div><h3>Ikuti</h3>${socialLinks(ctx) ?? ""}${
            maps ? html`<p style="margin-top:20px"><a class="lnk" href="${maps}" target="_blank" rel="noopener">${PIN} Buka di Google Maps</a></p>` : ""
          }</div></div>${mapEmbed(ctx) ? html`<div style="margin-top:40px">${mapEmbed(ctx)}</div>` : ""}</div></section>`
        : ""
    }</main>${footer(ctx)}${waFloat(ctx) ?? ""}`;
  },
};
