/** Huruf self-hosted (SIL OFL) di /_fonts/ — dilayani Static Assets, tanpa memanggil Worker. */
export type FontKey =
  | "fraunces" | "playfair" | "dmserif" | "cormorant" | "instrument"
  | "manrope" | "outfit" | "spacegrotesk" | "bricolage" | "anton" | "syne" | "jakarta";

interface FontDef {
  family: string;
  file: string;
  italic?: string;
  weight: string;
  fallback: string;
}

const SERIF = 'Georgia,"Times New Roman",serif';
const SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

export const FONTS: Record<FontKey, FontDef> = {
  fraunces: { family: "Fraunces", file: "fraunces", italic: "fraunces-italic", weight: "100 900", fallback: SERIF },
  playfair: { family: "Playfair Display", file: "playfair", italic: "playfair-italic", weight: "400 900", fallback: SERIF },
  dmserif: { family: "DM Serif Display", file: "dmserif", italic: "dmserif-italic", weight: "400", fallback: SERIF },
  cormorant: { family: "Cormorant Garamond", file: "cormorant", italic: "cormorant-italic", weight: "300 700", fallback: SERIF },
  instrument: { family: "Instrument Serif", file: "instrument", italic: "instrument-italic", weight: "400", fallback: SERIF },
  manrope: { family: "Manrope", file: "manrope", weight: "200 800", fallback: SANS },
  outfit: { family: "Outfit", file: "outfit", weight: "100 900", fallback: SANS },
  spacegrotesk: { family: "Space Grotesk", file: "spacegrotesk", weight: "300 700", fallback: SANS },
  bricolage: { family: "Bricolage Grotesque", file: "bricolage", weight: "200 800", fallback: SANS },
  anton: { family: "Anton", file: "anton", weight: "400", fallback: 'Impact,"Arial Narrow",sans-serif' },
  syne: { family: "Syne", file: "syne", weight: "400 800", fallback: SANS },
  jakarta: { family: "Plus Jakarta Sans", file: "jakarta", weight: "200 800", fallback: SANS },
};

export function fontStack(k: FontKey): string {
  const f = FONTS[k];
  return `"${f.family}",${f.fallback}`;
}

export function fontFaceCss(keys: FontKey[], withItalic: FontKey[] = []): string {
  const seen = new Set<string>();
  let css = "";
  for (const k of keys) {
    if (seen.has(k)) continue;
    seen.add(k);
    const f = FONTS[k];
    css += `@font-face{font-family:"${f.family}";src:url(/_fonts/${f.file}.woff2) format("woff2");font-weight:${f.weight};font-style:normal;font-display:swap}`;
    if (f.italic && withItalic.includes(k)) {
      css += `@font-face{font-family:"${f.family}";src:url(/_fonts/${f.italic}.woff2) format("woff2");font-weight:${f.weight};font-style:italic;font-display:swap}`;
    }
  }
  return css;
}

export function fontFile(k: FontKey): string {
  return `/_fonts/${FONTS[k].file}.woff2`;
}
