import type { ComponentChildren } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { Icon } from "./Icon";

// ---------- toast ----------
type ToastMsg = { text: string; error?: boolean; id: number };
let pushToast: (t: Omit<ToastMsg, "id">) => void = () => {};

export function toast(text: string, error = false) {
  pushToast({ text, error });
}

export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    pushToast = (t) => {
      const m = { ...t, id: Date.now() };
      setMsg(m);
      clearTimeout(timer);
      timer = window.setTimeout(() => setMsg((cur) => (cur?.id === m.id ? null : cur)), t.error ? 5000 : 2800);
    };
  }, []);
  if (!msg) return null;
  return (
    <div class={`toast${msg.error ? " error" : ""}`} role="status" aria-live="polite" key={msg.id}>
      {msg.text}
    </div>
  );
}

export async function copyText(text: string, done = "Disalin") {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast("Tidak bisa menyalin otomatis. Tekan lama teksnya untuk menyalin.", true);
  }
}

// ---------- input ----------
interface TextProps {
  label: string;
  value: string | null | undefined;
  onInput: (v: string) => void;
  max?: number;
  hint?: ComponentChildren;
  error?: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "tel" | "email" | "url" | "numeric";
  prefix?: string;
  autoComplete?: string;
  required?: boolean;
}

export function TextField(p: TextProps) {
  const id = useId();
  const v = p.value ?? "";
  const common = {
    id,
    value: v,
    placeholder: p.placeholder,
    maxLength: p.max,
    "aria-invalid": p.error ? true : undefined,
    "aria-describedby": p.hint || p.error ? `${id}-d` : undefined,
    onInput: (e: Event) => p.onInput((e.currentTarget as HTMLInputElement).value),
  };
  const input = p.multiline ? (
    <textarea class="textarea" rows={p.rows ?? 4} {...common} />
  ) : (
    <input class="input" type={(p.type ?? "text") as "text"} inputMode={p.inputMode} autoComplete={p.autoComplete ?? "off"} required={p.required} {...common} />
  );
  return (
    <div class="field">
      <label class="label" for={id}>
        {p.label}
      </label>
      {p.prefix ? (
        <div class="affix">
          <span>{p.prefix}</span>
          {input}
        </div>
      ) : (
        input
      )}
      {(p.error || p.hint) && (
        <div id={`${id}-d`} class={p.error ? "err" : "hint"}>
          {p.error ?? p.hint}
        </div>
      )}
      {p.max && p.max >= 100 && v.length > p.max * 0.7 ? <div class="counter">{v.length}/{p.max}</div> : null}
    </div>
  );
}

export function Switch({ label, checked, onChange, hint }: { label: ComponentChildren; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label class="switch">
      <span>
        <span class="label" style="display:block">
          {label}
        </span>
        {hint && <span class="hint">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
    </label>
  );
}

export function Chips<T extends string | null>({ options, value, onChange, label }: { options: Array<[T, string]>; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div class="field">
      <span class="label">{label}</span>
      <div class="chips" role="group" aria-label={label}>
        {options.map(([v, l]) => (
          <button type="button" class="chip" aria-pressed={value === v ? "true" : "false"} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- sheet ----------
export function Sheet({ title, onClose, children, className }: { title: string; onClose: () => void; children: ComponentChildren; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, input, [tabindex]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, []);
  return (
    <div class="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class={`sheet ${className ?? ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div class="sheet-head">
          <h2>{title}</h2>
          <button class="icon-btn" type="button" onClick={onClose} aria-label="Tutup">
            <Icon name="x" />
          </button>
        </div>
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Loading({ text = "Memuat…" }: { text?: string }) {
  return (
    <div class="loading" role="status">
      <div style="display:grid;gap:12px;justify-items:center">
        <div class="spinner" />
        <span>{text}</span>
      </div>
    </div>
  );
}

export function confirmAction(message: string): boolean {
  return window.confirm(message);
}

export function rupiah(n: number): string {
  return "Rp " + new Intl.NumberFormat("id-ID").format(n);
}

export function tanggal(ms: number | null | undefined): string {
  if (!ms) return "–";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(ms);
}
