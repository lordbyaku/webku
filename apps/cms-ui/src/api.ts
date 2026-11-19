export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

type Opts = { form?: FormData; raw?: boolean };

export async function api<T = any>(method: string, path: string, body?: unknown, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { "x-cms": "1" };
  let payload: BodyInit | undefined;
  if (opts.form) payload = opts.form;
  else if (body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: "same-origin" });
  } catch {
    throw new ApiError(0, "NETWORK", "Tidak ada koneksi internet. Periksa sinyal lalu coba lagi.");
  }
  if (opts.raw && res.ok) return (await res.text()) as T;
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* bukan JSON */
  }
  if (!res.ok || !json?.ok) {
    const e = json?.error ?? {};
    const err = new ApiError(res.status, e.code ?? "INTERNAL", e.message ?? "Terjadi kesalahan. Coba lagi.", e.fields, e.retryAfter);
    if (res.status === 401 && !path.startsWith("/auth/login")) window.dispatchEvent(new CustomEvent("auth:lost"));
    if (err.code === "PASSWORD_CHANGE_REQUIRED") window.dispatchEvent(new CustomEvent("auth:pwchange"));
    throw err;
  }
  return json.data as T;
}

/** Jalur API editor: pemilik memakai /site, admin memakai /admin/tenants/:id. */
export interface EditorEndpoints {
  site: string;
  content: string;
  preview: string;
  publish: string;
  template: string;
  media: string;
}

export function ownerEndpoints(): EditorEndpoints {
  return { site: "/site", content: "/site/content", preview: "/site/preview", publish: "/site/publish", template: "/site/template", media: "/media" };
}

export function adminEndpoints(tenantId: string): EditorEndpoints {
  const b = `/admin/tenants/${encodeURIComponent(tenantId)}`;
  return { site: `${b}/content`, content: `${b}/content`, preview: `${b}/preview`, publish: `${b}/publish`, template: `${b}/template`, media: `${b}/media` };
}
