// Menyalin file huruf (WOFF2, subset latin) dari node_modules ke Static Assets
// site-worker dan cms-ui. Semua huruf berlisensi SIL Open Font License.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const F = (pkg, file, out) => ({ src: path.join(root, "node_modules", pkg, "files", file), out });
const FILES = [
  F("@fontsource-variable/fraunces", "fraunces-latin-standard-normal.woff2", "fraunces.woff2"),
  F("@fontsource-variable/fraunces", "fraunces-latin-standard-italic.woff2", "fraunces-italic.woff2"),
  F("@fontsource-variable/playfair-display", "playfair-display-latin-wght-normal.woff2", "playfair.woff2"),
  F("@fontsource-variable/playfair-display", "playfair-display-latin-wght-italic.woff2", "playfair-italic.woff2"),
  F("@fontsource/dm-serif-display", "dm-serif-display-latin-400-normal.woff2", "dmserif.woff2"),
  F("@fontsource/dm-serif-display", "dm-serif-display-latin-400-italic.woff2", "dmserif-italic.woff2"),
  F("@fontsource-variable/cormorant-garamond", "cormorant-garamond-latin-wght-normal.woff2", "cormorant.woff2"),
  F("@fontsource-variable/cormorant-garamond", "cormorant-garamond-latin-wght-italic.woff2", "cormorant-italic.woff2"),
  F("@fontsource/instrument-serif", "instrument-serif-latin-400-normal.woff2", "instrument.woff2"),
  F("@fontsource/instrument-serif", "instrument-serif-latin-400-italic.woff2", "instrument-italic.woff2"),
  F("@fontsource-variable/manrope", "manrope-latin-wght-normal.woff2", "manrope.woff2"),
  F("@fontsource-variable/outfit", "outfit-latin-wght-normal.woff2", "outfit.woff2"),
  F("@fontsource-variable/space-grotesk", "space-grotesk-latin-wght-normal.woff2", "spacegrotesk.woff2"),
  F("@fontsource-variable/bricolage-grotesque", "bricolage-grotesque-latin-wght-normal.woff2", "bricolage.woff2"),
  F("@fontsource/anton", "anton-latin-400-normal.woff2", "anton.woff2"),
  F("@fontsource-variable/syne", "syne-latin-wght-normal.woff2", "syne.woff2"),
  F("@fontsource-variable/plus-jakarta-sans", "plus-jakarta-sans-latin-wght-normal.woff2", "jakarta.woff2"),
];
for (const dest of ["apps/site-worker/public/_fonts", "apps/cms-ui/public/_fonts"]) {
  const dir = path.join(root, dest);
  fs.mkdirSync(dir, { recursive: true });
  let total = 0;
  for (const f of FILES) {
    fs.copyFileSync(f.src, path.join(dir, f.out));
    total += fs.statSync(f.src).size;
  }
  console.log(`${dest}: ${FILES.length} file, ${(total / 1024).toFixed(0)} KB`);
}
