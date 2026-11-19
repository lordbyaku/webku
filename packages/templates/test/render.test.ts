import { describe, expect, it } from "vitest";
import { parseContent, sampleContent, type Content } from "@umkm/content-schema";
import { LAYOUTS, TEMPLATES, renderSite, renderStatusPage, type MediaInfo } from "../src";
import { LAYOUT_META } from "../src/catalog";

const XSS = `"><script>alert(1)</script><img src=x onerror=alert(2)>`;

function opts(media = new Map<string, MediaInfo>()) {
  return {
    host: "contoh.domainku.id",
    mediaOrigin: "https://media.domainku.id",
    media,
    showBranding: true,
    brandName: "DomainKu",
    brandUrl: "https://domainku.id",
    now: Date.UTC(2026, 10, 18),
  };
}

function evilContent(): Content {
  const c = sampleContent("kuliner", XSS);
  c.business.tagline = XSS;
  c.hero.title = XSS;
  c.hero.subtitle = XSS;
  c.hero.ctaText = "Pesan";
  c.about.body = `${XSS}\n\nParagraf kedua`;
  c.products.items[0]!.name = XSS;
  c.products.items[0]!.description = XSS;
  c.testimonials.items[0]!.text = XSS;
  c.testimonials.items[0]!.name = XSS;
  c.contact.whatsapp = "6281234567890";
  c.contact.address = `Jl. ${XSS}`;
  c.contact.email = "a@b.co";
  c.social.instagram = "warung.bu_sri";
  c.seo.description = `</script>${XSS}`;
  return c;
}

describe("renderSite", () => {
  it("merender ke-30 template tanpa error", () => {
    expect(TEMPLATES).toHaveLength(30);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(30);
    for (const t of TEMPLATES) {
      const out = renderSite(t.id, sampleContent(t.category, "Usaha Contoh"), opts());
      expect(out.html.startsWith("<!doctype html>")).toBe(true);
      expect(out.html).toContain("Usaha Contoh");
      expect(out.html.length).toBeLessThan(60_000);
    }
  });

  it("meng-escape semua input pengguna (XSS) di semua template", () => {
    const c = evilContent();
    for (const t of TEMPLATES) {
      const { html } = renderSite(t.id, c, opts());
      expect(html).not.toContain("<script>alert");
      expect(html).not.toContain("<img src=x");
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      // hanya satu <script>: JSON-LD
      expect(html.match(/<script/g)?.length).toBe(1);
      const ld = html.split('<script type="application/ld+json">')[1]!.split("</script>")[0]!;
      expect(ld).not.toContain("<");
      expect(() => JSON.parse(ld)).not.toThrow();
    }
  });

  it("menyertakan SEO, tautan WA per produk, dan sitemap", () => {
    const c = sampleContent("toko", "Toko Makmur");
    c.contact.whatsapp = "6281234567890";
    const out = renderSite("toko-01", c, opts());
    expect(out.html).toContain('<link rel="canonical" href="https://contoh.domainku.id/">');
    expect(out.html).toContain("https://wa.me/6281234567890?text=");
    expect(out.html).toContain(encodeURIComponent("saya mau pesan: Beras 5 kg"));
    expect(out.html).toContain("Rp 72.000");
    expect(out.sitemap).toContain("<loc>https://contoh.domainku.id/</loc>");
    expect(out.robots).toContain("Sitemap: https://contoh.domainku.id/sitemap.xml");
  });

  it("menyembunyikan section kosong/nonaktif", () => {
    const c = sampleContent("jasa", "Bengkel");
    c.sections.testimonials = false;
    c.gallery.items = [];
    const { html } = renderSite("jasa-01", c, opts());
    expect(html).not.toContain('id="testimoni"');
    expect(html).not.toContain('id="galeri"');
    expect(html).toContain('id="produk"');
  });

  it("memakai URL media dari peta media", () => {
    const c = sampleContent("kuliner", "Warung");
    const id = "m_" + "a".repeat(21);
    c.hero.imageMediaId = id;
    const media = new Map([[id, { key: "t/t_1/abc.webp", width: 1600, height: 900, alt: null }]]);
    const { html } = renderSite("kuliner-01", c, opts(media));
    expect(html).toContain('src="https://media.domainku.id/t/t_1/abc.webp"');
    expect(html).toContain('property="og:image" content="https://media.domainku.id/t/t_1/abc.webp"');
  });

  it("mode pratinjau memberi noindex", () => {
    const { html } = renderSite("kuliner-01", sampleContent("kuliner", "W"), { ...opts(), preview: true });
    expect(html).toContain('content="noindex,nofollow"');
  });

  it("menolak template tidak dikenal", () => {
    expect(() => renderSite("tidak-ada", sampleContent("kuliner", "W"), opts())).toThrow();
  });

  it("halaman status", () => {
    expect(renderStatusPage("suspended", "DomainKu", "https://domainku.id")).toContain("tidak aktif");
    expect(renderStatusPage("not_found", "DomainKu", "https://domainku.id")).toContain("tidak ditemukan");
  });
});

describe("katalog", () => {
  it("LAYOUT_META sama dengan LAYOUTS", () => {
    for (const [id, l] of Object.entries(LAYOUTS)) {
      expect(LAYOUT_META[id]).toEqual({ id: l.id, name: l.name, products: l.products, ...(l.forceSerif ? { forceSerif: true } : {}) });
    }
    expect(Object.keys(LAYOUT_META).sort()).toEqual(Object.keys(LAYOUTS).sort());
  });
  it("setiap pasangan layout + tema unik", () => {
    expect(new Set(TEMPLATES.map((t) => t.layout + t.theme)).size).toBe(30);
  });
});

describe("parseContent", () => {
  it("menerima konten contoh", () => {
    expect(parseContent(sampleContent("kuliner", "Warung")).ok).toBe(true);
  });

  it("normalisasi WA dan buang karakter kontrol", () => {
    const c = sampleContent("kuliner", "Warung​ Bu\u0000 Sri  ");
    c.contact.whatsapp = "0812-3456-7890";
    const r = parseContent(c);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.content.contact.whatsapp).toBe("6281234567890");
      expect(r.content.business.name).toBe("Warung Bu Sri");
    }
  });

  it("menolak URL berbahaya dan domain asing", () => {
    for (const bad of ["javascript:alert(1)", "https://evil.com/maps", "http://maps.app.goo.gl/x"]) {
      const c = sampleContent("kuliner", "W");
      c.contact.mapsUrl = bad;
      const r = parseContent(c);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.fields["contact.mapsUrl"]).toBeTruthy();
    }
    const c = sampleContent("kuliner", "W");
    c.contact.mapsUrl = "https://maps.app.goo.gl/abc123";
    c.social.shopee = "https://shopee.co.id/tokoku";
    c.social.instagram = "@warung";
    const r = parseContent(c);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.content.social.instagram).toBe("warung");
  });

  it("menolak terlalu banyak produk dan nama kosong", () => {
    const c = sampleContent("kuliner", "W");
    c.products.items = Array.from({ length: 31 }, (_, i) => ({ ...c.products.items[0]!, id: `p${i}` }));
    expect(parseContent(c).ok).toBe(false);
    const d = sampleContent("kuliner", "   ");
    const r = parseContent(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fields["business.name"]).toBe("Wajib diisi");
  });
});
