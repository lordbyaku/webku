import { html } from "@umkm/shared";
import {
  art, contactLines, ctaButton, footer, hasImg, hoursList, img, mapEmbed, mapsHref, navBar, orderHref, paras, price, badge,
  sectionsPresent, socialLinks, stars, waFloat, WA_ICON, PIN, groupedHours, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

/** Katalog — toko modern: banner bulat, kartu produk rapat dengan tombol pesan. */
export const L03: LayoutDef = {
  id: "L03",
  name: "Katalog",
  products: "grid",
  css: `
.k-nav{position:sticky;top:0;z-index:20;background:var(--bg);box-shadow:0 1px 0 var(--line)}
.k-hero{padding:16px 0 8px}
.k-banner{position:relative;display:grid;border-radius:calc(var(--r)*1.4);overflow:hidden;background:var(--p);color:var(--on-p);min-height:340px;isolation:isolate}
.k-copy{position:relative;z-index:1;padding:clamp(28px,5vw,56px);display:flex;flex-direction:column;justify-content:center;gap:18px}
.k-copy .k-pill{align-self:flex-start;background:var(--on-p);color:var(--p);font-weight:700;font-size:.82rem;padding:7px 14px;border-radius:99px}
.k-copy h1{font-size:clamp(2.3rem,6.6vw,4.4rem)}
.k-copy .sub{opacity:.88;max-width:28em;font-size:1.08rem}
.k-copy .btn{background:var(--on-p);color:var(--p);align-self:flex-start}
.k-visual{position:relative;min-height:220px}
.k-visual img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.k-visual .art{background:color-mix(in srgb,var(--on-p) 12%,var(--p))}
.k-visual .art i:nth-child(1){background:var(--ac)}
.k-visual .art i:nth-child(2){background:var(--on-p);opacity:.25}
.k-facts{display:flex;gap:10px;overflow-x:auto;padding:16px 0 4px;scrollbar-width:none}
.k-facts li{flex:none;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:99px;background:var(--sf);font-size:.9rem;font-weight:600}
.k-facts svg{width:17px;height:17px;fill:none}
.k-facts .dot{width:8px;height:8px;border-radius:50%;background:#2fa65a}
.k-sec{padding:clamp(48px,7vw,88px) 0}
.k-head{display:flex;justify-content:space-between;align-items:baseline;gap:16px;margin-bottom:24px}
.k-head h2{font-size:clamp(1.8rem,4.6vw,2.8rem)}
.k-head span{color:var(--mu);font-weight:600;font-size:.95rem}
.k-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.k-card{display:flex;flex-direction:column;background:var(--bg);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;transition:box-shadow .25s,transform .25s}
.k-card:hover{box-shadow:var(--shadow);transform:translateY(-3px)}
.k-ph{position:relative;aspect-ratio:1;background:var(--sf)}
.k-ph img{width:100%;height:100%;object-fit:cover}
.k-ph .tag{position:absolute;top:10px;left:10px}
.k-mono{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);font-weight:var(--dw);font-size:3rem;color:var(--pt);background:radial-gradient(circle,var(--line) 1px,transparent 1.2px) 0 0/14px 14px,var(--sf)}
.k-body{display:flex;flex-direction:column;gap:6px;padding:12px 14px 14px;flex:1}
.k-body h3{font-family:var(--fb);font-weight:650;font-size:.98rem;line-height:1.35;letter-spacing:0;text-transform:none;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.k-body .price{font-weight:800;font-size:1.08rem;color:var(--tx)}
.k-body p{font-size:.85rem;color:var(--mu);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.k-add{margin-top:auto;display:flex;align-items:center;justify-content:center;gap:8px;min-height:42px;border-radius:calc(var(--r)*.7);background:var(--p);color:var(--on-p);font-weight:700;font-size:.9rem;text-decoration:none}
.k-add svg{width:16px;height:16px;fill:currentColor}
.k-add.off{background:var(--sf);color:var(--mu)}
.k-split{display:grid;gap:28px;align-items:center;background:var(--sf);border-radius:calc(var(--r)*1.4);padding:clamp(24px,4vw,48px)}
.k-split h2{font-size:clamp(1.8rem,4.6vw,2.6rem);margin-bottom:16px}
.k-split p+p{margin-top:12px}
.k-split .ph{border-radius:var(--r);overflow:hidden;aspect-ratio:4/3}
.k-split .ph img{width:100%;height:100%;object-fit:cover}
.k-gal{display:grid;grid-auto-flow:column;scroll-padding-inline:2px;grid-auto-columns:min(62%,260px);gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.k-gal figure{margin:0;scroll-snap-align:start}
.k-gal img{aspect-ratio:1;width:100%;object-fit:cover;border-radius:var(--r)}
.k-gal figcaption{font-size:.85rem;color:var(--mu);margin-top:6px}
.k-rev{display:grid;grid-auto-flow:column;grid-auto-columns:min(84%,340px);gap:14px;overflow-x:auto;scrollbar-width:none}
.k-rev blockquote{margin:0;padding:22px;border-radius:var(--r);background:var(--bg);border:1px solid var(--line);display:flex;flex-direction:column;gap:12px}
.k-rev cite{font-style:normal;font-weight:700}
.k-info{display:grid;gap:16px}
.k-box{border:1px solid var(--line);border-radius:var(--r);padding:24px}
.k-box h3{font-family:var(--fb);font-size:1.05rem;font-weight:750;letter-spacing:0;text-transform:none;margin-bottom:14px}
@media(min-width:720px){.k-grid{grid-template-columns:repeat(3,1fr)}}
@media(min-width:880px){
.k-banner{grid-template-columns:1.1fr 1fr}
.k-grid{grid-template-columns:repeat(4,1fr);gap:20px}
.k-split{grid-template-columns:1fr 1fr}
.k-info{grid-template-columns:repeat(3,1fr)}
.k-gal{grid-auto-flow:row;grid-template-columns:repeat(4,1fr);overflow:visible}
.k-rev{grid-auto-flow:row;grid-template-columns:repeat(3,1fr);overflow:visible}
}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const maps = mapsHref(ctx);
    const open = c.sections.hours ? groupedHours(c).find((r) => !r.closed) : null;
    const facts: ReturnType<typeof html>[] = [];
    if (open) facts.push(html`<li><span class="dot"></span>${open.label} · ${open.value}</li>`);
    if (c.contact.address) facts.push(html`<li>${PIN}${c.contact.address.split(/[,\n]/)[0]}</li>`);
    if (c.contact.whatsapp) facts.push(html`<li>Pesan cepat via WhatsApp</li>`);
    return html`${navBar(ctx, "k-nav")}<main id="top"><section class="k-hero"><div class="w"><div class="k-banner"><div class="k-copy">${
      c.business.tagline ? html`<span class="k-pill">${c.business.tagline}</span>` : ""
    }<h1>${c.hero.title}</h1>${c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : ""}${ctaButton(ctx) ?? ""}</div><div class="k-visual">${
      img(ctx, c.hero.imageMediaId, "", c.hero.title, true) ?? art("orb")
    }</div></div>${facts.length ? html`<ul class="k-facts">${facts}</ul>` : ""}</div></section>${
      s.products
        ? html`<section id="produk" class="k-sec"><div class="w"><div class="k-head"><h2>${c.products.title ?? "Produk"}</h2><span>${c.products.items.length} pilihan</span></div><div class="k-grid">${c.products.items.map((p) => {
            const href = orderHref(ctx, p);
            return html`<article class="k-card${p.available ? "" : " is-sold"}"><div class="k-ph">${
              img(ctx, p.imageMediaId, "", p.name) ?? html`<div class="k-mono" aria-hidden="true">${p.name.trim()[0] ?? "•"}</div>`
            }${badge(p)}</div><div class="k-body"><h3>${p.name}</h3>${price(p) ? html`<span class="price">${price(p)}</span>` : ""}${p.description ? html`<p>${p.description}</p>` : ""}${
              href ? html`<a class="k-add" href="${href}" target="_blank" rel="noopener">${WA_ICON}Pesan</a>` : p.available ? "" : html`<span class="k-add off">Stok habis</span>`
            }</div></article>`;
          })}</div></div></section>`
        : ""
    }${
      s.about
        ? html`<section id="tentang" class="k-sec" style="padding-top:0"><div class="w"><div class="k-split"><div><h2>${c.about.title ?? "Tentang Kami"}</h2>${paras(c.about.body)}</div>${
            hasImg(ctx, c.about.imageMediaId) ? html`<div class="ph">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""
          }</div></div></section>`
        : ""
    }${
      s.gallery
        ? html`<section id="galeri" class="k-sec" style="padding-top:0"><div class="w"><div class="k-head"><h2>${c.gallery.title ?? "Galeri"}</h2></div><div class="k-gal">${c.gallery.items
            .filter((g) => ctx.media.has(g.mediaId))
            .map((g) => html`<figure>${img(ctx, g.mediaId, "", g.caption ?? c.business.name)}${g.caption ? html`<figcaption>${g.caption}</figcaption>` : ""}</figure>`)}</div></div></section>`
        : ""
    }${
      s.testimonials
        ? html`<section class="k-sec" style="padding-top:0"><div class="w"><div class="k-head"><h2>${c.testimonials.title ?? "Ulasan"}</h2></div><div class="k-rev">${c.testimonials.items.map(
            (q) => html`<blockquote>${stars(q.rating)}<p>${q.text}</p><cite>${q.name}</cite></blockquote>`,
          )}</div></div></section>`
        : ""
    }${
      s.contact
        ? html`<section id="kontak" class="k-sec" style="padding-top:0"><div class="w"><div class="k-head"><h2>Info toko</h2></div><div class="k-info"><div class="k-box"><h3>Kontak</h3>${contactLines(ctx) ?? ""}${
            maps ? html`<p style="margin-top:18px"><a class="lnk" href="${maps}" target="_blank" rel="noopener">${PIN} Petunjuk arah</a></p>` : ""
          }</div><div class="k-box"><h3>Jam buka</h3>${hoursList(ctx) ?? ""}</div><div class="k-box"><h3>Temukan kami</h3>${socialLinks(ctx) ?? html`<p>Chat kami lewat WhatsApp.</p>`}</div></div>${
            mapEmbed(ctx) ? html`<div style="margin-top:16px">${mapEmbed(ctx)}</div>` : ""
          }</div></section>`
        : ""
    }</main>${footer(ctx)}${waFloat(ctx) ?? ""}`;
  },
};
