import { useEffect, useState } from "preact/hooks";
import { api } from "../api";
import { useEditor } from "../editor";
import { Icon } from "./Icon";
import { Sheet } from "./ui";

export function SaveIndicator() {
  const { saveState } = useEditor();
  if (saveState === "idle") return null;
  const map = {
    saving: ["saving", "Menyimpan…"],
    saved: ["", "Tersimpan"],
    error: ["error", "Belum tersimpan"],
    conflict: ["error", "Diubah di perangkat lain"],
  } as const;
  const [cls, text] = map[saveState];
  return (
    <span class={`save-state ${cls}`} role="status" aria-live="polite">
      <span class="dot" />
      {text}
    </span>
  );
}

function FramePreview({ html }: { html: string | null }) {
  if (!html) return <div class="loading">Menyiapkan pratinjau…</div>;
  return <iframe title="Pratinjau situs" srcdoc={html} sandbox="allow-same-origin" />;
}

/** Pratinjau HP di kolom kanan (desktop). */
export function LivePreview() {
  const ed = useEditor();
  return (
    <aside class="preview-col" aria-label="Pratinjau">
      <div class="phone">
        <div class="phone-screen">
          <FramePreview html={ed.previewHtml} />
        </div>
      </div>
      <p class="preview-caption">Pratinjau ini belum tayang sampai Anda menekan Terbitkan.</p>
    </aside>
  );
}

/** Pratinjau layar penuh (HP). */
export function PreviewSheet({ onClose, templateId }: { onClose: () => void; templateId?: string }) {
  const ed = useEditor();
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<string>("POST", ed.ep.preview, { content: ed.content, templateId }, { raw: true })
      .then(setHtml)
      .catch((e) => setErr(e instanceof Error ? e.message : "Pratinjau gagal"));
  }, []);
  return (
    <Sheet title="Pratinjau" onClose={onClose} className="sheet-preview">
      {err ? (
        <div class="notice danger" style="margin:16px">
          {err}
        </div>
      ) : (
        <FramePreview html={html} />
      )}
    </Sheet>
  );
}

export function PublishBar() {
  const ed = useEditor();
  const [preview, setPreview] = useState(false);
  const status = ed.data.tenant.status;
  let text: string;
  let pending = false;
  if (ed.saveState === "conflict") text = "Konten diubah di perangkat lain";
  else if (status === "suspended") text = "Situs sedang dinonaktifkan";
  else if (status === "draft" && !ed.isAdmin) text = "Situs belum tayang. Admin akan menerbitkannya.";
  else if (status === "draft") text = "Situs belum pernah tayang";
  else if (ed.unpublished || ed.saveState === "saving") {
    text = "Ada perubahan belum tayang";
    pending = true;
  } else text = "Semua perubahan sudah tayang";

  const canPublish = status === "active" || (status === "draft" && ed.isAdmin);
  return (
    <>
      <div class="pubbar">
        <div class="pubbar-in">
          <div class={`pubbar-status${pending || status === "draft" ? " pending" : ""}`} role="status" aria-live="polite">
            <span class="dot" />
            <span>{text}</span>
          </div>
          {ed.saveState === "conflict" ? (
            <button class="btn" onClick={() => ed.reload()}>
              Muat ulang
            </button>
          ) : (
            <>
              <button class="btn btn-ghost-dark" onClick={() => setPreview(true)} aria-label="Pratinjau">
                <Icon name="eye" />
                <span class="hide-xs">Pratinjau</span>
              </button>
              {canPublish && (pending || status === "draft" || ed.publishing) && (
                <button class="btn" disabled={ed.publishing} onClick={() => ed.publish()}>
                  {ed.publishing ? "Menerbitkan…" : status === "draft" ? "Terbitkan pertama kali" : "Terbitkan"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {preview && <PreviewSheet onClose={() => setPreview(false)} />}
    </>
  );
}
