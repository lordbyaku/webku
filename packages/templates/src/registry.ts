import type { Category } from "@umkm/content-schema";

export interface TemplateDef {
  id: string;
  name: string;
  category: Exclude<Category, "lainnya">;
  layout: string;
  theme: string;
}

const T = (id: string, name: string, category: TemplateDef["category"], layout: string, theme: string): TemplateDef => ({
  id, name, category, layout, theme,
});

export const TEMPLATES: TemplateDef[] = [
  T("kuliner-01", "Warung Nusantara", "kuliner", "L01", "T01"),
  T("kuliner-02", "Kedai Kopi", "kuliner", "L04", "T02"),
  T("kuliner-03", "Jajanan Ceria", "kuliner", "L03", "T08"),
  T("kuliner-04", "Promo Resto", "kuliner", "L08", "T11"),
  T("kuliner-05", "Katering Sehat", "kuliner", "L07", "T03"),
  T("fashion-01", "Butik Monokrom", "fashion", "L05", "T06"),
  T("fashion-02", "Hijab Pastel", "fashion", "L03", "T05"),
  T("fashion-03", "Couture Elegan", "fashion", "L10", "T07"),
  T("fashion-04", "Batik Sogan", "fashion", "L02", "T09"),
  T("fashion-05", "Distro Promo", "fashion", "L08", "T10"),
  T("jasa-01", "Bengkel Pro", "jasa", "L09", "T12"),
  T("jasa-02", "Laundry Bersih", "jasa", "L04", "T04"),
  T("jasa-03", "Studio Kreatif", "jasa", "L02", "T06"),
  T("jasa-04", "Servis Elektronik", "jasa", "L09", "T11"),
  T("jasa-05", "Jasa Freelance", "jasa", "L07", "T12"),
  T("cantik-01", "Salon Emas", "cantik", "L10", "T05"),
  T("cantik-02", "Spa Pastel", "cantik", "L09", "T05"),
  T("cantik-03", "Nail Art", "cantik", "L05", "T10"),
  T("cantik-04", "Skincare Herbal", "cantik", "L02", "T03"),
  T("cantik-05", "Barbershop", "cantik", "L04", "T06"),
  T("toko-01", "Toko Kelontong", "toko", "L03", "T03"),
  T("toko-02", "Toko Elektronik", "toko", "L03", "T12"),
  T("toko-03", "Toko Grosir", "toko", "L08", "T08"),
  T("toko-04", "Toko Online Mini", "toko", "L07", "T04"),
  T("toko-05", "Toko Oleh-oleh", "toko", "L01", "T11"),
  T("kriya-01", "Kriya Batik", "kriya", "L06", "T09"),
  T("kriya-02", "Kerajinan Kayu", "kriya", "L05", "T02"),
  T("kriya-03", "Anyaman Alam", "kriya", "L06", "T03"),
  T("kriya-04", "Handmade Craft", "kriya", "L01", "T10"),
  T("kriya-05", "Galeri Seni", "kriya", "L10", "T06"),
];

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]));

export function getTemplate(id: string): TemplateDef | undefined {
  return BY_ID.get(id);
}

export function isTemplateId(id: string): boolean {
  return BY_ID.has(id);
}

/** Template default per kategori (dipakai saat membuat tenant tanpa memilih). */
export function defaultTemplateFor(category: Category): string {
  return TEMPLATES.find((t) => t.category === category)?.id ?? "kuliner-01";
}
