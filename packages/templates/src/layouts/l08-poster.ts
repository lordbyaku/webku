import { html } from "@umkm/shared";
import {
  art, initial, contactLines, ctaButton, footer, hasImg, hoursList, img, mapEmbed, mapsHref, navBar, orderHref, paras, price,
  sectionsPresent, socialLinks, stars, wa, waFloat, WA_ICON, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

const BADGE: Record<string, string> = { terlaris: "Terlaris!", baru: "Baru!", promo: "Promo!" };

/** Poster Promo — huruf raksasa, pita berjalan, kartu bergaris tebal dan stiker. */
export const L08: LayoutDef = {
  id: "L08",
  name: "Poster Promo",
  products: "grid",
  css: `
.p-nav{background:var(--p);color:var(--on-p)}
.p-nav .nav-cta{background:var(--tx);color:var(--bg)}
.p-hero{background:var(--p);color:var(--on-p);padding:clamp(24px,5vw,56px) 0 clamp(48px,7vw,80px);overflow:hidden}
.p-hero-in{display:grid;gap:36px;align-items:center}
.p-hero h1{font-size:clamp(3.4rem,15vw,9.5rem);line-height:.86;letter-spacing:var(--dt);text-transform:uppercase}
.p-hero .sub{font-size:1.15rem;max-width:28em;margin:22px 0 28px;opacity:.92}
.p-hero .btn{background:var(--tx);color:var(--bg)}
.p-sticker{display:inline-grid;place-items:center;text-align:center;width:128px;height:128px;border-radius:50%;background:var(--ac);color:var(--on-ac);font:800 .95rem/1.15 var(--fb);padding:16px;transform:rotate(-12deg);margin-bottom:18px;box-shadow:0 10px 0 -4px rgba(0,0,0,.18)}
.p-shot{position:relative;aspect-ratio:1;border:3px solid var(--tx);border-radius:var(--r);overflow:hidden;transform:rotate(2.5deg);background:var(--sf);box-shadow:12px 12px 0 var(--tx);max-width:520px;width:100%;justify-self:center}
.p-shot img{width:100%;height:100%;object-fit:cover}
.p-shot .art-stripe i:nth-child(1){background:var(--bg)}
.p-shot .art b{font-size:clamp(5rem,30vw,11rem);color:var(--p);opacity:1}
.p-tape{background:var(--tx);color:var(--bg);overflow:hidden;white-space:nowrap;border-block:3px solid var(--tx)}
.p-tape div{display:inline-flex;gap:40px;padding:14px 0;animation:tape 26s linear infinite;font-family:var(--fd);font-weight:var(--dw);font-size:clamp(1.2rem,3vw,1.8rem);text-transform:uppercase;letter-spacing:.02em}
.p-tape span::after{content:"✸";margin-left:40px;color:var(--p)}
@keyframes tape{to{transform:translateX(-50%)}}
.p-sec{padding:clamp(56px,8vw,104px) 0}
.p-h2{font-size:clamp(2.6rem,9vw,5.4rem);line-height:.9;text-transform:uppercase;margin-bottom:clamp(28px,4vw,48px)}
.p-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.p-card{position:relative;display:flex;flex-direction:column;border:2.5px solid var(--tx);border-radius:var(--r);background:var(--bg);overflow:hidden;transition:transform .2s,box-shadow .2s}
.p-card:hover{transform:translate(-3px,-3px);box-shadow:6px 6px 0 var(--tx)}
.p-card .ph{position:relative;aspect-ratio:1;border-bottom:2.5px solid var(--tx);background:var(--sf)}
.p-card .ph img{width:100%;height:100%;object-fit:cover}
.p-card .mono{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);font-size:4rem;color:var(--p);text-transform:uppercase;background:repeating-linear-gradient(-45deg,var(--sf) 0 12px,var(--tint) 12px 24px)}
.p-stk{position:absolute;top:10px;right:10px;background:var(--ac);color:var(--on-ac);font:800 .75rem/1 var(--fb);padding:9px 12px;border-radius:99px;transform:rotate(6deg);border:2px solid var(--tx)}
.p-body{padding:14px;display:flex;flex-direction:column;gap:6px;flex:1}
.p-body h3{font-family:var(--fb);font-weight:800;font-size:1.02rem;letter-spacing:0;text-transform:none;line-height:1.25}
.p-body .price{font-family:var(--fd);font-weight:var(--dw);font-size:clamp(1.5rem,4vw,2rem);line-height:1;color:var(--pt);letter-spacing:var(--dt)}
.p-body p{font-size:.85rem;color:var(--mu)}
.p-order{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border-radius:calc(var(--r)*.6);background:var(--tx);color:var(--bg);font-weight:800;font-size:.9rem;text-decoration:none}
.p-order svg{width:16px;height:16px;fill:currentColor}
.p-about{display:grid;gap:32px;align-items:center;border:2.5px solid var(--tx);border-radius:var(--r);padding:clamp(24px,4vw,48px);background:var(--sf)}
.p-about p{font-size:1.1rem}
.p-about p+p{margin-top:12px}
.p-about .ph{border:2.5px solid var(--tx);border-radius:var(--r);overflow:hidden}
.p-gal{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.p-gal img{aspect-ratio:1;object-fit:cover;width:100%;border:2.5px solid var(--tx);border-radius:var(--r)}
.p-rev{display:grid;gap:16px}
.p-rev blockquote{margin:0;padding:22px;border:2.5px solid var(--tx);border-radius:var(--r);background:var(--bg);box-shadow:6px 6px 0 var(--p)}
.p-rev p{font-weight:600;margin:8px 0 12px}
.p-rev cite{font-style:normal;font-weight:800}
.p-info{background:var(--tx);color:var(--bg)}
.p-info .p-h2{color:var(--p)}
.p-info-grid{display:grid;gap:36px}
.p-info .hours div{border-color:color-mix(in srgb,var(--bg) 20%,transparent)}
.p-info .contact li span{opacity:.6}
.p-info .socials a{border-color:color-mix(in srgb,var(--bg) 30%,transparent)}
.p-info .btn{background:var(--p);color:var(--on-p)}
.p-info .map{margin-top:32px}
.p-info + .foot{border:0}
@media(min-width:880px){
.p-hero-in{grid-template-columns:1.3fr 1fr}
.p-grid{grid-template-columns:repeat(4,1fr);gap:22px}
.p-about{grid-template-columns:1.2fr 1fr}
.p-gal{grid-template-columns:repeat(4,1fr)}
.p-rev{grid-template-columns:repeat(3,1fr)}
.p-info-grid{grid-template-columns:repeat(3,1fr)}
}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const maps = mapsHref(ctx);
    const tape = [c.business.tagline ?? c.business.name, c.hero.ctaText ?? "Pesan sekarang", c.business.name, "Pesan via WhatsApp"];
    const tapeHtml = html`${[...tape, ...tape].map((t) => html`<span>${t}</span>`)}`;
    return html`${navBar(ctx, "p-nav")}<main id="top"><section class="p-hero"><div class="w p-hero-in"><div>${
      c.business.tagline ? html`<div class="p-sticker">${c.business.tagline}</div>` : ""
    }<h1>${c.hero.title}</h1>${c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : ""}${ctaButton(ctx) ?? ""}</div><div class="p-shot">${
      img(ctx, c.hero.imageMediaId, "", c.hero.title, true) ?? art("stripe", initial(c.business.name))
    }</div></div></section><div class="p-tape" aria-hidden="true"><div>${tapeHtml}</div></div>${
      s.products
        ? html`<section id="produk" class="p-sec"><div class="w"><h2 class="p-h2">${c.products.title ?? "Produk"}</h2><div class="p-grid">${c.products.items.map((p) => {
            const href = orderHref(ctx, p);
            return html`<article class="p-card${p.available ? "" : " is-sold"}"><div class="ph">${
              img(ctx, p.imageMediaId, "", p.name) ?? html`<div class="mono" aria-hidden="true">${p.name.trim()[0] ?? "•"}</div>`
            }${p.badge ? html`<span class="p-stk">${BADGE[p.badge]}</span>` : ""}</div><div class="p-body">${price(p) ? html`<span class="price">${price(p)}</span>` : ""}<h3>${p.name}</h3>${
              p.description ? html`<p>${p.description}</p>` : ""
            }${href ? html`<a class="p-order" href="${href}" target="_blank" rel="noopener">${WA_ICON}Pesan</a>` : p.available ? "" : html`<span class="p-order" style="opacity:.5">Habis</span>`}</div></article>`;
          })}</div></div></section>`
        : ""
    }${
      s.about
        ? html`<section id="tentang" class="p-sec" style="padding-top:0"><div class="w"><div class="p-about"><div><h2 class="p-h2" style="margin-bottom:20px">${c.about.title ?? "Tentang Kami"}</h2>${paras(
            c.about.body,
          )}</div>${hasImg(ctx, c.about.imageMediaId) ? html`<div class="ph">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""}</div></div></section>`
        : ""
    }${
      s.gallery
        ? html`<section id="galeri" class="p-sec" style="padding-top:0"><div class="w"><h2 class="p-h2">${c.gallery.title ?? "Galeri"}</h2><div class="p-gal">${c.gallery.items
            .filter((g) => ctx.media.has(g.mediaId))
            .map((g) => img(ctx, g.mediaId, "", g.caption ?? c.business.name))}</div></div></section>`
        : ""
    }${
      s.testimonials
        ? html`<section class="p-sec" style="padding-top:0"><div class="w"><h2 class="p-h2">${c.testimonials.title ?? "Kata Mereka"}</h2><div class="p-rev">${c.testimonials.items.map(
            (q) => html`<blockquote>${stars(q.rating)}<p>${q.text}</p><cite>${q.name}</cite></blockquote>`,
          )}</div></div></section>`
        : ""
    }${
      s.contact
        ? html`<section id="kontak" class="p-sec p-info"><div class="w"><h2 class="p-h2">Gas ke sini</h2><div class="p-info-grid"><div>${contactLines(ctx) ?? ""}<div class="actions" style="margin-top:24px">${
            wa(ctx) ? html`<a class="btn" href="${wa(ctx)!}" target="_blank" rel="noopener">${WA_ICON}<span>Chat sekarang</span></a>` : ""
          }${maps ? html`<a class="btn btn-o" href="${maps}" target="_blank" rel="noopener">Petunjuk arah</a>` : ""}</div></div><div>${hoursList(ctx) ?? ""}</div><div>${socialLinks(ctx) ?? ""}</div></div>${
            mapEmbed(ctx) ?? ""
          }</div></section>`
        : ""
    }</main>${footer(ctx)}${waFloat(ctx) ?? ""}`;
  },
};
