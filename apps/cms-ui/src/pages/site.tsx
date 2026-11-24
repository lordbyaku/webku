import type { ComponentChildren } from "preact";
import { useMemo, useState } from "preact/hooks";
import { CATEGORY_LABEL, type Category } from "@umkm/content-schema";
import { fontFaceCss, fontStack, LAYOUT_META as LAYOUTS, TEMPLATES, THEMES } from "@umkm/templates/catalog";

const SWATCH_FONTS = fontFaceCss([...new Set(Object.values(THEMES).map((t) => t.fd))]);
import { go } from "../router";
import { displayUrl } from "../api";
import { useEditor } from "../editor";
import { Icon } from "../components/Icon";
import { LivePreview, PreviewSheet, PublishBar, SaveIndicator } from "../components/publish";
import { tanggal, toast } from "../components/ui";
import { SECTIONS, sectionsWithErrors } from "./sections";
import { useEffect } from "preact/hooks";

function RecoveryNotice() {
  const ed = useEditor();
  if (!ed.recovery) return null;
  return (
    <div class="notice info" role="alert">
      <Icon name="info" />
      <div>
        <b>Ada perubahan yang belum tersimpan</b>
        Perubahan dari {new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(ed.recovery.at)} belum sempat disimpan, misalnya karena sesi berakhir.
        <div class="btn-row" style="margin-top:10px">
          <button class="btn btn-sm" onClick={ed.restoreRecovery}>
            Pulihkan perubahan
          </button>
          <button class="btn btn-quiet btn-sm" onClick={ed.discardRecovery}>
            Abaikan
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorNotice({ current }: { current?: string }) {
  const ed = useEditor();
  const list = sectionsWithErrors(ed.errors);
  if (Object.keys(ed.errors).length === 0) return null;
  const elsewhere = list.filter((s) => s.key !== current);
  return (
    <div class="notice danger" role="alert">
      <Icon name="alert" />
      <div>
        <b>Ada isian yang perlu diperbaiki</b>
        Perubahan belum tersimpan sampai isian yang ditandai merah diperbaiki.
        {elsewhere.length > 0 && (
          <div style="margin-top:8px">
            Periksa juga:{" "}
            {elsewhere.map((s, i) => (
              <>
                {i > 0 && ", "}
                <a href={`#${ed.base}/edit/${s.key}`}>{s.title}</a>
              </>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function TopBar({ title, back, right }: { title: ComponentChildren; back?: string; right?: ComponentChildren }) {
  return (
    <header class="topbar">
      <div class="topbar-in">
        {back !== undefined && (
          <a class="icon-btn" href={`#${back}`} aria-label="Kembali" style="margin-left:-8px">
            <Icon name="chevL" />
          </a>
        )}
        <div class="topbar-title">{title}</div>
        {right}
      </div>
    </header>
  );
}

function HostingNotice() {
  const ed = useEditor();
  const h = ed.data.tenant.hosting;
  if (h.state === "ok" || h.state === "none") return null;
  const wa = ed.data.contactAdminWa;
  const expired = h.state === "expired";
  const msg = expired
    ? `Masa hosting berakhir ${tanggal(h.until)}. Situs masih tayang selama masa tenggang. Perpanjang agar tidak dinonaktifkan.`
    : `Masa hosting berakhir ${tanggal(h.until)}. Perpanjangan Rp 100.000 untuk 1 tahun.`;
  return (
    <div class={`notice${expired ? " danger" : ""}`} role="note">
      <Icon name="alert" />
      <div>
        <b>{expired ? "Masa hosting sudah berakhir" : "Masa hosting segera berakhir"}</b>
        {msg}
        {wa && !ed.isAdmin && (
          <div style="margin-top:8px">
            <a class="link-btn" href={`https://wa.me/${wa}?text=${encodeURIComponent(`Halo, saya mau perpanjang hosting ${displayUrl(ed.data.urls.site)}`)}`} target="_blank" rel="noopener">
              Hubungi admin untuk perpanjang
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function SiteAddress() {
  const ed = useEditor();
  // Tampilkan alamat publik, mis. "web.rela.my.id/warung-busri" — bagian nama usaha ditebalkan.
  const shown = displayUrl(ed.data.urls.site);
  const at = shown.lastIndexOf(ed.data.tenant.slug);
  const [before, after] = at >= 0 ? [shown.slice(0, at), shown.slice(at + ed.data.tenant.slug.length)] : [shown, ""];
  const live = ed.data.tenant.status === "active";
  async function share() {
    const text = `Kunjungi website ${ed.content.business.name}: ${ed.data.urls.site}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }
  return (
    <section class="site-head">
      <p class="greet">{live ? "Website Anda tayang di" : "Alamat website Anda nanti"}</p>
      <a class="site-addr" href={ed.data.urls.site} target="_blank" rel="noopener">
        <span class="sub">{before}</span>
        {at >= 0 ? ed.data.tenant.slug : ""}
        <span class="sub">{after}</span>
      </a>
      <div class="site-actions">
        {live && (
          <a class="btn btn-quiet btn-sm" href={ed.data.urls.site} target="_blank" rel="noopener">
            <Icon name="external" />
            Buka situs
          </a>
        )}
        {live && (
          <button class="btn btn-quiet btn-sm" onClick={share}>
            <Icon name="wa" />
            Bagikan ke WhatsApp
          </button>
        )}
      </div>
    </section>
  );
}

function templateName(id: string) {
  return TEMPLATES.find((t) => t.id === id)?.name ?? id;
}

export function SiteHome({ header }: { header?: ComponentChildren }) {
  const ed = useEditor();
  const c = ed.content;
  return (
    <>
      {header}
      <div class="layout">
        <div class="with-preview">
          <div class="editor-col">
            <SiteAddress />
            <RecoveryNotice />
            <ErrorNotice />
            <HostingNotice />
            {ed.data.tenant.status === "suspended" && (
              <div class="notice danger">
                <Icon name="alert" />
                <div>
                  <b>Situs sedang dinonaktifkan</b>Hubungi admin untuk mengaktifkan kembali.
                </div>
              </div>
            )}
            <div class="group">
              <h2 class="group-title">Isi website</h2>
              <nav class="rows" aria-label="Bagian website">
                {SECTIONS.map((s) => {
                  const sum = s.summary(c);
                  const bad = sectionsWithErrors(ed.errors).some((x) => x.key === s.key);
                  return (
                    <a class="row" href={`#${ed.base}/edit/${s.key}`}>
                      <span class="row-ico">
                        <Icon name={s.icon} />
                      </span>
                      <span class="row-main">
                        <span class="row-title" style="display:block">
                          {s.title}
                        </span>
                        <span class={`row-sub${sum.warn || bad ? " warn" : ""}`} style="display:block">
                          {bad ? "Ada isian yang perlu diperbaiki" : sum.text}
                        </span>
                      </span>
                      <span class="row-chev">
                        <Icon name="chevR" />
                      </span>
                    </a>
                  );
                })}
              </nav>
            </div>
            <div class="group">
              <h2 class="group-title">Tampilan</h2>
              <div class="rows">
                <a class="row" href={`#${ed.base}/template`}>
                  <span class="row-ico">
                    <Icon name="palette" />
                  </span>
                  <span class="row-main">
                    <span class="row-title" style="display:block">
                      Desain website
                    </span>
                    <span class="row-sub" style="display:block">
                      {templateName(ed.data.tenant.templateId)}
                    </span>
                  </span>
                  <span class="row-chev">
                    <Icon name="chevR" />
                  </span>
                </a>
              </div>
            </div>
          </div>
          <LivePreview />
        </div>
      </div>
      <PublishBar />
    </>
  );
}

export function SectionPage({ sectionKey }: { sectionKey: string }) {
  const ed = useEditor();
  const s = SECTIONS.find((x) => x.key === sectionKey);
  if (!s) {
    go(ed.base || "/");
    return null;
  }
  const E = s.Editor;
  return (
    <>
      <TopBar title={s.title} back={ed.base || "/"} right={<SaveIndicator />} />
      <div class="layout">
        <div class="with-preview">
          <div class="editor-col">
            <div class="ed-head">
              <h1>{s.title}</h1>
              <p>{s.intro}</p>
            </div>
            <RecoveryNotice />
            <ErrorNotice current={s.key} />
            <E />
          </div>
          <LivePreview />
        </div>
      </div>
      <PublishBar />
    </>
  );
}

const FILTERS: Array<[Category | "semua", string]> = [
  ["semua", "Semua"],
  ["kuliner", CATEGORY_LABEL.kuliner],
  ["fashion", CATEGORY_LABEL.fashion],
  ["jasa", CATEGORY_LABEL.jasa],
  ["cantik", CATEGORY_LABEL.cantik],
  ["toko", CATEGORY_LABEL.toko],
  ["kriya", CATEGORY_LABEL.kriya],
];

export function TemplatePage() {
  const ed = useEditor();
  const current = ed.data.tenant.templateId;
  const [filter, setFilter] = useState<Category | "semua">((TEMPLATES.find((t) => t.id === current)?.category as Category) ?? "semua");
  const [chosen, setChosen] = useState(current);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const list = useMemo(() => (filter === "semua" ? TEMPLATES : TEMPLATES.filter((t) => t.category === filter)), [filter]);
  const locked = !ed.isAdmin && !ed.data.tenant.allowTemplateSwitch;
  // Pratinjau desain lain hanya berlaku di halaman ini.
  useEffect(() => () => ed.setPreviewTemplate(null), []);

  function choose(id: string) {
    setChosen(id);
    ed.setPreviewTemplate(id === current ? null : id);
  }

  async function apply() {
    setSaving(true);
    try {
      await ed.setTemplate(chosen);
      toast("Desain diganti. Tekan Terbitkan agar tampil di situs.");
      go(ed.base || "/");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal mengganti desain", true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopBar title="Desain website" back={ed.base || "/"} />
      <div class="layout">
        <div class="with-preview">
          <div class="editor-col">
            <div class="ed-head">
              <h1>Pilih desain</h1>
              <p>Isi website tetap sama, hanya tampilannya yang berubah.</p>
            </div>
            {locked && (
              <div class="notice info">
                <Icon name="info" />
                <div>Penggantian desain dikunci untuk situs ini. Hubungi admin jika ingin mengganti.</div>
              </div>
            )}
            <div class="tpl-filter" role="group" aria-label="Kategori">
              {FILTERS.map(([v, l]) => (
                <button class="chip" aria-pressed={filter === v ? "true" : "false"} onClick={() => setFilter(v)}>
                  {l}
                </button>
              ))}
            </div>
            <style>{SWATCH_FONTS}</style>
            <div class="tpl-grid">
              {list.map((t) => {
                const th = THEMES[t.theme]!;
                return (
                  <button class="tpl" aria-pressed={chosen === t.id ? "true" : "false"} disabled={locked} onClick={() => choose(t.id)}>
                    <div class="tpl-swatch" style={{ background: th.bg }} aria-hidden="true">
                      <div class="sw-hero" style={{ background: th.p, color: th.onP }}>
                        <b style={{ fontFamily: LAYOUTS[t.layout]?.forceSerif && !["fraunces", "playfair", "dmserif", "cormorant", "instrument"].includes(th.fd) ? fontStack("cormorant") : fontStack(th.fd), fontWeight: th.dw, textTransform: th.du ? "uppercase" : undefined }}>Aa</b>
                        <i />
                      </div>
                      {LAYOUTS[t.layout]?.products === "menu" || LAYOUTS[t.layout]?.products === "stack" ? (
                        <div class="sw-lines">
                          <span style={{ background: th.tx }} />
                          <span style={{ background: th.tx, width: "70%" }} />
                        </div>
                      ) : (
                        <div class="sw-cards">
                          <span style={{ background: th.sf }} />
                          <span style={{ background: th.sf }} />
                          <span style={{ background: th.sf }} />
                        </div>
                      )}
                    </div>
                    <div class="tpl-name">{t.name}</div>
                    <div class="tpl-meta">{t.id === current ? <span class="badge ok">Dipakai sekarang</span> : `${LAYOUTS[t.layout]?.name} · ${th.name}`}</div>
                  </button>
                );
              })}
            </div>
            <div class="tpl-actions">
              <button class="btn btn-quiet" onClick={() => setPreviewing(true)}>
                <Icon name="eye" />
                Coba lihat
              </button>
              <button class="btn" disabled={locked || chosen === current || saving} onClick={apply}>
                {saving ? "Menyimpan…" : "Pakai desain ini"}
              </button>
            </div>
          </div>
          <LivePreview />
        </div>
      </div>
      {previewing && <PreviewSheet templateId={chosen} onClose={() => setPreviewing(false)} />}
    </>
  );
}
