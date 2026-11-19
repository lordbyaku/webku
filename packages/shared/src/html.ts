/**
 * Helper HTML aman: semua interpolasi di-escape kecuali nilai bertipe SafeHtml
 * (yang hanya bisa dibuat oleh `html` sendiri atau `unsafeRaw` untuk konstanta kode).
 */
const SAFE = Symbol("SafeHtml");

export interface SafeHtml {
  readonly [SAFE]: true;
  readonly value: string;
  toString(): string;
}

function makeSafe(value: string): SafeHtml {
  return { [SAFE]: true, value, toString: () => value };
}

export function isSafeHtml(v: unknown): v is SafeHtml {
  return typeof v === "object" && v !== null && (v as Record<symbol, unknown>)[SAFE] === true;
}

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

export function escapeHtml(input: unknown): string {
  return String(input ?? "").replace(/[&<>"'`]/g, (c) => ESC[c] ?? c);
}

type Interp = SafeHtml | string | number | boolean | null | undefined | Interp[];

function renderInterp(v: Interp): string {
  if (v === null || v === undefined || v === false) return "";
  if (Array.isArray(v)) return v.map(renderInterp).join("");
  if (isSafeHtml(v)) return v.value;
  return escapeHtml(v);
}

export function html(strings: TemplateStringsArray, ...values: Interp[]): SafeHtml {
  let out = strings[0] ?? "";
  for (let i = 0; i < values.length; i++) {
    out += renderInterp(values[i] as Interp) + (strings[i + 1] ?? "");
  }
  return makeSafe(out);
}

/** HANYA untuk string konstan dari kode (CSS tema, ikon SVG). Jangan pernah untuk input pengguna. */
export function unsafeRaw(codeConstant: string): SafeHtml {
  return makeSafe(codeConstant);
}

/** Teks multi-baris: escape dulu, lalu baris baru → <br>. */
export function multiline(text: string | null | undefined): SafeHtml {
  return makeSafe(escapeHtml(text ?? "").replace(/\r?\n/g, "<br>"));
}

/** JSON aman untuk disisipkan di <script type="application/ld+json">. */
export function jsonForScript(data: unknown): SafeHtml {
  return makeSafe(
    JSON.stringify(data)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029"),
  );
}
