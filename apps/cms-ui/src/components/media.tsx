import { useState } from "preact/hooks";
import { api, ApiError } from "../api";
import { useEditor, type MediaItem } from "../editor";
import { compressImage } from "../image";
import { Icon } from "./Icon";
import { confirmAction, Sheet, toast } from "./ui";

function kb(n: number) {
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(".", ",")} MB` : `${Math.round(n / 1000)} KB`;
}

/** Lembar pustaka foto: unggah baru atau pilih yang sudah ada. */
export function MediaSheet({ title, multiple, selected, onPick, onClose }: { title: string; multiple?: boolean; selected?: string[]; onPick: (ids: string[]) => void; onClose: () => void }) {
  const ed = useEditor();
  const [chosen, setChosen] = useState<string[]>(selected ?? []);
  const [busy, setBusy] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, multiple ? 10 : 1);
    const uploaded: string[] = [];
    for (let i = 0; i < list.length; i++) {
      setBusy(list.length > 1 ? `Mengunggah foto ${i + 1} dari ${list.length}…` : "Mengunggah foto…");
      try {
        const c = await compressImage(list[i]!);
        const form = new FormData();
        form.append("file", new File([c.blob], `foto.${c.ext}`, { type: c.blob.type }));
        form.append("width", String(c.width));
        form.append("height", String(c.height));
        const m = await api<MediaItem>("POST", ed.ep.media, undefined, { form });
        ed.addMedia(m);
        uploaded.push(m.id);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Foto gagal diunggah", true);
        break;
      }
    }
    setBusy(null);
    if (uploaded.length) {
      if (multiple) setChosen((c) => [...c, ...uploaded]);
      else {
        onPick(uploaded);
        onClose();
      }
    }
  }

  function toggle(id: string) {
    if (!multiple) {
      onPick([id]);
      onClose();
      return;
    }
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function remove(m: MediaItem) {
    if (!confirmAction("Hapus foto ini dari pustaka? Foto yang masih dipakai di situs tidak bisa dihapus.")) return;
    try {
      await api("DELETE", `${ed.ep.media}/${m.id}`);
      ed.removeMedia(m.id);
      setChosen((c) => c.filter((x) => x !== m.id));
      toast("Foto dihapus");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Gagal menghapus", true);
    }
  }

  const used = ed.data.limits;
  return (
    <Sheet title={title} onClose={onClose}>
      <label class="upload-zone">
        <Icon name="upload" />
        <span>{multiple ? "Unggah foto dari HP" : "Unggah foto baru"}</span>
        <input type="file" accept="image/*" multiple={multiple} disabled={!!busy} onChange={(e) => onFiles((e.currentTarget as HTMLInputElement).files)} />
      </label>
      {busy && (
        <div role="status" style="margin-top:12px">
          <div class="hint">{busy}</div>
          <div class="progress">
            <div style="width:60%" />
          </div>
        </div>
      )}
      <p class="hint" style="margin-top:10px">
        Foto otomatis diperkecil agar situs tetap ringan. Terpakai {ed.mediaList.length} dari {used.mediaFiles} foto.
      </p>

      {ed.mediaList.length === 0 ? (
        <p class="media-empty">Belum ada foto. Unggah foto pertama Anda di atas.</p>
      ) : (
        <div class="media-grid">
          {ed.mediaList.map((m) => (
            <div style="position:relative">
              <button
                type="button"
                class="media-cell"
                style={{ backgroundImage: `url("${m.url}")`, width: "100%" }}
                aria-pressed={chosen.includes(m.id) ? "true" : "false"}
                aria-label={`Pilih foto ${m.alt ?? ""} (${kb(m.bytes)})`}
                onClick={() => toggle(m.id)}
              />
              {multiple && chosen.includes(m.id) && (
                <span style="position:absolute;top:6px;left:6px;width:24px;height:24px;border-radius:50%;background:var(--daun);color:#fff;display:grid;place-items:center;pointer-events:none">
                  <Icon name="check" />
                </span>
              )}
              <button type="button" class="icon-btn" style="position:absolute;top:2px;right:2px;width:34px;height:34px;background:rgba(255,255,255,.9)" aria-label="Hapus foto" onClick={() => remove(m)}>
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
      )}
      {multiple && (
        <button class="btn btn-block" style="margin-top:18px" disabled={chosen.length === 0} onClick={() => (onPick(chosen), onClose())}>
          {chosen.length ? `Pakai ${chosen.length} foto` : "Pilih foto"}
        </button>
      )}
    </Sheet>
  );
}

/** Kolom foto tunggal dengan pratinjau kecil. */
export function ImageField({ label, hint, value, onChange, wide }: { label: string; hint?: string; value: string | null; onChange: (id: string | null) => void; wide?: boolean }) {
  const ed = useEditor();
  const [open, setOpen] = useState(false);
  const m = value ? ed.media.get(value) : undefined;
  return (
    <div class="field">
      <span class="label">{label}</span>
      <div class="pic">
        <div class={`pic-thumb${wide ? " wide" : ""}`} style={m ? { backgroundImage: `url("${m.url}")` } : undefined}>
          {!m && <Icon name="image" />}
        </div>
        <div class="pic-actions">
          <button type="button" class="btn btn-quiet btn-sm" onClick={() => setOpen(true)}>
            {m ? "Ganti foto" : "Pilih foto"}
          </button>
          {value && (
            <button type="button" class="btn btn-quiet btn-sm" onClick={() => onChange(null)}>
              Lepas
            </button>
          )}
        </div>
      </div>
      {hint && <div class="hint">{hint}</div>}
      {open && <MediaSheet title={label} onPick={(ids) => onChange(ids[0] ?? null)} onClose={() => setOpen(false)} />}
    </div>
  );
}
