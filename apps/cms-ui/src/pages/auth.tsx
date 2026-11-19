import { useEffect, useRef, useState } from "preact/hooks";
import { api, ApiError } from "../api";
import { Icon } from "../components/Icon";
import { TextField } from "../components/ui";

export interface Me {
  user: { id: string; username: string; role: "admin" | "owner"; mustChangePassword: boolean };
  tenant: { id: string; slug: string; businessName: string } | null;
}

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };
  }
}

function Mark() {
  return (
    <svg class="auth-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0E6B5C" />
      <path d="M9 21c0-6 4-10 14-11-1 9-5 13-11 13-1 0-2-.5-3-2z" fill="#F2F4F1" />
      <path d="M10 22c3-4 6-6 10-8" stroke="#0E6B5C" stroke-width="1.6" fill="none" stroke-linecap="round" />
    </svg>
  );
}

function PasswordField({ label, value, onInput, autoComplete, error, hint }: { label: string; value: string; onInput: (v: string) => void; autoComplete: string; error?: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div class="field">
      <label class="label" for={`pw-${autoComplete}`}>
        {label}
      </label>
      <div class="pw-wrap">
        <input
          id={`pw-${autoComplete}`}
          class="input"
          type={(show ? "text" : "password") as "text"}
          value={value}
          autoComplete={autoComplete}
          aria-invalid={error ? "true" : undefined}
          onInput={(e) => onInput((e.currentTarget as HTMLInputElement).value)}
          required
        />
        <button type="button" class="icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Sembunyikan password" : "Tampilkan password"}>
          <Icon name={show ? "eyeOff" : "eye"} />
        </button>
      </div>
      {(error || hint) && <div class={error ? "err" : "hint"}>{error ?? hint}</div>}
    </div>
  );
}

export function Login({ onDone }: { onDone: (me: Me) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tsBox = useRef<HTMLDivElement>(null);
  const tsToken = useRef<string>("");
  const tsId = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cfg = await api<{ turnstileSiteKey: string }>("GET", "/config").catch(() => null);
      if (!cfg?.turnstileSiteKey || cancelled) return;
      const render = () => {
        if (!tsBox.current || !window.turnstile || tsId.current) return;
        tsId.current = window.turnstile.render(tsBox.current, {
          sitekey: cfg.turnstileSiteKey,
          language: "id",
          appearance: "interaction-only",
          callback: (t: string) => (tsToken.current = t),
          "expired-callback": () => (tsToken.current = ""),
        });
      };
      if (window.turnstile) return render();
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: Event) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await api<Me>("POST", "/auth/login", { username: username.trim(), password, turnstileToken: tsToken.current });
      onDone(me);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login gagal. Coba lagi.");
      window.turnstile?.reset(tsId.current);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main class="auth">
      <div class="auth-card">
        <Mark />
        <h1>Masuk untuk mengelola website</h1>
        <p class="lede">Gunakan username dan password yang diberikan admin.</p>
        {error && (
          <div class="notice danger" role="alert">
            <Icon name="alert" />
            <div>{error}</div>
          </div>
        )}
        <form onSubmit={submit}>
          <TextField label="Username" value={username} onInput={setUsername} autoComplete="username" required />
          <div style="margin-top:18px">
            <PasswordField label="Password" value={password} onInput={setPassword} autoComplete="current-password" />
          </div>
          <div class="ts-box" ref={tsBox} />
          <button class="btn btn-block" type="submit" disabled={busy || !username || !password}>
            {busy ? "Memeriksa…" : "Masuk"}
          </button>
        </form>
        <p class="foot">Lupa password? Hubungi admin lewat WhatsApp untuk mendapatkan password baru.</p>
      </div>
    </main>
  );
}

export function ChangePassword({ me, onDone, forced }: { me: Me; onDone: (me: Me) => void; forced: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: Event) {
    e.preventDefault();
    if (next !== again) {
      setFields({ again: "Password baru tidak sama" });
      return;
    }
    setBusy(true);
    setFields({});
    try {
      onDone(await api<Me>("POST", "/auth/change-password", { currentPassword: current, newPassword: next }));
    } catch (err) {
      if (err instanceof ApiError) setFields(err.fields ?? { newPassword: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main class="auth">
      <div class="auth-card">
        <Mark />
        <h1>{forced ? "Buat password baru" : "Ganti password"}</h1>
        <p class="lede">
          {forced ? `Halo ${me.tenant?.businessName ?? me.user.username}. Sebelum mulai, ganti password sementara dengan password milik Anda sendiri.` : "Pilih password yang mudah Anda ingat tetapi sulit ditebak orang lain."}
        </p>
        <form onSubmit={submit}>
          <PasswordField label={forced ? "Password sementara" : "Password sekarang"} value={current} onInput={setCurrent} autoComplete="current-password" error={fields.currentPassword} />
          <div style="margin-top:18px">
            <PasswordField label="Password baru" value={next} onInput={setNext} autoComplete="new-password" error={fields.newPassword} hint="Minimal 8 karakter." />
          </div>
          <div style="margin-top:18px">
            <PasswordField label="Ulangi password baru" value={again} onInput={setAgain} autoComplete="new-password" error={fields.again} />
          </div>
          <button class="btn btn-block" type="submit" disabled={busy || !current || next.length < 8 || !again}>
            {busy ? "Menyimpan…" : "Simpan password"}
          </button>
        </form>
      </div>
    </main>
  );
}
