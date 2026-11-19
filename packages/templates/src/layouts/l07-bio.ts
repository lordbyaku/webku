import { html } from "@umkm/shared";
import {
  contactLines, footer, hasImg, hoursList, img, initial, mapsHref, orderHref, paras, price, sectionsPresent, socials, stars, wa,
  WA_ICON, PIN, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

/** Bio-link — satu kolom ala link-in-bio: avatar, tombol bertumpuk, daftar ringkas. */
export const L07: LayoutDef = {
  id: "L07",
  name: "Bio-link",
  products: "stack",
  css: `
body{background:radial-gradient(120% 60% at 50% -10%,var(--tint),transparent 70%),var(--bg);min-height:100vh}
.b-wrap{width:min(560px,calc(100% - 32px));margin:auto;padding:clamp(40px,8vw,72px) 0 24px}
.b-head{text-align:center;display:grid;justify-items:center;gap:12px}
.b-ava{position:relative;width:112px;height:112px;border-radius:50%;overflow:hidden;background:var(--p);color:var(--on-p);display:grid;place-items:center;font-family:var(--fd);font-weight:var(--dw);font-size:3rem;box-shadow:0 0 0 5px var(--bg),0 0 0 7px var(--p)}
.b-ava img{width:100%;height:100%;object-fit:cover}
.b-head h1{font-size:clamp(1.9rem,6vw,2.5rem);margin-top:10px}
.b-head .tagl{color:var(--mu);font-size:1.02rem;max-width:26em}
.b-head .sub{font-size:.95rem;max-width:28em}
.b-cover{margin-top:28px;border-radius:calc(var(--r)*1.2);overflow:hidden;aspect-ratio:16/10;box-shadow:var(--shadow)}
.b-cover img{width:100%;height:100%;object-fit:cover}
.b-links{display:grid;gap:12px;margin-top:28px}
.b-btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:58px;padding:0 22px;border-radius:min(var(--r),999px);background:var(--bg);color:var(--tx);border:1.5px solid var(--line);font-weight:700;text-decoration:none;transition:transform .2s,box-shadow .2s}
.b-btn:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.b-btn.main{background:var(--p);color:var(--on-p);border-color:var(--p)}
.b-btn svg{width:20px;height:20px;fill:currentColor}
.b-btn svg[fill=none],.b-btn .pin svg{fill:none}
.b-sec{margin-top:44px}
.b-sec h2{font-size:1.45rem;margin-bottom:16px;text-align:center}
.b-items{display:grid;gap:10px}
.b-item{display:grid;grid-template-columns:64px 1fr auto;gap:14px;align-items:center;padding:10px;border-radius:var(--r);background:var(--bg);border:1px solid var(--line)}
.b-item .ph{position:relative;width:64px;height:64px;border-radius:calc(var(--r)*.7);overflow:hidden;background:var(--tint);display:grid;place-items:center;font-family:var(--fd);font-size:1.6rem;color:var(--pt)}
.b-item .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.b-item h3{font-family:var(--fb);font-size:1rem;font-weight:700;letter-spacing:0;text-transform:none;line-height:1.3}
.b-item .price{font-size:.92rem;font-weight:700;color:var(--pt)}
.b-item p{font-size:.84rem;color:var(--mu);line-height:1.4}
.b-item .go{display:inline-grid;place-items:center;width:42px;height:42px;border-radius:50%;background:var(--p);color:var(--on-p)}
.b-item .go svg{width:18px;height:18px;fill:currentColor}
.b-card{padding:22px;border-radius:var(--r);background:var(--bg);border:1px solid var(--line)}
.b-card p+p{margin-top:12px}
.b-card .ph{margin-top:16px;border-radius:calc(var(--r)*.8);overflow:hidden}
.b-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.b-gal img{aspect-ratio:1;object-fit:cover;width:100%;border-radius:calc(var(--r)*.5)}
.b-rev{display:grid;gap:10px}
.b-rev blockquote{margin:0;padding:18px;border-radius:var(--r);background:var(--sf)}
.b-rev p{margin:8px 0}
.b-rev cite{font-style:normal;font-weight:700;font-size:.92rem}
.b-wrap .foot{border:0;padding:40px 0 20px;text-align:center}
.b-wrap .foot-in{justify-content:center;width:auto}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const href = wa(ctx);
    const maps = mapsHref(ctx);
    const logo = img(ctx, c.business.logoMediaId, "", `Logo ${c.business.name}`, true);
    const links = socials(ctx);
    return html`<div class="b-wrap" id="top"><header class="b-head"><div class="b-ava">${logo ?? initial(c.business.name)}</div><h1>${c.business.name}</h1>${
      c.business.tagline ? html`<p class="tagl">${c.business.tagline}</p>` : ""
    }${c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : ""}</header>${
      hasImg(ctx, c.hero.imageMediaId) ? html`<div class="b-cover">${img(ctx, c.hero.imageMediaId, "", c.hero.title, true)}</div>` : ""
    }<nav class="b-links" aria-label="Tautan">${
      href ? html`<a class="b-btn main" href="${href}" target="_blank" rel="noopener">${WA_ICON}<span>${c.hero.ctaText ?? "Chat WhatsApp"}</span></a>` : ""
    }${s.products ? html`<a class="b-btn" href="#produk">Lihat ${(c.products.title ?? "produk").toLowerCase()}</a>` : ""}${
      maps ? html`<a class="b-btn" href="${maps}" target="_blank" rel="noopener"><span class="pin">${PIN}</span><span>Lokasi kami</span></a>` : ""
    }${links.map((l) => html`<a class="b-btn" href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`)}</nav><main>${
      s.products
        ? html`<section id="produk" class="b-sec"><h2>${c.products.title ?? "Produk"}</h2><div class="b-items">${c.products.items.map((p) => {
            const o = orderHref(ctx, p);
            return html`<article class="b-item${p.available ? "" : " is-sold"}"><div class="ph">${initial(p.name)}${img(ctx, p.imageMediaId, "", p.name) ?? ""}</div><div><h3>${p.name}</h3>${
              price(p) ? html`<div class="price">${price(p)}</div>` : ""
            }${p.description ? html`<p>${p.description}</p>` : ""}</div>${
              o ? html`<a class="go" href="${o}" target="_blank" rel="noopener" aria-label="Pesan ${p.name}">${WA_ICON}</a>` : p.available ? "" : html`<span class="sold">Habis</span>`
            }</article>`;
          })}</div></section>`
        : ""
    }${
      s.about
        ? html`<section id="tentang" class="b-sec"><h2>${c.about.title ?? "Tentang Kami"}</h2><div class="b-card">${paras(c.about.body)}${
            hasImg(ctx, c.about.imageMediaId) ? html`<div class="ph">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""
          }</div></section>`
        : ""
    }${
      s.gallery
        ? html`<section id="galeri" class="b-sec"><h2>${c.gallery.title ?? "Galeri"}</h2><div class="b-gal">${c.gallery.items
            .filter((g) => ctx.media.has(g.mediaId))
            .map((g) => img(ctx, g.mediaId, "", g.caption ?? c.business.name))}</div></section>`
        : ""
    }${
      s.testimonials
        ? html`<section class="b-sec"><h2>${c.testimonials.title ?? "Kata Pelanggan"}</h2><div class="b-rev">${c.testimonials.items.map(
            (q) => html`<blockquote>${stars(q.rating)}<p>${q.text}</p><cite>${q.name}</cite></blockquote>`,
          )}</div></section>`
        : ""
    }${
      s.contact
        ? html`<section id="kontak" class="b-sec"><h2>Info</h2><div class="b-card">${contactLines(ctx) ?? ""}${
            hoursList(ctx) ? html`<div style="margin-top:20px">${hoursList(ctx)}</div>` : ""
          }</div></section>`
        : ""
    }</main>${footer(ctx)}</div>`;
  },
};
