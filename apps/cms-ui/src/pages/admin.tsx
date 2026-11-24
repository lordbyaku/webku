import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@umkm/content-schema";
import { TEMPLATES } from "@umkm/templates/catalog";
import { api, ApiError, displayUrl, siteUrlFor } from "../api";
import { Icon } from "../components/Icon";
import { confirmAction, copyText, Loading, rupiah, tanggal, TextField, toast } from "../components/ui";
import { go } from "../router";

interface TenantDto {
  id: string;
  slug: string;
  businessName: string;
  category: Category;
  templateId: string;
  status: "draft" | "active" | "suspended" | "deleted";
  paymentStatus: "unpaid" | "paid";
  allowTemplateSwitch: boolean;
  showBranding: boolean;
  mediaUsedBytes: number;
  mediaQuotaBytes: number;
  hostingUntil: number | null;
  hostingState: string;
  publishedAt: number | null;
  createdAt: number;
  username?: string | null;
  notes?: string | null;
}

const STATUS: Record<string, [string, string]> = {
  draft: ["Belum tayang", ""],
  active: ["Tayang", "ok"],
  suspended: ["Nonaktif", "bad"],
  deleted: ["Dihapus", "bad"],
};

function StatusBadge({ s }: { s: string }) {
  const [l, c] = STATUS[s] ?? [s, ""];
  return <span class={`badge ${c}`}>{l}</span>;
}

function HostingBadge({ t }: { t: Pick<TenantDto, "hostingUntil" | "hostingState"> }) {
  if (!t.hostingUntil) return <span class="badge">Belum mulai</span>;
  const cls = t.hostingState === "expired" ? "bad" : t.hostingState.startsWith("expiring") ? "warn" : "";
  return <span class={`badge ${cls}`}>{tanggal(t.hostingUntil)}</span>;
}

export function AdminShell({ path, children, onLogout }: { path: string; children: ComponentChildren; onLogout: () => void }) {
  const nav: Array<[string, string]> = [
    ["/admin", "Pelanggan"],
    ["/admin/new", "Tambah"],
    ["/admin/hosting", "Hosting"],
  ];
  return (
    <>
      <header class="topbar">
        <div class="topbar-in">
          <nav class="adm-nav" aria-label="Menu admin" style="flex:1">
            {nav.map(([href, label]) => (
              <a href={`#${href}`} aria-current={path === href || (href === "/admin" && path.startsWith("/admin/t/")) ? "page" : undefined}>
                {label}
              </a>
            ))}
          </nav>
          <button class="icon-btn" onClick={onLogout} aria-label="Keluar" title="Keluar">
            <Icon name="logout" />
          </button>
        </div>
      </header>
      <div class="layout" style="padding-bottom:48px">{children}</div>
    </>
  );
}

