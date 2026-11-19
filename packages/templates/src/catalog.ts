/**
 * Katalog ringan untuk UI (tanpa kode render & CSS layout) agar bundel CMS tetap kecil.
 * LAYOUT_META harus sama dengan LAYOUTS — dijaga oleh tes.
 */
export { TEMPLATES, getTemplate, isTemplateId, defaultTemplateFor, type TemplateDef } from "./registry";
export { THEMES, type Theme } from "./themes";
export { FONTS, fontStack, fontFaceCss } from "./fonts";

export interface LayoutMeta {
  id: string;
  name: string;
  products: "grid" | "menu" | "stack" | "rows" | "services";
  forceSerif?: boolean;
}

export const LAYOUT_META: Record<string, LayoutMeta> = {
  L01: { id: "L01", name: "Sinema", products: "grid" },
  L02: { id: "L02", name: "Editorial", products: "rows" },
  L03: { id: "L03", name: "Katalog", products: "grid" },
  L04: { id: "L04", name: "Papan Menu", products: "menu" },
  L05: { id: "L05", name: "Galeri", products: "grid" },
  L06: { id: "L06", name: "Cerita", products: "rows" },
  L07: { id: "L07", name: "Bio-link", products: "stack" },
  L08: { id: "L08", name: "Poster Promo", products: "grid" },
  L09: { id: "L09", name: "Layanan", products: "services" },
  L10: { id: "L10", name: "Butik", products: "menu", forceSerif: true },
};
