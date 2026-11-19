import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import type { Content, Product } from "@umkm/content-schema";
import { useEditor } from "../editor";
import { Icon } from "../components/Icon";
import { ImageField, MediaSheet } from "../components/media";
import { Chips, confirmAction, rupiah, Switch, TextField } from "../components/ui";

type Sec = keyof Content["sections"];

export interface SectionDef {
  key: string;
  title: string;
  icon: string;
  intro: string;
  summary: (c: Content) => { text: string; warn?: boolean };
  Editor: () => preact.JSX.Element;
}

const DAY = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function newItemId() {
  return "p" + Math.random().toString(36).slice(2, 10);
}

function useErr() {
  const { errors } = useEditor();
  return (path: string) => errors[path];
}

function Visible({ sec, label }: { sec: Sec; label: string }) {
  const ed = useEditor();
  return (
    <div class="section-toggle">
      <Switch label={label} hint={ed.content.sections[sec] ? "Ditampilkan di situs" : "Disembunyikan dari situs"} checked={ed.content.sections[sec]} onChange={(v) => ed.update((c) => void (c.sections[sec] = v))} />
    </div>
  );
}

function move<T>(arr: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j]!, arr[i]!];
}

/** Kerangka item daftar yang bisa dibuka-tutup, dinaikkan/diturunkan, dan dihapus. */
function ItemShell(p: {
  open: boolean;
  onToggle: () => void;
  thumb?: string | null;
  initial: string;
  title: string;
  meta: ComponentChildren;
  index: number;
  count: number;
  onMove: (d: number) => void;
  onDelete: () => void;
  deleteLabel: string;
  children: ComponentChildren;
}) {
  return (
    <div class={`item${p.open ? " open" : ""}`}>
      <div class="item-head" onClick={p.onToggle} role="button" tabIndex={0} aria-expanded={p.open} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), p.onToggle())}>
        <div class="item-thumb" style={p.thumb ? { backgroundImage: `url("${p.thumb}")` } : undefined}>
          {!p.thumb && p.initial}
        </div>
        <div class="item-main">
          <div class="item-name">{p.title}</div>
          <div class="item-meta">{p.meta}</div>
        </div>
        <span class="icon-btn" aria-hidden="true" style={{ transform: p.open ? "rotate(180deg)" : undefined }}>
          <Icon name="chevD" />
        </span>
      </div>
      {p.open && (
        <div class="item-body">
          {p.children}
          <div class="item-tools">
            <div>
              <button type="button" class="icon-btn" disabled={p.index === 0} onClick={() => p.onMove(-1)} aria-label="Pindah ke atas">
                <Icon name="up" />
              </button>
              <button type="button" class="icon-btn" disabled={p.index === p.count - 1} onClick={() => p.onMove(1)} aria-label="Pindah ke bawah">
                <Icon name="down" />
              </button>
            </div>
            <button type="button" class="btn btn-quiet btn-sm" style="color:var(--cabai)" onClick={p.onDelete}>
              <Icon name="trash" />
              {p.deleteLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Judul & foto utama ----------
function HeroEditor() {
  const ed = useEditor();
  const err = useErr();
  const c = ed.content;
  return (
    <>
      <div class="panel">
        <div class="panel-title">Identitas usaha</div>
        <TextField label="Nama usaha" value={c.business.name} max={60} error={err("business.name")} onInput={(v) => ed.update((d) => void (d.business.name = v))} />
        <TextField label="Slogan singkat" value={c.business.tagline} max={100} placeholder="Contoh: Masakan rumahan sejak 1998" error={err("business.tagline")} onInput={(v) => ed.update((d) => void (d.business.tagline = v))} />
        <div style="margin-top:18px">
          <ImageField label="Logo" hint="Tampil di bagian atas situs dan sebagai ikon tab browser." value={c.business.logoMediaId ?? null} onChange={(id) => ed.update((d) => void (d.business.logoMediaId = id))} />
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">Bagian pembuka</div>
        <TextField label="Judul besar" value={c.hero.title} max={80} error={err("hero.title")} hint="Kalimat pertama yang dibaca pengunjung." onInput={(v) => ed.update((d) => void (d.hero.title = v))} />
        <TextField label="Kalimat pendukung" value={c.hero.subtitle} max={160} multiline rows={2} error={err("hero.subtitle")} onInput={(v) => ed.update((d) => void (d.hero.subtitle = v))} />
        <TextField label="Tulisan tombol" value={c.hero.ctaText} max={30} placeholder="Pesan Sekarang" hint="Tombol ini membuka chat WhatsApp Anda. Kosongkan untuk menyembunyikan." error={err("hero.ctaText")} onInput={(v) => ed.update((d) => void (d.hero.ctaText = v))} />
        <div style="margin-top:18px">
          <ImageField label="Foto utama" wide hint="Pakai foto mendatar (landscape) yang terang dan jelas." value={c.hero.imageMediaId ?? null} onChange={(id) => ed.update((d) => void (d.hero.imageMediaId = id))} />
        </div>
      </div>
    </>
  );
}

// ---------- Tentang ----------
function AboutEditor() {
  const ed = useEditor();
  const err = useErr();
  const a = ed.content.about;
  return (
    <div class="panel">
      <Visible sec="about" label="Tampilkan bagian Tentang" />
      <TextField label="Judul" value={a.title} max={60} placeholder="Tentang Kami" onInput={(v) => ed.update((d) => void (d.about.title = v))} />
      <TextField label="Cerita usaha" value={a.body} max={1500} multiline rows={7} error={err("about.body")} hint="Ceritakan sejak kapan usaha berdiri, apa keunggulannya, dan siapa yang melayani. Pisahkan paragraf dengan baris kosong." onInput={(v) => ed.update((d) => void (d.about.body = v))} />
      <div style="margin-top:18px">
        <ImageField label="Foto" wide value={a.imageMediaId ?? null} onChange={(id) => ed.update((d) => void (d.about.imageMediaId = id))} />
      </div>
    </div>
  );
}

// ---------- Produk ----------
function priceLabel(p: Product) {
  if (p.price != null) return rupiah(p.price);
  return p.priceText ?? "Tanpa harga";
}

function ProductsEditor() {
  const ed = useEditor();
  const err = useErr();
  const items = ed.content.products.items;
  const [open, setOpen] = useState<string | null>(null);
  const max = ed.data.limits.products;

  function add() {
    const id = newItemId();
    ed.update((d) => void d.products.items.push({ id, name: "Produk baru", price: null, priceText: null, description: null, imageMediaId: null, badge: null, available: true }));
    setOpen(id);
  }

  return (
    <>
      <div class="panel">
        <Visible sec="products" label="Tampilkan daftar produk" />
        <TextField label="Judul bagian" value={ed.content.products.title} max={60} placeholder="Menu Kami, Produk, Layanan…" onInput={(v) => ed.update((d) => void (d.products.title = v))} />
      </div>
      <div class="items" style="margin-top:16px">
        {items.map((p, i) => {
          const mode = p.price != null ? "angka" : p.priceText ? "teks" : "none";
          const pre = `products.items.${i}`;
          const hasErr = Object.keys(ed.errors).some((k) => k.startsWith(pre + "."));
          return (
            <ItemShell
              key={p.id}
              open={open === p.id || hasErr}
              onToggle={() => setOpen(open === p.id ? null : p.id)}
              thumb={p.imageMediaId ? ed.media.get(p.imageMediaId)?.url : null}
              initial={(p.name.trim()[0] ?? "?").toUpperCase()}
              title={p.name || "Tanpa nama"}
              meta={
                <>
                  {priceLabel(p)}
                  {!p.available && <span class="off"> · Stok habis</span>}
                </>
              }
              index={i}
              count={items.length}
              onMove={(dlt) => ed.update((d) => move(d.products.items, i, dlt))}
              onDelete={() => confirmAction(`Hapus "${p.name}"?`) && ed.update((d) => void d.products.items.splice(i, 1))}
              deleteLabel="Hapus produk"
            >
              <TextField label="Nama" value={p.name} max={60} error={err(`${pre}.name`)} onInput={(v) => ed.update((d) => void (d.products.items[i]!.name = v))} />
              <div style="margin-top:18px">
                <Chips
                  label="Harga"
                  value={mode}
                  options={[["angka", "Angka"], ["teks", "Tulisan bebas"], ["none", "Tanpa harga"]]}
                  onChange={(m) =>
                    ed.update((d) => {
                      const it = d.products.items[i]!;
                      if (m === "angka") (it.price = it.price ?? 0), (it.priceText = null);
                      if (m === "teks") (it.price = null), (it.priceText = it.priceText ?? "mulai ");
                      if (m === "none") (it.price = null), (it.priceText = null);
                    })
                  }
                />
              </div>
              {mode === "angka" && (
                <TextField
                  label="Harga (rupiah)"
                  prefix="Rp"
                  inputMode="numeric"
                  value={p.price ? new Intl.NumberFormat("id-ID").format(p.price) : ""}
                  placeholder="25.000"
                  error={err(`${pre}.price`)}
                  onInput={(v) => ed.update((d) => void (d.products.items[i]!.price = Number(v.replace(/\D/g, "").slice(0, 10)) || 0))}
                />
              )}
              {mode === "teks" && <TextField label="Tulisan harga" value={p.priceText} max={30} placeholder="mulai 15rb" error={err(`${pre}.priceText`)} onInput={(v) => ed.update((d) => void (d.products.items[i]!.priceText = v))} />}
              <TextField label="Keterangan singkat" value={p.description} max={200} multiline rows={2} error={err(`${pre}.description`)} onInput={(v) => ed.update((d) => void (d.products.items[i]!.description = v))} />
              <div style="margin-top:18px">
                <ImageField label="Foto produk" hint="Foto persegi terlihat paling rapi." value={p.imageMediaId ?? null} onChange={(id) => ed.update((d) => void (d.products.items[i]!.imageMediaId = id))} />
              </div>
              <div style="margin-top:18px">
                <Chips label="Label" value={p.badge ?? null} options={[[null, "Tanpa label"], ["terlaris", "Terlaris"], ["baru", "Baru"], ["promo", "Promo"]]} onChange={(b) => ed.update((d) => void (d.products.items[i]!.badge = b))} />
              </div>
              <div style="margin-top:10px">
                <Switch label="Tersedia" hint={p.available ? "Pengunjung bisa memesan" : "Ditandai stok habis"} checked={p.available} onChange={(v) => ed.update((d) => void (d.products.items[i]!.available = v))} />
              </div>
            </ItemShell>
          );
        })}
        {items.length < max ? (
          <button type="button" class="add-btn" onClick={add}>
            <Icon name="plus" />
            Tambah produk
          </button>
        ) : (
          <p class="limit-note">Sudah mencapai batas {max} produk.</p>
        )}
      </div>
    </>
  );
}

// ---------- Galeri ----------
function GalleryEditor() {
  const ed = useEditor();
  const items = ed.content.gallery.items;
  const [picking, setPicking] = useState(false);
  const max = ed.data.limits.gallery;
  return (
    <>
      <div class="panel">
        <Visible sec="gallery" label="Tampilkan galeri" />
        <TextField label="Judul bagian" value={ed.content.gallery.title} max={60} placeholder="Galeri" onInput={(v) => ed.update((d) => void (d.gallery.title = v))} />
      </div>
      <div class="items" style="margin-top:16px">
        {items.map((g, i) => (
          <div class="item" key={g.mediaId + i}>
            <div class="item-head" style="cursor:default">
              <div class="item-thumb" style={{ backgroundImage: `url("${ed.media.get(g.mediaId)?.url ?? ""}")` }} />
              <div class="item-main">
                <input class="input" style="min-height:44px" value={g.caption ?? ""} maxLength={100} placeholder="Keterangan (boleh kosong)" aria-label={`Keterangan foto ${i + 1}`} onInput={(e) => ed.update((d) => void (d.gallery.items[i]!.caption = (e.currentTarget as HTMLInputElement).value))} />
              </div>
              <button type="button" class="icon-btn" disabled={i === 0} onClick={() => ed.update((d) => move(d.gallery.items, i, -1))} aria-label="Pindah ke atas">
                <Icon name="up" />
              </button>
              <button type="button" class="icon-btn" onClick={() => ed.update((d) => void d.gallery.items.splice(i, 1))} aria-label="Keluarkan dari galeri">
                <Icon name="x" />
              </button>
            </div>
          </div>
        ))}
        {items.length < max ? (
          <button type="button" class="add-btn" onClick={() => setPicking(true)}>
            <Icon name="plus" />
            Tambah foto ke galeri
          </button>
        ) : (
          <p class="limit-note">Sudah mencapai batas {max} foto galeri.</p>
        )}
      </div>
      {picking && (
        <MediaSheet
          title="Tambah foto ke galeri"
          multiple
          onPick={(ids) =>
            ed.update((d) => {
              for (const id of ids) if (d.gallery.items.length < max) d.gallery.items.push({ mediaId: id, caption: null });
            })
          }
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

// ---------- Testimoni ----------
function TestimonialsEditor() {
  const ed = useEditor();
  const err = useErr();
  const items = ed.content.testimonials.items;
  const [open, setOpen] = useState<number | null>(null);
  const max = ed.data.limits.testimonials;
  return (
    <>
      <div class="panel">
        <Visible sec="testimonials" label="Tampilkan testimoni" />
        <TextField label="Judul bagian" value={ed.content.testimonials.title} max={60} placeholder="Kata Pelanggan" onInput={(v) => ed.update((d) => void (d.testimonials.title = v))} />
      </div>
      <div class="items" style="margin-top:16px">
        {items.map((t, i) => (
          <ItemShell
            key={i}
            open={open === i}
            onToggle={() => setOpen(open === i ? null : i)}
            initial={(t.name.trim()[0] ?? "?").toUpperCase()}
            title={t.name || "Tanpa nama"}
            meta={`${"★".repeat(t.rating ?? 5)} · ${t.text.slice(0, 40)}${t.text.length > 40 ? "…" : ""}`}
            index={i}
            count={items.length}
            onMove={(dlt) => ed.update((d) => move(d.testimonials.items, i, dlt))}
            onDelete={() => confirmAction("Hapus testimoni ini?") && ed.update((d) => void d.testimonials.items.splice(i, 1))}
            deleteLabel="Hapus"
          >
            <TextField label="Nama pelanggan" value={t.name} max={40} error={err(`testimonials.items.${i}.name`)} onInput={(v) => ed.update((d) => void (d.testimonials.items[i]!.name = v))} />
            <TextField label="Isi testimoni" value={t.text} max={300} multiline rows={3} error={err(`testimonials.items.${i}.text`)} onInput={(v) => ed.update((d) => void (d.testimonials.items[i]!.text = v))} />
            <div style="margin-top:18px">
              <Chips label="Bintang" value={String(t.rating ?? 5)} options={[["5", "★★★★★"], ["4", "★★★★"], ["3", "★★★"]]} onChange={(r) => ed.update((d) => void (d.testimonials.items[i]!.rating = Number(r)))} />
            </div>
          </ItemShell>
        ))}
        {items.length < max ? (
          <button
            type="button"
            class="add-btn"
            onClick={() => {
              ed.update((d) => void d.testimonials.items.push({ name: "Nama pelanggan", text: "Tulis pendapat pelanggan di sini.", rating: 5 }));
              setOpen(items.length);
            }}
          >
            <Icon name="plus" />
            Tambah testimoni
          </button>
        ) : (
          <p class="limit-note">Sudah mencapai batas {max} testimoni.</p>
        )}
      </div>
    </>
  );
}

// ---------- Jam buka ----------
function HoursEditor() {
  const ed = useEditor();
  const hours = ed.content.hours;
  function rowFor(day: number) {
    return hours.find((h) => h.day === day) ?? { day, open: "08:00", close: "17:00", closed: true };
  }
  function set(day: number, patch: Partial<Content["hours"][number]>) {
    ed.update((d) => {
      const idx = d.hours.findIndex((h) => h.day === day);
      if (idx === -1) d.hours.push({ ...rowFor(day), ...patch });
      else d.hours[idx] = { ...d.hours[idx]!, ...patch };
    });
  }
  function copyMonday() {
    const m = rowFor(1);
    ed.update((d) => {
      d.hours = DAY_ORDER.map((day) => {
        const cur = d.hours.find((h) => h.day === day);
        return cur?.closed ? cur : { day, open: m.open, close: m.close, closed: false };
      });
    });
  }
  return (
    <div class="panel">
      <Visible sec="hours" label="Tampilkan jam buka" />
      {DAY_ORDER.map((day) => {
        const h = rowFor(day);
        return (
          <div class="hours-row">
            <div class="hours-day">{DAY[day]}</div>
            <div class="hours-times">
              {h.closed ? (
                <span class="hours-closed">Tutup</span>
              ) : (
                <>
                  <input class="input" type="time" value={h.open} aria-label={`${DAY[day]} buka`} onInput={(e) => set(day, { open: (e.currentTarget as HTMLInputElement).value })} />
                  <span>–</span>
                  <input class="input" type="time" value={h.close} aria-label={`${DAY[day]} tutup`} onInput={(e) => set(day, { close: (e.currentTarget as HTMLInputElement).value })} />
                </>
              )}
              <button type="button" class="link-btn" style="margin-left:auto" onClick={() => set(day, { closed: !h.closed })}>
                {h.closed ? "Buka" : "Tutup"}
              </button>
            </div>
          </div>
        );
      })}
      <button type="button" class="btn btn-quiet btn-sm" style="margin-top:14px" onClick={copyMonday}>
        Samakan semua hari buka dengan Senin
      </button>
    </div>
  );
}

// ---------- Kontak ----------
function ContactEditor() {
  const ed = useEditor();
  const err = useErr();
  const k = ed.content.contact;
  return (
    <>
      <div class="panel">
        <div class="panel-title">WhatsApp</div>
        <TextField label="Nomor WhatsApp" inputMode="tel" value={k.whatsapp ? k.whatsapp.replace(/^62/, "0") : ""} placeholder="081234567890" error={err("contact.whatsapp")} hint="Semua tombol pesan di situs akan membuka chat ke nomor ini." onInput={(v) => ed.update((d) => void (d.contact.whatsapp = v.trim() || null))} />
        <TextField label="Pesan pembuka" value={k.waMessage} max={200} placeholder="Halo, saya mau tanya" hint="Teks yang otomatis terisi saat pengunjung membuka chat." onInput={(v) => ed.update((d) => void (d.contact.waMessage = v))} />
      </div>
      <div class="panel">
        <Visible sec="contact" label="Tampilkan bagian kontak" />
        <TextField label="Alamat" value={k.address} max={200} multiline rows={2} error={err("contact.address")} onInput={(v) => ed.update((d) => void (d.contact.address = v))} />
        <div style="margin-top:10px">
          <Switch label="Tampilkan peta" hint="Peta dibuat otomatis dari alamat di atas." checked={ed.content.sections.map} onChange={(v) => ed.update((d) => void (d.sections.map = v))} />
        </div>
        <TextField label="Tautan Google Maps (opsional)" inputMode="url" value={k.mapsUrl} placeholder="https://maps.app.goo.gl/…" error={err("contact.mapsUrl")} hint="Di aplikasi Google Maps: buka lokasi usaha → Bagikan → Salin link." onInput={(v) => ed.update((d) => void (d.contact.mapsUrl = v))} />
        <div class="row2" style="margin-top:18px">
          <TextField label="Telepon" inputMode="tel" value={k.phone} error={err("contact.phone")} onInput={(v) => ed.update((d) => void (d.contact.phone = v))} />
          <TextField label="Email" type="email" inputMode="email" value={k.email} error={err("contact.email")} onInput={(v) => ed.update((d) => void (d.contact.email = v))} />
        </div>
      </div>
    </>
  );
}

// ---------- Sosial ----------
function SocialEditor() {
  const ed = useEditor();
  const err = useErr();
  const s = ed.content.social;
  const f = (key: keyof Content["social"], label: string, placeholder: string, hint?: string, url?: boolean) => (
    <TextField label={label} value={s[key]} placeholder={placeholder} inputMode={url ? "url" : "text"} hint={hint} error={err(`social.${key}`)} onInput={(v) => ed.update((d) => void (d.social[key] = v))} />
  );
  return (
    <>
      <div class="panel">
        <div class="panel-title">Media sosial</div>
        <p class="hint" style="margin:-6px 0 14px">Cukup tulis nama akunnya saja, tanpa tautan.</p>
        {f("instagram", "Instagram", "warungbusri")}
        {f("tiktok", "TikTok", "warungbusri")}
        {f("facebook", "Facebook", "warungbusri")}
        {f("youtube", "YouTube", "warungbusri")}
      </div>
      <div class="panel">
        <div class="panel-title">Toko online</div>
        {f("shopee", "Tautan toko Shopee", "https://shopee.co.id/…", undefined, true)}
        {f("tokopedia", "Tautan toko Tokopedia", "https://tokopedia.com/…", undefined, true)}
      </div>
    </>
  );
}

// ---------- SEO ----------
function SeoEditor() {
  const ed = useEditor();
  const err = useErr();
  const s = ed.content.seo;
  const c = ed.content;
  const autoTitle = c.business.tagline ? `${c.business.name} — ${c.business.tagline}` : c.business.name;
  return (
    <div class="panel">
      <p class="hint" style="margin-bottom:14px">Bagian ini mengatur tulisan yang muncul di hasil pencarian Google dan saat tautan situs dibagikan di WhatsApp. Kosongkan untuk memakai isi otomatis.</p>
      <TextField label="Judul" value={s.title} max={70} placeholder={autoTitle} error={err("seo.title")} onInput={(v) => ed.update((d) => void (d.seo.title = v))} />
      <TextField label="Deskripsi" value={s.description} max={160} multiline rows={3} placeholder={c.hero.subtitle ?? ""} error={err("seo.description")} onInput={(v) => ed.update((d) => void (d.seo.description = v))} />
      <div style="margin-top:18px">
        <ImageField label="Gambar saat dibagikan" wide hint="Jika kosong, foto utama yang dipakai." value={s.ogImageMediaId ?? null} onChange={(id) => ed.update((d) => void (d.seo.ogImageMediaId = id))} />
      </div>
    </div>
  );
}

export const SECTIONS: SectionDef[] = [
  { key: "pembuka", title: "Nama, logo & bagian pembuka", icon: "store", intro: "Bagian pertama yang dilihat pengunjung.", summary: (c) => ({ text: c.hero.title }), Editor: HeroEditor },
  {
    key: "produk",
    title: "Produk & harga",
    icon: "box",
    intro: "Daftar yang bisa langsung dipesan lewat WhatsApp.",
    summary: (c) => (c.sections.products ? { text: c.products.items.length ? `${c.products.items.length} item` : "Belum ada produk", warn: !c.products.items.length } : { text: "Disembunyikan" }),
    Editor: ProductsEditor,
  },
  {
    key: "kontak",
    title: "Kontak & lokasi",
    icon: "pin",
    intro: "Nomor WhatsApp, alamat, dan peta.",
    summary: (c) => (c.contact.whatsapp ? { text: `WA ${c.contact.whatsapp.replace(/^62/, "0")}` } : { text: "Nomor WhatsApp belum diisi", warn: true }),
    Editor: ContactEditor,
  },
  {
    key: "jam",
    title: "Jam buka",
    icon: "clock",
    intro: "Hari dan jam operasional.",
    summary: (c) => (c.sections.hours ? { text: `Buka ${c.hours.filter((h) => !h.closed).length} hari seminggu` } : { text: "Disembunyikan" }),
    Editor: HoursEditor,
  },
  {
    key: "tentang",
    title: "Tentang usaha",
    icon: "text",
    intro: "Cerita singkat tentang usaha Anda.",
    summary: (c) => (c.sections.about ? { text: c.about.body ? c.about.body.slice(0, 60) : "Belum diisi", warn: !c.about.body } : { text: "Disembunyikan" }),
    Editor: AboutEditor,
  },
  {
    key: "galeri",
    title: "Galeri foto",
    icon: "grid",
    intro: "Foto suasana, proses, atau hasil karya.",
    summary: (c) => (c.sections.gallery ? { text: c.gallery.items.length ? `${c.gallery.items.length} foto` : "Belum ada foto" } : { text: "Disembunyikan" }),
    Editor: GalleryEditor,
  },
  {
    key: "testimoni",
    title: "Testimoni",
    icon: "quote",
    intro: "Pendapat pelanggan tentang usaha Anda.",
    summary: (c) => (c.sections.testimonials ? { text: `${c.testimonials.items.length} testimoni` } : { text: "Disembunyikan" }),
    Editor: TestimonialsEditor,
  },
  {
    key: "sosial",
    title: "Media sosial & toko online",
    icon: "share",
    intro: "Instagram, TikTok, Shopee, dan lainnya.",
    summary: (c) => {
      const n = Object.values(c.social).filter(Boolean).length;
      return { text: n ? `${n} akun terhubung` : "Belum ada" };
    },
    Editor: SocialEditor,
  },
  { key: "google", title: "Tampilan di Google & WhatsApp", icon: "search", intro: "Judul dan gambar saat situs dibagikan.", summary: (c) => ({ text: c.seo.title ? "Diatur manual" : "Otomatis" }), Editor: SeoEditor },
];
