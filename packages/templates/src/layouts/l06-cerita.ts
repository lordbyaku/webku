import { html } from "@umkm/shared";
import {
  accentTitle, art, contactLines, ctaButton, footer, hasImg, hoursList, img, mapEmbed, mapsHref, navBar, orderHref, paras, price,
  badge, sectionsPresent, socialLinks, stars, waFloat, ARROW, PIN, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

/** Cerita — bacaan panjang yang hangat: judul besar di tengah, kisah usaha lebih dulu. */
export const L06: LayoutDef = {
  id: "L06",
  name: "Cerita",
  products: "rows",
  css: `
.c-nav{background:var(--bg)}
.c-hero{padding:clamp(48px,9vw,120px) 0 0;text-align:center}
.c-hero .w{display:grid;justify-items:center;gap:24px;max-width:900px}
.c-hero .kick{display:inline-flex;align-items:center;gap:10px;font-weight:600;color:var(--pt);font-size:.95rem}
.c-hero .kick::before,.c-hero .kick::after{content:"";width:24px;height:1px;background:currentColor}
.c-hero h1{font-size:clamp(2.8rem,9.5vw,6.6rem);line-height:.96}
.c-hero h1 em{color:var(--pt)}
.c-hero .sub{font-size:1.15rem;color:var(--mu);max-width:32em}
.c-cover{position:relative;width:100%;margin-top:clamp(40px,7vw,80px);height:clamp(300px,58vw,640px);border-radius:clamp(20px,4vw,48px) clamp(20px,4vw,48px) 0 0;overflow:hidden;background:var(--sf)}
.c-cover img{width:100%;height:100%;object-fit:cover}
.c-cover.empty{height:clamp(180px,30vw,320px)}
.c-sec{padding:clamp(64px,9vw,120px) 0}
.c-read{max-width:680px;margin:auto}
.c-read h2{font-size:clamp(2.2rem,6vw,3.6rem);margin-bottom:28px}
.c-read p{font-size:1.15rem;line-height:1.8}
.c-read p+p{margin-top:20px}
.c-read .drop::first-letter{float:left;font-family:var(--fd);font-weight:var(--dw);font-size:4.8em;line-height:.8;padding:8px 14px 0 0;color:var(--pt)}
.c-wide{margin:48px auto 0;max-width:980px;border-radius:var(--r);overflow:hidden}
.c-wide img{width:100%}
.c-band{background:var(--sf)}
.c-title{text-align:center;margin-bottom:clamp(32px,5vw,56px)}
.c-title h2{font-size:clamp(2.1rem,5.6vw,3.4rem)}
.c-mason{columns:2 180px;column-gap:14px}
.c-mason figure{margin:0 0 14px;break-inside:avoid}
.c-mason img{width:100%;border-radius:var(--r)}
.c-mason figcaption{font-family:var(--fd);font-style:italic;color:var(--mu);margin-top:6px;font-size:.95rem;text-transform:none}
.c-list{display:grid;gap:16px;max-width:860px;margin:auto}
.c-item{display:grid;grid-template-columns:92px 1fr;gap:18px;align-items:center;padding:16px;background:var(--bg);border-radius:var(--r)}
.c-item .ph{position:relative;width:92px;height:92px;border-radius:calc(var(--r)*.7);overflow:hidden;background:var(--tint)}
.c-item .ph img{width:100%;height:100%;object-fit:cover}
.c-item .mono{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);font-size:2.2rem;color:var(--pt)}
.c-item h3{font-size:1.25rem;line-height:1.2}
.c-item .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:6px}
.c-item .price{font-weight:700;color:var(--pt)}
.c-item p{color:var(--mu);font-size:.92rem;margin-top:4px}
.c-item a{font-size:.9rem}
.c-quote{max-width:820px;margin:auto;text-align:center;display:grid;gap:44px}
.c-quote blockquote{margin:0}
.c-quote p{font-family:var(--fd);font-weight:var(--dw);font-size:clamp(1.5rem,3.6vw,2.3rem);line-height:1.28;text-transform:none}
.c-quote p::before{content:"“";display:block;font-size:3.2em;line-height:.6;color:var(--pt);margin-bottom:6px}
.c-quote cite{display:block;margin-top:14px;font-style:normal;color:var(--mu);font-weight:600}
.c-info{display:grid;gap:36px;max-width:980px;margin:auto}
.c-info h3{font-size:1.35rem;margin-bottom:14px}
@media(min-width:880px){.c-mason{columns:3}.c-info{grid-template-columns:repeat(3,1fr)}}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const maps = mapsHref(ctx);
    return html`${navBar(ctx, "c-nav")}<main id="top"><section class="c-hero"><div class="w">${
      c.business.tagline ? html`<span class="kick">${c.business.tagline}</span>` : ""
    }<h1>${accentTitle(ctx, c.hero.title)}</h1>${c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : ""}<div class="actions" style="justify-content:center">${ctaButton(ctx) ?? ""}</div></div><div class="w"><div class="c-cover${hasImg(ctx, c.hero.imageMediaId) ? "" : " empty"}">${
      img(ctx, c.hero.imageMediaId, "", c.hero.title, true) ?? art("arch")
    }</div></div></section>${
      s.about
        ? html`<section id="tentang" class="c-sec"><div class="w"><div class="c-read"><h2>${c.about.title ?? "Cerita Kami"}</h2>${paras(c.about.body, "drop")}</div>${
            hasImg(ctx, c.about.imageMediaId) ? html`<div class="c-wide">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""
          }</div></section>`
        : ""
    }${
      s.gallery
        ? html`<section id="galeri" class="c-sec" style="padding-top:0"><div class="w"><div class="c-title"><h2>${c.gallery.title ?? "Galeri"}</h2></div><div class="c-mason">${c.gallery.items
            .filter((g) => ctx.media.has(g.mediaId))
            .map((g) => html`<figure>${img(ctx, g.mediaId, "", g.caption ?? c.business.name)}${g.caption ? html`<figcaption>${g.caption}</figcaption>` : ""}</figure>`)}</div></div></section>`
        : ""
    }${
      s.products
        ? html`<section id="produk" class="c-sec c-band"><div class="w"><div class="c-title"><h2>${c.products.title ?? "Karya Kami"}</h2></div><div class="c-list">${c.products.items.map((p) => {
            const href = orderHref(ctx, p);
            return html`<article class="c-item${p.available ? "" : " is-sold"}"><div class="ph">${
              img(ctx, p.imageMediaId, "", p.name) ?? html`<div class="mono" aria-hidden="true">${p.name.trim()[0] ?? "•"}</div>`
            }</div><div><h3>${p.name}</h3>${p.description ? html`<p>${p.description}</p>` : ""}<div class="row">${price(p) ? html`<span class="price">${price(p)}</span>` : ""}${badge(p) ?? ""}${
              href ? html`<a class="lnk" href="${href}" target="_blank" rel="noopener">Pesan ${ARROW}</a>` : p.available ? "" : html`<span class="sold">Stok habis</span>`
            }</div></div></article>`;
          })}</div></div></section>`
        : ""
    }${
      s.testimonials
        ? html`<section class="c-sec"><div class="w"><div class="c-quote">${c.testimonials.items.map(
            (q) => html`<blockquote><p>${q.text}</p><cite>${stars(q.rating)} · ${q.name}</cite></blockquote>`,
          )}</div></div></section>`
        : ""
    }${
      s.contact
        ? html`<section id="kontak" class="c-sec c-band"><div class="w"><div class="c-title"><h2>Mampir ke tempat kami</h2></div><div class="c-info"><div><h3>Alamat & kontak</h3>${contactLines(ctx) ?? ""}${
            maps ? html`<p style="margin-top:16px"><a class="lnk" href="${maps}" target="_blank" rel="noopener">${PIN} Petunjuk arah</a></p>` : ""
          }</div><div><h3>Jam buka</h3>${hoursList(ctx) ?? ""}</div><div><h3>Ikuti cerita kami</h3>${socialLinks(ctx) ?? ""}</div></div>${
            mapEmbed(ctx) ? html`<div style="margin:40px auto 0;max-width:980px">${mapEmbed(ctx)}</div>` : ""
          }</div></section>`
        : ""
    }</main>${footer(ctx)}${waFloat(ctx) ?? ""}`;
  },
};