// ---------- daftar pelanggan ----------
export function AdminTenants() {
  const [stats, setStats] = useState<any>(null);
  const [list, setList] = useState<TenantDto[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [repub, setRepub] = useState<string | null>(null);

  async function load() {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (status === "unpaid") qs.set("unpaid", "1");
    else if (status) qs.set("status", status);
    const [s, l] = await Promise.all([api("GET", "/admin/stats"), api<TenantDto[]>("GET", `/admin/tenants?${qs}`)]);
    setStats(s);
    setList(l);
  }
  useEffect(() => {
    const t = setTimeout(() => load().catch((e) => toast(e.message, true)), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, status]);

  async function republishAll() {
    if (!confirmAction("Terbitkan ulang semua situs yang tayang? Lakukan ini setelah ada perbaikan desain template.")) return;
    const all = await api<TenantDto[]>("GET", "/admin/tenants?status=active");
    let fail = 0;
    for (let i = 0; i < all.length; i++) {
      setRepub(`Menerbitkan ulang ${i + 1} dari ${all.length}…`);
      try {
        await api("POST", "/admin/republish", { tenantId: all[i]!.id });
      } catch {
        fail++;
      }
    }
    setRepub(null);
    toast(fail ? `Selesai, ${fail} situs gagal. Coba lagi nanti.` : `${all.length} situs diterbitkan ulang.`, fail > 0);
  }

  if (!list) return <Loading />;
  return (
    <>
      {stats && (
        <div class="stats">
          <div class="stat">
            <b>{stats.tenants.active}</b>
            <span>Situs tayang</span>
          </div>
          <div class="stat">
            <b>{stats.tenants.draft}</b>
            <span>Belum tayang</span>
          </div>
          <div class={`stat${stats.unpaid ? " warn" : ""}`}>
            <b>{stats.unpaid}</b>
            <span>Belum bayar</span>
          </div>
          <a class={`stat${stats.hostingExpiring30 + stats.hostingExpired ? " warn" : ""}`} href="#/admin/hosting" style="text-decoration:none;color:inherit">
            <b>{stats.hostingExpiring30 + stats.hostingExpired}</b>
            <span>Hosting perlu diperpanjang</span>
          </a>
        </div>
      )}
      {stats && (
        <p class="hint" style="margin:-12px 0 20px">
          {stats.lastBackupAt ? `Backup otomatis terakhir: ${tanggal(stats.lastBackupAt)}` : "Backup otomatis belum pernah berjalan (berjalan tiap jam di server produksi)."}
        </p>
      )}
      <div class="toolbar">
        <input class="input" type="search" placeholder="Cari nama usaha atau subdomain" value={q} onInput={(e) => setQ((e.currentTarget as HTMLInputElement).value)} aria-label="Cari pelanggan" />
        <select class="select" style="width:auto;min-height:44px" value={status} onChange={(e) => setStatus((e.currentTarget as HTMLSelectElement).value)} aria-label="Saring status">
          <option value="">Semua status</option>
          <option value="active">Tayang</option>
          <option value="draft">Belum tayang</option>
          <option value="suspended">Nonaktif</option>
          <option value="unpaid">Belum bayar</option>
          <option value="deleted">Dihapus</option>
        </select>
        <a class="btn btn-sm" href="#/admin/new">
          <Icon name="plus" />
          Tambah
        </a>
      </div>
      {list.length === 0 ? (
        <div class="panel" style="text-align:center">
          <p style="margin-bottom:14px">{q || status ? "Tidak ada pelanggan yang cocok." : "Belum ada pelanggan. Tambahkan pelanggan pertama Anda."}</p>
          {!q && !status && (
            <a class="btn" href="#/admin/new">
              Tambah pelanggan
            </a>
          )}
        </div>
      ) : (
        <table class="table responsive">
          <thead>
            <tr>
              <th>Usaha</th>
              <th>Status</th>
              <th>Pembayaran</th>
              <th>Hosting sampai</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr class="click" onClick={() => go(`/admin/t/${t.id}`)}>
                <td data-l="Usaha">
                  <div>
                    <a href={`#/admin/t/${t.id}`} style="font-weight:700;color:var(--ink);text-decoration:none">
                      {t.businessName}
                    </a>
                    <div class="hint">{t.slug}</div>
                  </div>
                </td>
                <td data-l="Status">
                  <StatusBadge s={t.status} />
                </td>
                <td data-l="Pembayaran">{t.paymentStatus === "paid" ? <span class="badge ok">Lunas</span> : <span class="badge warn">Belum bayar</span>}</td>
                <td data-l="Hosting">
                  <HostingBadge t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div class="btn-row">
        <button class="btn btn-quiet btn-sm" disabled={!!repub} onClick={republishAll}>
          <Icon name="refresh" />
          {repub ?? "Terbitkan ulang semua situs"}
        </button>
      </div>
    </>
  );
}

// ---------- tambah pelanggan ----------
function slugify(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
}

export function AdminNew() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState<Category>("kuliner");
  const [templateId, setTemplateId] = useState("kuliner-01");
  const [username, setUsername] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const s = slugTouched ? slug : slugify(name);
  const u = username || s;

  async function submit(e: Event) {
    e.preventDefault();
    setBusy(true);
    setFields({});
    try {
      setResult(await api("POST", "/admin/tenants", { businessName: name, slug: s, category, templateId, owner: { username: u } }));
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields ?? {});
        toast(err.message, true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div class="editor-col">
        <div class="ed-head">
          <h1>{name} sudah dibuat</h1>
          <p>Situs belum tayang. Isi kontennya, lalu tekan Terbitkan pertama kali.</p>
        </div>
        <div class="panel">
          <div class="panel-title">Pesan untuk pelanggan</div>
          <p class="hint">Password sementara hanya ditampilkan sekali. Salin dan kirim lewat WhatsApp.</p>
          <div class="copybox">{result.waMessage}</div>
          <div class="btn-row">
            <button class="btn" onClick={() => copyText(result.waMessage, "Pesan disalin")}>
              <Icon name="copy" />
              Salin pesan
            </button>
            <a class="btn btn-quiet" href={`#/admin/t/${result.tenantId}/site`}>
              Isi konten sekarang
            </a>
          </div>
        </div>
      </div>
    );
  }

  const tpls = TEMPLATES.filter((t) => t.category === category);
  return (
    <form class="editor-col" onSubmit={submit}>
      <div class="ed-head">
        <h1>Tambah pelanggan</h1>
        <p>Situs dibuat dengan isi contoh sesuai kategori, siap Anda sesuaikan.</p>
      </div>
      <div class="panel">
        <TextField label="Nama usaha" value={name} max={60} error={fields.businessName} onInput={setName} required />
        <TextField
          label="Alamat situs"
          value={s}
          max={40}
          error={fields.slug}
          hint={s ? `Situs akan tayang di ${displayUrl(siteUrlFor(s))}` : "Huruf kecil, angka, dan tanda hubung."}
          onInput={(v) => (setSlugTouched(true), setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "")))}
        />
        <div class="field" style="margin-top:18px">
          <label class="label" for="cat">
            Kategori
          </label>
          <select
            id="cat"
            class="select"
            value={category}
            onChange={(e) => {
              const c = (e.currentTarget as HTMLSelectElement).value as Category;
              setCategory(c);
              setTemplateId(TEMPLATES.find((t) => t.category === c)?.id ?? "kuliner-01");
            }}
          >
            {CATEGORIES.map((c) => (
              <option value={c}>{CATEGORY_LABEL[c]}</option>
            ))}
          </select>
        </div>
        <div class="field" style="margin-top:18px">
          <label class="label" for="tpl">
            Desain
          </label>
          <select id="tpl" class="select" value={templateId} onChange={(e) => setTemplateId((e.currentTarget as HTMLSelectElement).value)}>
            {(tpls.length ? tpls : TEMPLATES).map((t) => (
              <option value={t.id}>{t.name}</option>
            ))}
            <optgroup label="Kategori lain">
              {TEMPLATES.filter((t) => t.category !== category).map((t) => (
                <option value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <TextField label="Username pelanggan" value={u} max={32} error={fields["owner.username"]} hint="Dipakai pelanggan untuk masuk ke CMS." onInput={(v) => setUsername(v.toLowerCase())} />
      </div>
      <div class="btn-row">
        <button class="btn" type="submit" disabled={busy || !name || !s}>
          {busy ? "Membuat…" : "Buat situs pelanggan"}
        </button>
      </div>
    </form>
  );
}

// ---------- detail pelanggan ----------
const AUDIT_LABEL: Record<string, string> = {
  "auth.login": "Masuk ke CMS",
  "auth.login_failed": "Gagal masuk",
  "auth.locked": "Akun terkunci (5x salah)",
  "auth.change_password": "Ganti password",
  "content.save": "Menyimpan konten",
  "site.publish": "Menerbitkan situs",
  "site.republish": "Terbit ulang",
  "site.template": "Mengganti desain",
  "media.upload": "Mengunggah foto",
  "media.delete": "Menghapus foto",
  "admin.tenant_create": "Admin membuat pelanggan",
  "admin.tenant_update": "Admin mengubah pengaturan",
  "admin.tenant_active": "Admin mengaktifkan situs",
  "admin.tenant_suspended": "Admin menonaktifkan situs",
  "admin.tenant_delete": "Admin menghapus pelanggan",
  "admin.tenant_restore": "Admin memulihkan pelanggan",
  "admin.slug_change": "Admin mengganti alamat situs",
  "admin.reset_password": "Admin reset password",
  "admin.unlock": "Admin membuka kunci akun",
  "admin.payment": "Admin mencatat pembayaran",
  "admin.payment_delete": "Admin menghapus pembayaran",
  "admin.hosting_renew": "Admin memperpanjang hosting",
  "admin.hosting_set": "Admin mengubah tanggal hosting",
  "admin.export": "Admin mengekspor data",
};

function waktu(ms: number) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(ms);
}

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AdminTenant({ id }: { id: string }) {
  const [d, setD] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [temp, setTemp] = useState<{ username: string; temporaryPassword: string } | null>(null);
  const [pay, setPay] = useState({ kind: "setup", amount: "100000", method: "", from: "previous_end" });
  const [notes, setNotes] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    Promise.all([api("GET", `/admin/tenants/${id}`), api("GET", `/admin/audit?tenantId=${encodeURIComponent(id)}`)])
      .then(([x, a]) => {
        setD(x);
        setNotes(x.tenant.notes ?? "");
        setAudit(a.items.slice(0, 25));
      })
      .catch((e) => toast(e.message, true));
  useEffect(() => {
    load();
  }, [id]);

  /** Jalankan aksi sekali saja: semua tombol terkunci selama proses (mencegah klik ganda). */
  async function act(fn: () => Promise<unknown>, done: string) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast(done);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal", true);
    } finally {
      setBusy(false);
    }
  }

  if (!d) return <Loading />;
  const t: TenantDto & { status: string } = d.tenant;
  const owner = d.users[0];
  const host = displayUrl(siteUrlFor(t.slug));
  const locked = owner?.locked_until && owner.locked_until > Date.now();
  const deleted = t.status === "deleted";

  if (deleted) {
    return (
      <div class="editor-col" style="max-width:820px">
        <div class="ed-head">
          <h1>{t.businessName}</h1>
          <p>Pelanggan ini sudah dihapus. Data akan dihapus permanen 30 hari setelah tanggal penghapusan.</p>
        </div>
        <div class="btn-row">
          <button class="btn" disabled={busy} onClick={() => act(() => api("POST", `/admin/tenants/${id}/restore`), "Pelanggan dipulihkan dalam status nonaktif")}>
            Pulihkan pelanggan
          </button>
          <button class="btn btn-quiet" disabled={busy} onClick={() => act(async () => download(`${t.slug}.json`, await api("GET", `/admin/tenants/${id}/export`)), "Data diekspor")}>
            Ekspor data
          </button>
        </div>
      </div>
    );
  }

  return (
    <fieldset class="editor-col" style="max-width:820px;border:0;padding:0;margin:0;min-width:0" disabled={busy} aria-busy={busy}>
      <div class="ed-head" style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end">
        <div>
          <h1>{t.businessName}</h1>
          <p>
            <a href={siteUrlFor(t.slug)} target="_blank" rel="noopener">
              {host}
            </a>
          </p>
        </div>
        <a class="btn" href={`#/admin/t/${id}/site`}>
          Kelola isi situs
        </a>
      </div>

      <div class="panel">
        <dl class="kv">
          <dt>Status</dt>
          <dd>
            <StatusBadge s={t.status} />
          </dd>
          <dt>Pembayaran</dt>
          <dd>{t.paymentStatus === "paid" ? <span class="badge ok">Lunas</span> : <span class="badge warn">Belum bayar</span>}</dd>
          <dt>Hosting sampai</dt>
          <dd>
            <HostingBadge t={t} />
          </dd>
          <dt>Desain</dt>
          <dd>{TEMPLATES.find((x) => x.id === t.templateId)?.name ?? t.templateId}</dd>
          <dt>Username</dt>
          <dd>
            {owner?.username}
            {owner?.must_change_pw ? " (belum ganti password)" : ""}
            {locked ? " (terkunci sementara)" : ""}
          </dd>
          <dt>Terakhir terbit</dt>
          <dd>{tanggal(t.publishedAt)}</dd>
          <dt>Foto</dt>
          <dd>
            {(t.mediaUsedBytes / 1048576).toFixed(1).replace(".", ",")} MB dari {Math.round(t.mediaQuotaBytes / 1048576)} MB
          </dd>
        </dl>
      </div>

      <div class="panel">
        <div class="panel-title">Pembayaran & hosting</div>
        <div class="row2">
          <div class="field">
            <label class="label" for="pk">
              Jenis
            </label>
            <select id="pk" class="select" value={pay.kind} onChange={(e) => setPay({ ...pay, kind: (e.currentTarget as HTMLSelectElement).value })}>
              <option value="setup">Pembuatan website</option>
              <option value="hosting">Perpanjangan hosting 1 tahun</option>
              <option value="maintenance">Maintenance</option>
              <option value="addon">Tambahan lain</option>
            </select>
          </div>
          <TextField label="Nominal" prefix="Rp" inputMode="numeric" value={pay.amount} onInput={(v) => setPay({ ...pay, amount: v.replace(/\D/g, "") })} />
        </div>
        {pay.kind === "hosting" && (
          <div class="field">
            <label class="label" for="pf">
              Masa 1 tahun dihitung dari
            </label>
            <select id="pf" class="select" value={pay.from} onChange={(e) => setPay({ ...pay, from: (e.currentTarget as HTMLSelectElement).value })}>
              <option value="previous_end">Tanggal habis sebelumnya ({tanggal(t.hostingUntil)})</option>
              <option value="today">Hari ini</option>
            </select>
            <div class="hint">Pilih "Hari ini" bila masa hosting sudah lama lewat.</div>
          </div>
        )}
        <TextField label="Cara bayar" value={pay.method} placeholder="Transfer BCA, QRIS, tunai…" onInput={(v) => setPay({ ...pay, method: v })} />
        <div class="btn-row">
          <button
            class="btn"
            disabled={!pay.amount || busy}
            onClick={() =>
              act(
                () => api("POST", `/admin/tenants/${id}/payments`, { kind: pay.kind, amountIdr: Number(pay.amount), method: pay.method || undefined, from: pay.from }),
                pay.kind === "hosting" ? "Hosting diperpanjang 1 tahun" : "Pembayaran dicatat",
              )
            }
          >
            {busy ? "Menyimpan…" : "Catat pembayaran"}
          </button>
        </div>
        {d.payments.length > 0 && (
          <table class="table responsive" style="margin-top:18px">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jenis</th>
                <th>Nominal</th>
                <th>Cara</th>
                <th>
                  <span class="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {d.payments.map((p: any) => (
                <tr>
                  <td data-l="Tanggal">{tanggal(p.paid_at)}</td>
                  <td data-l="Jenis">{{ setup: "Pembuatan", hosting: "Hosting", maintenance: "Maintenance", addon: "Tambahan" }[p.kind as string] ?? p.kind}</td>
                  <td data-l="Nominal">{rupiah(p.amount_idr)}</td>
                  <td data-l="Cara">{p.method ?? "–"}</td>
                  <td data-l="">
                    <button
                      class="link-btn"
                      style="color:var(--cabai)"
                      onClick={() => confirmAction(`Hapus catatan pembayaran ${rupiah(p.amount_idr)}?`) && act(() => api("DELETE", `/admin/payments/${p.id}`), "Catatan pembayaran dihapus")}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div class="panel">
        <div class="panel-title">Akun pelanggan</div>
        {temp ? (
          <>
            <div class="copybox">{`Username: ${temp.username}\nPassword sementara: ${temp.temporaryPassword}\n\nMasuk di ${location.origin} lalu buat password baru.`}</div>
            <button class="btn" onClick={() => copyText(`Username: ${temp.username}\nPassword sementara: ${temp.temporaryPassword}\n\nMasuk di ${location.origin} lalu buat password baru.`, "Disalin")}>
              <Icon name="copy" />
              Salin
            </button>
          </>
        ) : (
          <div class="btn-row" style="margin-top:0">
            <button
              class="btn btn-quiet"
              onClick={async () => {
                if (!confirmAction("Buat password sementara baru? Pelanggan akan keluar dari semua perangkat.")) return;
                setBusy(true);
                try {
                  setTemp(await api("POST", `/admin/users/${owner.id}/reset-password`));
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Gagal", true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Reset password
            </button>
            {locked && (
              <button class="btn btn-quiet" onClick={() => act(() => api("POST", `/admin/users/${owner.id}/unlock`), "Akun dibuka")}>
                Buka kunci akun
              </button>
            )}
          </div>
        )}
      </div>

      <div class="panel">
        <div class="panel-title">Pengaturan</div>
        <label class="switch">
          <span class="label">Pelanggan boleh ganti desain</span>
          <input type="checkbox" checked={t.allowTemplateSwitch} onChange={(e) => act(() => api("PATCH", `/admin/tenants/${id}`, { allowTemplateSwitch: (e.currentTarget as HTMLInputElement).checked }), "Disimpan")} />
        </label>
        <label class="switch">
          <span class="label">Tampilkan tulisan "Dibuat dengan" di bawah situs</span>
          <input type="checkbox" checked={t.showBranding} onChange={(e) => act(() => api("PATCH", `/admin/tenants/${id}`, { showBranding: (e.currentTarget as HTMLInputElement).checked }), "Disimpan. Berlaku setelah terbit ulang.")} />
        </label>
        <TextField label="Catatan internal" multiline rows={3} max={2000} value={notes} onInput={setNotes} hint="Hanya terlihat oleh admin." />
        <div class="btn-row">
          <button class="btn btn-quiet btn-sm" onClick={() => act(() => api("PATCH", `/admin/tenants/${id}`, { notes }), "Catatan disimpan")}>
            Simpan catatan
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Alamat situs</div>
        <TextField
          label="Subdomain baru"
          value={newSlug}
          max={40}
          placeholder={t.slug}
          hint={newSlug ? `Situs akan pindah ke ${displayUrl(siteUrlFor(newSlug))}. Alamat lama berhenti berfungsi.` : `Sekarang: ${host}`}
          onInput={(v) => setNewSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
        />
        <div class="btn-row">
          <button
            class="btn btn-quiet btn-sm"
            disabled={!newSlug || newSlug === t.slug}
            onClick={() =>
              confirmAction(`Ganti alamat ${host} menjadi ${displayUrl(siteUrlFor(newSlug))}? Alamat lama tidak bisa dibuka lagi.`) &&
              act(async () => {
                await api("POST", `/admin/tenants/${id}/slug`, { slug: newSlug });
                setNewSlug("");
              }, "Alamat situs diganti")
            }
          >
            Ganti alamat
          </button>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">Status situs</div>
        <div class="btn-row" style="margin-top:0">
          {t.status === "active" && (
            <button class="btn btn-quiet" onClick={() => confirmAction(`Nonaktifkan ${host}? Pengunjung akan melihat halaman "situs tidak aktif".`) && act(() => api("POST", `/admin/tenants/${id}/status`, { status: "suspended" }), "Situs dinonaktifkan")}>
              Nonaktifkan situs
            </button>
          )}
          {t.status === "suspended" && (
            <button class="btn" onClick={() => act(() => api("POST", `/admin/tenants/${id}/status`, { status: "active" }), "Situs aktif kembali")}>
              Aktifkan kembali
            </button>
          )}
          <button class="btn btn-quiet" onClick={() => act(async () => download(`${t.slug}.json`, await api("GET", `/admin/tenants/${id}/export`)), "Data diekspor")}>
            Ekspor data
          </button>
          <button
            class="btn btn-danger"
            onClick={() =>
              confirmAction(`Hapus pelanggan ${t.businessName}? Situs langsung tidak bisa dibuka. Data masih bisa dipulihkan selama 30 hari, setelah itu dihapus permanen.`) &&
              act(() => api("DELETE", `/admin/tenants/${id}`), "Pelanggan dihapus")
            }
          >
            Hapus pelanggan
          </button>
        </div>
        {t.status === "draft" && <p class="hint" style="margin-top:12px">Situs akan tayang setelah Anda menekan "Terbitkan pertama kali" di halaman Kelola isi situs.</p>}
      </div>

      <div class="panel">
        <div class="panel-title">Aktivitas terakhir</div>
        {audit.length === 0 ? (
          <p class="hint">Belum ada aktivitas.</p>
        ) : (
          <ul style="list-style:none;padding:0;margin:0">
            {audit.map((a) => (
              <li style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line-2);font-size:14.5px">
                <span>{AUDIT_LABEL[a.action] ?? a.action}</span>
                <span class="hint" style="white-space:nowrap">{waktu(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </fieldset>
  );
}

// ---------- masa hosting ----------
export function AdminHosting() {
  const [list, setList] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = () => api<any[]>("GET", "/admin/hosting/expiring?days=30").then(setList);
  useEffect(() => {
    load().catch((e) => toast(e.message, true));
  }, []);

  async function renew(t: any, from: "previous_end" | "today") {
    const start = from === "today" ? "hari ini" : tanggal(t.hostingUntil);
    if (!confirmAction(`Catat pembayaran hosting ${rupiah(100000)} untuk ${t.businessName} dan perpanjang 1 tahun dari ${start}?`)) return;
    setBusy(t.id);
    try {
      await api("POST", `/admin/tenants/${t.id}/renew`, { from });
      toast("Hosting diperpanjang 1 tahun");
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal", true);
    } finally {
      setBusy(null);
    }
  }

  if (!list) return <Loading />;
  return (
    <div class="editor-col" style="max-width:820px">
      <div class="ed-head">
        <h1>Masa hosting</h1>
        <p>Pelanggan yang hostingnya berakhir dalam 30 hari atau sudah lewat.</p>
      </div>
      {list.length === 0 ? (
        <div class="panel">Tidak ada yang perlu diperpanjang dalam 30 hari ke depan.</div>
      ) : (
        <div class="items">
          {list.map((t) => (
            <div class="panel" style="margin:0">
              <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center">
                <div>
                  <a href={`#/admin/t/${t.id}`} style="font-weight:750;color:var(--ink);text-decoration:none;font-size:17px">
                    {t.businessName}
                  </a>
                  <div class="hint">{t.slug}</div>
                </div>
                <HostingBadge t={t} />
              </div>
              <div class="copybox">{t.waReminderText}</div>
              <div class="btn-row" style="margin-top:0">
                <button class="btn btn-quiet btn-sm" onClick={() => copyText(t.waReminderText, "Pesan pengingat disalin")}>
                  <Icon name="copy" />
                  Salin pengingat
                </button>
                <button class="btn btn-sm" disabled={busy === t.id} onClick={() => renew(t, "previous_end")}>
                  {busy === t.id ? "Menyimpan…" : t.hostingState === "expired" ? "Sudah bayar, lanjutkan masa lama" : "Sudah bayar, perpanjang"}
                </button>
                {t.hostingState === "expired" && (
                  <button class="btn btn-quiet btn-sm" disabled={busy === t.id} onClick={() => renew(t, "today")}>
                    Sudah bayar, mulai hari ini
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
