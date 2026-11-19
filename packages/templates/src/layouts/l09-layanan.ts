import { html } from "@umkm/shared";
import {
  art, contactLines, ctaButton, footer, groupedHours, hasImg, hoursList, img, initial, mapEmbed, mapsHref, navBar, orderHref,
  paras, price, badge, sectionsPresent, socialLinks, stars, wa, waFloat, WA_ICON, PIN, type Ctx,
} from "../parts";
import type { LayoutDef } from "./types";

const CHECK = html`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Layanan — profesional & tepercaya: kartu layanan dengan tombol booking, jam & lokasi menonjol. */
export const L09: LayoutDef = {
  id: "L09",
  name: "Layanan",
  products: "services",
  css: `
.v-nav{position:sticky;top:0;z-index:20;background:var(--bg);border-bottom:1px solid var(--line)}
.v-hero{padding:clamp(40px,7vw,96px) 0;background:linear-gradient(180deg,var(--sf),var(--bg))}
.v-hero-in{display:grid;gap:clamp(32px,5vw,64px);align-items:center}
.v-kick{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:99px;background:var(--bg);border:1px solid var(--line);font-size:.88rem;font-weight:650;margin-bottom:20px}
.v-kick i{width:8px;height:8px;border-radius:50%;background:#2fa65a}
.v-hero h1{font-size:clamp(2.5rem,7.2vw,4.8rem);margin-bottom:20px}
.v-hero .sub{font-size:1.15rem;color:var(--mu);max-width:30em;margin-bottom:28px}
.v-checks{display:grid;gap:10px;margin-top:28px}
.v-checks li{display:flex;gap:10px;align-items:center;font-weight:600}
.v-checks svg{width:22px;height:22px;padding:3px;border-radius:50%;background:var(--p);color:var(--on-p);flex:none}
.v-photo{position:relative;aspect-ratio:5/4;border-radius:calc(var(--r)*1.5);overflow:hidden;background:var(--sf);box-shadow:var(--shadow)}
.v-photo img{width:100%;height:100%;object-fit:cover}
.v-float{position:absolute;left:16px;bottom:16px;right:16px;display:flex;gap:12px;align-items:center;padding:14px 16px;border-radius:var(--r);background:var(--bg);box-shadow:var(--shadow);font-size:.92rem}
.v-float b{display:block}
.v-float span{color:var(--mu)}
.v-float svg{width:36px;height:36px;padding:8px;border-radius:50%;background:var(--tint);color:var(--pt);flex:none;fill:none}
.v-sec{padding:clamp(56px,8vw,104px) 0}
.v-title{max-width:640px;margin-bottom:clamp(28px,4vw,48px)}
.v-title h2{font-size:clamp(2rem,5vw,3.2rem)}
.v-title p{color:var(--mu);margin-top:10px}
.v-svc{display:grid;gap:16px}
.v-card{display:flex;flex-direction:column;gap:14px;padding:24px;border-radius:calc(var(--r)*1.2);background:var(--bg);border:1px solid var(--line);transition:border-color .2s,box-shadow .2s}
.v-card:hover{border-color:var(--p);box-shadow:var(--shadow)}
.v-top{display:flex;gap:14px;align-items:center}
.v-ico{width:56px;height:56px;border-radius:var(--r);background:var(--tint);color:var(--pt);display:grid;place-items:center;font-family:var(--fd);font-weight:var(--dw);font-size:1.5rem;overflow:hidden;flex:none}
.v-ico img{width:100%;height:100%;object-fit:cover}
.v-card h3{font-family:var(--fb);font-weight:750;font-size:1.15rem;letter-spacing:-.01em;text-transform:none;line-height:1.3}
.v-card p{color:var(--mu);font-size:.95rem}
.v-bottom{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:14px;border-top:1px dashed var(--line)}
.v-bottom .price{font-weight:800;font-size:1.1rem}
.v-bottom .price small{display:block;font-size:.72rem;font-weight:600;color:var(--mu);letter-spacing:.04em}
.v-book{display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:0 16px;border-radius:min(var(--r),999px);background:var(--p);color:var(--on-p);font-weight:700;font-size:.9rem;text-decoration:none}
.v-book svg{width:16px;height:16px;fill:currentColor}
.v-band{background:var(--p);color:var(--on-p)}
.v-band-in{display:grid;gap:28px}
.v-band h2{font-size:clamp(2rem,5vw,3rem)}
.v-band .hours div{border-color:color-mix(in srgb,var(--on-p) 22%,transparent)}
.v-band .contact li span{opacity:.7}
.v-band .btn{background:var(--on-p);color:var(--p)}
.v-band .btn-o{background:transparent;color:var(--on-p)}
.v-about{display:grid;gap:32px;align-items:center}
.v-about .ph{border-radius:calc(var(--r)*1.5);overflow:hidden;aspect-ratio:4/3}
.v-about .ph img{width:100%;height:100%;object-fit:cover}
.v-about p+p{margin-top:12px}
.v-rev{display:grid;gap:16px}
.v-rev blockquote{margin:0;padding:24px;border-radius:var(--r);background:var(--sf)}
.v-rev p{margin:10px 0 16px}
.v-rev cite{display:flex;align-items:center;gap:10px;font-style:normal;font-weight:700}
.v-rev cite i{width:36px;height:36px;border-radius:50%;background:var(--p);color:var(--on-p);display:grid;place-items:center;font-style:normal;font-size:.9rem}
.v-gal{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.v-gal img{aspect-ratio:4/3;object-fit:cover;width:100%;border-radius:var(--r)}
@media(min-width:880px){
.v-hero-in{grid-template-columns:1.1fr 1fr}
.v-svc{grid-template-columns:repeat(2,1fr)}
.v-band-in{grid-template-columns:1fr 1fr 1fr;align-items:start}
.v-about{grid-template-columns:1fr 1fr;gap:64px}
.v-rev{grid-template-columns:repeat(3,1fr)}
.v-gal{grid-template-columns:repeat(4,1fr)}
}
@media(min-width:1100px){.v-svc{grid-template-columns:repeat(3,1fr)}}`,
  render(ctx: Ctx) {
    const c = ctx.c;
    const s = sectionsPresent(ctx);
    const maps = mapsHref(ctx);
    const open = c.sections.hours ? groupedHours(c).find((r) => !r.closed) : null;
    const checks: string[] = [];
    if (c.contact.whatsapp) checks.push("Konsultasi & booking lewat WhatsApp");
    if (open) checks.push(`Buka ${open.label}, ${open.value}`);
    if (c.contact.address) checks.push(c.contact.address.split(/[,\n]/)[0]!);
    return html`${navBar(ctx, "v-nav")}<main id="top"><section class="v-hero"><div class="w v-hero-in"><div>${
      c.business.tagline ? html`<span class="v-kick"><i></i>${c.business.tagline}</span>` : ""
    }<h1>${c.hero.title}</h1>${c.hero.subtitle ? html`<p class="sub">${c.hero.subtitle}</p>` : ""}<div class="actions">${ctaButton(ctx) ?? ""}${
      s.products ? html`<a class="btn btn-o" href="#produk">Lihat ${(c.products.title ?? "layanan").toLowerCase()}</a>` : ""
    }</div>${checks.length ? html`<ul class="v-checks">${checks.map((t) => html`<li>${CHECK}${t}</li>`)}</ul>` : ""}</div><div class="v-photo">${
      img(ctx, c.hero.imageMediaId, "", c.hero.title, true) ?? art("grid")
    }${
      c.contact.address ? html`<div class="v-float">${PIN}<div><b>${c.business.name}</b><span>${c.contact.address.split(/\n/)[0]}</span></div></div>` : ""
    }</div></div></section>${
      s.products
        ? html`<section id="produk" class="v-sec"><div class="w"><div class="v-title"><h2>${c.products.title ?? "Layanan"}</h2>${
            c.business.tagline ? html`<p>${c.business.tagline}</p>` : ""
          }</div><div class="v-svc">${c.products.items.map((p) => {
            const href = orderHref(ctx, p);
            return html`<article class="v-card${p.available ? "" : " is-sold"}"><div class="v-top"><div class="v-ico">${img(ctx, p.imageMediaId, "", p.name) ?? initial(p.name)}</div><div><h3>${p.name}</h3>${
              badge(p) ?? ""
            }</div></div>${p.description ? html`<p>${p.description}</p>` : ""}<div class="v-bottom">${
              price(p) ? html`<span class="price"><small>${p.price != null ? "Harga" : "Biaya"}</small>${price(p)}</span>` : html`<span></span>`
            }${href ? html`<a class="v-book" href="${href}" target="_blank" rel="noopener">${WA_ICON}Booking</a>` : p.available ? "" : html`<span class="sold">Tidak tersedia</span>`}</div></article>`;
          })}</div></div></section>`
        : ""
    }${
      s.contact
        ? html`<section id="kontak" class="v-sec v-band"><div class="w v-band-in"><div><h2>Jadwalkan kunjungan</h2><div class="actions" style="margin-top:24px">${
            wa(ctx) ? html`<a class="btn" href="${wa(ctx)!}" target="_blank" rel="noopener">${WA_ICON}<span>Booking via WhatsApp</span></a>` : ""
          }${maps ? html`<a class="btn btn-o" href="${maps}" target="_blank" rel="noopener">Petunjuk arah</a>` : ""}</div></div><div>${hoursList(ctx) ?? ""}</div><div>${contactLines(ctx) ?? ""}</div></div></section>`
        : ""
    }${
      s.about
        ? html`<section id="tentang" class="v-sec"><div class="w v-about">${
            hasImg(ctx, c.about.imageMediaId) ? html`<div class="ph">${img(ctx, c.about.imageMediaId, "", c.about.title ?? c.business.name)}</div>` : ""
          }<div><div class="v-title" style="margin-bottom:20px"><h2>${c.about.title ?? "Tentang Kami"}</h2></div>${paras(c.about.body)}${
            socialLinks(ctx) ? html`<div style="margin-top:24px">${socialLinks(ctx)}</div>` : ""
          }</div></div></section>`
        : ""
    }${
      s.testimonials
        ? html`<section class="v-sec" style="padding-top:0"><div class="w"><div class="v-title"><h2>${c.testimonials.title ?? "Kata Pelanggan"}</h2></div><div class="v-rev">${c.testimonials.items.map(
            (q) => html`<blockquote>${stars(q.rating)}<p>${q.text}</p><cite><i>${initial(q.name)}</i>${q.name}</cite></blockquote>`,
          )}</div></div></section>`
        : ""
    }${
      s.gallery
        ? html`<section id="galeri" class="v-sec" style="padding-top:0"><div class="w"><div class="v-title"><h2>${c.gallery.title ?? "Hasil Kerja"}</h2></div><div class="v-gal">${c.gallery.items
            .filter((g) => ctx.media.has(g.mediaId))
            .map((g) => img(ctx, g.mediaId, "", g.caption ?? c.business.name))}</div></div></section>`
        : ""
    }${mapEmbed(ctx) ? html`<div class="w" style="padding-bottom:56px">${mapEmbed(ctx)}</div>` : ""}</main>${footer(ctx)}${waFloat(ctx) ?? ""}`;
  },
};
