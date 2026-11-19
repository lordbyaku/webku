import { html } from "@umkm/shared";
import {
  art, contactLines, ctaButton, footer, hasImg, hoursList, img, mapEmbed, mapsHref, navBar, orderHref, paras, price, badge,
  sectionsPresent, socialLinks, stars, waFloat, ARROW, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

/** Galeri — visual lebih dulu: mosaik foto, kartu potret, teks minimal. */
export const L05: LayoutDef = {
  id: "L05",
  name: "Galeri",
  products: "grid",
  css: `
.g-nav{position:sticky;top:0;z-index:20;background:var(--bg)}
.g-hero{padding:clamp(24px,5vw,56px) 0 clamp(48px,7vw,88px)}
.g-hero-in{display:grid;gap:clamp(28px,5vw,56px)}
.g-hero h1{font-size:clamp(3rem,11vw,7.6rem);line-height:.9}
.g-hero .row{display:grid;gap:22px;align-items:end}
.g-hero .sub{color:var(--mu);font-size:1.1rem;max-width:30em}
.g-mosaic{display:grid;grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr;gap:10px;height:clamp(320px,62vw,620px)}
.g-mosaic>*{position:relative;border-radius:var(--r);overflow:hidden;background:var(--sf)}
.g-mosaic>*:first-child{grid-row:span 2}
.g-mosaic img{width:100%;height:100%;object-fit:cover}
.g-sec{padding:clamp(56px,8vw,104px) 0}
.g-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:clamp(24px,4vw,44px);border-bottom:1px solid var(--line);padding-bottom:16px}
.g-head h2{font-size:clamp(2rem,5.4vw,3.4rem)}
.g-head span{color:var(--mu);font-variant-numeric:tabular-nums}
.g-mason{columns:2 160px;column-gap:10px}
.g-mason figure{margin:0 0 10px;break-inside:avoid;position:relative;border-radius:var(--r);overflow:hidden}
.g-mason img{width:100%}
.g-mason figcaption{position:absolute;inset:auto 0 0 0;padding:28px 14px 12px;color:#fff;font-size:.88rem;font-weight:600;background:linear-gradient(transparent,rgba(0,0,0,.65))}
.g-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:28px 14px}
.g-card .ph{position:relative;aspect-ratio:3/4;border-radius:var(--r);overflow:hidden;background:var(--sf);margin-bottom:12px}
.g-card .ph img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
.g-card:hover .ph img{transform:scale(1.05)}
.g-card .tag{position:absolute;left:10px;top:10px}
.g-card .mono{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);font-weight:var(--dw);font-size:3.4rem;color:var(--pt);background:linear-gradient(160deg,var(--sf),var(--tint))}
.g-card .top{display:flex;justify-content:space-between;gap:10px;align-items:baseline}
.g-card h3{font-family:var(--fb);font-weight:650;font-size:1rem;letter-spacing:0;text-transform:none;line-height:1.3}
.g-card .price{font-weight:600;font-size:.95rem}
.g-card p{color:var(--mu);font-size:.88rem;margin-top:4px}
.g-card a.order{display:inline-block;margin-top:8px;font-size:.88rem;font-weight:700;color:var(--pt);text-decoration:none;border-bottom:1.5px solid currentColor}
.g-about{display:grid;gap:32px;align-items:center}
.g-about h2{font-size:clamp(2rem,5vw,3.2rem);margin-bottom:18px}
.g-about p+p{margin-top:14px}
.g-about .ph{border-radius:var(--r);overflow:hidden;aspect-ratio:1}
.g-about .ph img{width:100%;height:100%;object-fit:cover}
.g-rev{display:grid;gap:14px}
.g-rev blockquote{margin:0;padding:24px;background:var(--sf);border-radius:var(--r)}
.g-rev p{margin:10px 0 14px;font-size:1.05rem}
.g-rev cite{font-style:normal;font-weight:700}
.g-info{display:grid;gap:36px}
.g-info h3{font-size:1.3rem;margin-bottom:14px}
@media(min-width:880px){
.g-hero .row{grid-template-columns:1fr auto}
.g-mason{columns:3}
.g-grid{grid-template-columns:repeat(4,1fr);gap:40px 20px}
.g-about{grid-template-columns:1fr 1fr;gap:64px}
.g-rev{grid-template-columns:repeat(3,1fr)}
.g-info{grid-template-columns:repeat(3,1fr)}
}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const maps = mapsHref(ctx);
    const galIds = c.gallery.items.filter((g) => ctx.media.has(g.mediaId)).map((g) => g.mediaId);
    const tiles = [c.hero.imageMediaId, ...galIds].filter((id): id is string => !!id && ctx.media.has(id)).slice(0, 3);
    const mosaic = [0, 1, 2].map((i) =>
      tiles[i] ? html`<div>${img(ctx, tiles[i], "", c.business.name, i === 0)}</div>` : html`<div>${art(i === 0 ? "grid" : i === 1 ? "orb" : "stripe")}</div>`,
    );
    return html`${navBar(ctx, "g-nav")}<main id="top"><section class="g-hero"><div class="w g-hero-in"><h1>${c.hero.title}</h1><div class="row">${
      c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : html`<span></span>`
    }<div class="actions">${ctaButton(ctx) ?? ""}</div></div><div class="g-mosaic">${mosaic}</div></div></section>${
      s.gallery
        ? html`<section id="galeri" class="g-sec" style="padding-top:0"><div class="w"><div class="g-head"><h2>${c.gallery.title ?? "Galeri"}</h2><span>${galIds.length} foto</span></div><div class="g-mason">${c.gallery.items
            .filter((g) => ctx.media.has(g.mediaId))
            .map((g) => html`<figure>${img(ctx, g.mediaId, "", g.caption ?? c.business.name)}${g.caption ? html`<figcaption>${g.caption}</figcaption>` : ""}</figure>`)}</div></div></section>`
        : ""
    }${
      s.products
        ? html`<section id="produk" class="g-sec"><div class="w"><div class="g-head"><h2>${c.products.title ?? "Koleksi"}</h2><span>${c.products.items.length} item</span></div><div class="g-grid">${c.products.items.map((p) => {
            const href = orderHref(ctx, p);
            return html`<article class="g-card${p.available ? "" : " is-sold"}"><div class="ph">${
              img(ctx, p.imageMediaId, "", p.name) ?? html`<div class="mono" aria-hidden="true">${p.name.trim()[0] ?? "•"}</div>`
            }${badge(p)}</div><div class="top"><h3>${p.name}</h3>${price(p) ? html`<span class="price">${price(p)}</span>` : ""}</div>${p.description ? html`<p>${p.description}</p>` : ""}${
              href ? html`<a class="order" href="${href}" target="_blank" rel="noopener">Tanya / pesan</a>` : p.available ? "" : html`<span class="sold">Stok habis</span>`
            }</article>`;
          })}</div></div></section>`
        : ""
    }${
      s.about
        ? html`<section id="tentang" class="g-sec" style="background:var(--sf)"><div class="w g-about">${
            hasImg(ctx, c.about.imageMediaId) ? html`<div class="ph">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""
          }<div><h2>${c.about.title ?? "Tentang Kami"}</h2>${paras(c.about.body)}</div></div></section>`
        : ""
    }${
      s.testimonials
        ? html`<section class="g-sec"><div class="w"><div class="g-head"><h2>${c.testimonials.title ?? "Ulasan"}</h2></div><div class="g-rev">${c.testimonials.items.map(
            (q) => html`<blockquote>${stars(q.rating)}<p>${q.text}</p><cite>${q.name}</cite></blockquote>`,
          )}</div></div></section>`
        : ""
    }${
      s.contact
        ? html`<section id="kontak" class="g-sec" style="padding-top:0"><div class="w"><div class="g-head"><h2>Kontak</h2></div><div class="g-info"><div>${contactLines(ctx) ?? ""}${
            maps ? html`<p style="margin-top:18px"><a class="lnk" href="${maps}" target="_blank" rel="noopener">Petunjuk arah ${ARROW}</a></p>` : ""
          }</div><div><h3>Jam buka</h3>${hoursList(ctx) ?? ""}</div><div><h3>Ikuti kami</h3>${socialLinks(ctx) ?? ""}</div></div>${
            mapEmbed(ctx) ? html`<div style="margin-top:36px">${mapEmbed(ctx)}</div>` : ""
          }</div></section>`
        : ""
    }</main>${footer(ctx)}${waFloat(ctx) ?? ""}`;
  },
};
