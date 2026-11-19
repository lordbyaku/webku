/**
 * CSS dasar semua template (di-inline). Setiap layout menambah CSS-nya sendiri.
 * Tidak ada data pengguna di sini — warna & huruf datang dari variabel tema.
 */
const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:72px}
body{margin:0;background:var(--bg);color:var(--tx);font-family:var(--fb);font-size:16.5px;line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
img{max-width:100%;height:auto;display:block}
a{color:inherit;text-underline-offset:.2em}
h1,h2,h3{margin:0;font-family:var(--fd);font-weight:var(--dw);letter-spacing:var(--dt);line-height:1.04;text-transform:var(--du);text-wrap:balance}
h1 em,h2 em{font-style:italic;font-weight:inherit}
p{margin:0}
ul,dl,dd{margin:0;padding:0;list-style:none}
:focus-visible{outline:2px solid var(--pt);outline-offset:3px;border-radius:4px}
.w{width:min(1180px,calc(100% - 40px));margin-inline:auto}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 26px;border-radius:min(var(--r),999px);background:var(--p);color:var(--on-p);font:650 15.5px/1 var(--fb);letter-spacing:.01em;text-decoration:none;transition:transform .2s ease,box-shadow .2s ease}
.btn:hover{transform:translateY(-2px);box-shadow:0 14px 28px -14px var(--p)}
.btn svg{width:19px;height:19px;fill:currentColor;flex:none}
.btn-o{background:transparent;color:inherit;box-shadow:inset 0 0 0 1.5px currentColor}
.btn-o:hover{box-shadow:inset 0 0 0 1.5px currentColor}
.actions{display:flex;flex-wrap:wrap;gap:12px}
.lnk{display:inline-flex;align-items:center;gap:6px;font-weight:650;text-decoration:none;color:var(--pt)}
.lnk svg{width:17px;height:17px;transition:transform .2s}
.lnk:hover svg{transform:translateX(3px)}
.price{font-variant-numeric:tabular-nums lining-nums;white-space:nowrap}
.sold{display:inline-block;font-size:.78rem;font-weight:700;letter-spacing:.02em;color:var(--mu)}
.is-sold{opacity:.5}
.tag{display:inline-flex;align-items:center;font:700 .7rem/1 var(--fb);letter-spacing:.06em;text-transform:uppercase;padding:6px 10px;border-radius:99px;background:var(--ac);color:var(--on-ac)}
.stars{color:#e0a521;letter-spacing:2px;font-size:.95rem}
.stars-off{opacity:.25}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-family:var(--fd);font-weight:var(--dw);font-size:1.2rem;letter-spacing:var(--dt);min-width:0}
.brand img{width:38px;height:38px;border-radius:50%;object-fit:cover;flex:none}
.brand span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nav-in{display:flex;align-items:center;gap:24px;min-height:68px}
.nav-in .brand{margin-right:auto}
.links{display:none;gap:28px;font-size:.95rem;font-weight:600}
.links a{text-decoration:none;opacity:.8}
.links a:hover{opacity:1}
.nav-cta{display:inline-flex;align-items:center;gap:8px;min-height:42px;padding:0 18px;border-radius:99px;background:var(--p);color:var(--on-p);font-weight:700;font-size:.92rem;text-decoration:none}
.nav-cta svg{width:17px;height:17px;fill:currentColor}
.contact{display:grid;gap:16px}
.contact li span{display:block;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.6;margin-bottom:2px}
.contact a{text-decoration:none}
.contact a:hover{text-decoration:underline}
.hours div{display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid var(--line)}
.hours dd{font-variant-numeric:tabular-nums;font-weight:600;text-align:right}
.hours .off dd{opacity:.55;font-weight:500}
.socials{display:flex;flex-wrap:wrap;gap:10px}
.socials a{display:inline-flex;min-height:40px;align-items:center;padding:0 16px;border-radius:99px;border:1px solid var(--line);text-decoration:none;font-weight:600;font-size:.9rem}
.socials a:hover{border-color:currentColor}
.map iframe{width:100%;height:280px;border:0;display:block;border-radius:var(--r);filter:grayscale(.25)}
.foot{padding:32px 0 108px;font-size:.88rem;color:var(--mu);border-top:1px solid var(--line)}
.foot-in{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px 24px}
.foot a{text-decoration:none}
.foot a:hover{text-decoration:underline}
.wa-f{position:fixed;right:16px;bottom:16px;z-index:50;display:flex;align-items:center;gap:8px;min-height:52px;padding:0 20px 0 16px;border-radius:99px;background:#1a9e4f;color:#fff;font-weight:700;font-size:.95rem;text-decoration:none;box-shadow:0 12px 30px -8px rgba(0,0,0,.4)}
.wa-f svg{width:22px;height:22px;fill:currentColor}
.art{position:absolute;inset:0;overflow:hidden;background:var(--tint)}
.art::after{content:"";position:absolute;inset:0;background-image:${NOISE};opacity:.22;mix-blend-mode:multiply;pointer-events:none}
.art i{position:absolute;display:block}
.art b{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fd);font-weight:var(--dw);font-size:clamp(3rem,12vw,7rem);color:var(--p);opacity:.85;text-transform:var(--du)}
.art-orb i:nth-child(1){width:78%;aspect-ratio:1;border-radius:50%;background:var(--p);right:-22%;top:-26%}
.art-orb i:nth-child(2){width:52%;aspect-ratio:1;border-radius:50%;background:var(--ac);left:-14%;bottom:-22%;opacity:.9}
.art-orb i:nth-child(3){width:34%;aspect-ratio:1;border-radius:50%;border:1.5px solid var(--tx);left:38%;top:30%;opacity:.25}
.art-arch i:nth-child(1){left:12%;right:12%;top:14%;bottom:-2%;border-radius:999px 999px 0 0;background:var(--p)}
.art-arch i:nth-child(2){left:24%;right:24%;top:30%;bottom:-2%;border-radius:999px 999px 0 0;background:var(--tint)}
.art-arch i:nth-child(3){width:22%;aspect-ratio:1;border-radius:50%;background:var(--ac);right:8%;top:8%}
.art-grid{background:radial-gradient(circle,var(--line) 1.2px,transparent 1.4px) 0 0/18px 18px,var(--tint)}
.art-grid i:nth-child(1){left:10%;top:12%;width:46%;height:58%;background:var(--p);border-radius:var(--r)}
.art-grid i:nth-child(2){right:10%;bottom:12%;width:38%;height:46%;background:var(--ac);border-radius:var(--r)}
.art-grid i:nth-child(3){right:16%;top:16%;width:16%;aspect-ratio:1;border-radius:50%;border:1.5px solid var(--tx);opacity:.3}
.art-stripe{background:repeating-linear-gradient(-45deg,var(--p) 0 22px,transparent 22px 44px),var(--tint)}
.art-stripe i:nth-child(1){left:50%;top:50%;width:62%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;background:var(--ac)}
.art-stripe i:nth-child(2),.art-stripe i:nth-child(3){display:none}
.art-sun{background:linear-gradient(180deg,var(--tint) 0 62%,var(--sf) 62%)}
.art-sun i:nth-child(1){width:46%;aspect-ratio:1;border-radius:50%;background:var(--p);left:50%;top:62%;translate:-50% -50%}
.art-sun i:nth-child(2){left:0;right:0;top:62%;height:1.5px;background:var(--tx);opacity:.35}
.art-sun i:nth-child(3){left:0;right:0;top:calc(62% + 14px);height:1.5px;background:var(--tx);opacity:.15}
.art-frame{background:var(--sf)}
.art-frame i:nth-child(1){inset:8%;border:1px solid var(--pt);opacity:.5}
.art-frame i:nth-child(2){inset:12%;border:1px solid var(--pt);opacity:.3}
.art-frame i:nth-child(3){display:none}
@media(min-width:880px){.links{display:flex}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*::before,*::after{animation:none!important;transition:none!important}}
`;

export function minify(css: string): string {
  return css.replace(/\n+/g, "").replace(/\s{2,}/g, " ");
}
