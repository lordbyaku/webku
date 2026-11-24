/**
 * Worker situs publik. Melayani HTML hasil render dari R2 + Cache API. Tidak menyentuh D1.
 * Aset statis (/_fonts, /_landing, favicon) dilayani Static Assets tanpa memanggil Worker.
 *
 * Dua cara situs pelanggan dibuka:
 *  - Mode "path" (alamat platform, mis. web.rela.my.id):  https://web.rela.my.id/<slug>/
 *  - Berdasarkan hostname: domain milik pelanggan (Fase 7, mis. www.tokoku.com) atau mode "subdomain".
 * Keduanya membaca kunci R2 yang sama: h/<host-internal>/<file>, host-internal = <slug>.<ROOT_DOMAIN>
 * untuk alamat platform, atau hostname asli untuk domain milik pelanggan.
 */
export interface Env {
  SITES: R2Bucket;
  ASSETS: Fetcher;
  /** namespace kunci internal, mis. "web.rela.my.id" */
  ROOT_DOMAIN: string;
  /** "path" (default) atau "subdomain" */
  SITE_MODE?: string;
  /** hostname platform pada mode path, mis. "web.rela.my.id" */
  PLATFORM_HOST?: string;
  BRAND_URL?: string;
  MEDIA_ORIGIN: string;
  ENVIRONMENT: string;
}

const EDGE_TTL = 300; // detik
const SLUG_PATH = /^\/([a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9])(\/.*)?$/;

const FILES: Record<string, string> = {
  "/": "index.html",
  "/index.html": "index.html",
  "/sitemap.xml": "sitemap.xml",
  "/robots.txt": "robots.txt",
};

function securityHeaders(h: Headers, env: Env, isHtml: boolean) {
  h.set("x-content-type-options", "nosniff");
  h.set("referrer-policy", "strict-origin-when-cross-origin");
  h.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  h.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  if (isHtml) {
    h.set(
      "content-security-policy",
      `default-src 'none'; font-src 'self'; img-src 'self' ${env.MEDIA_ORIGIN} data:; style-src 'unsafe-inline'; script-src 'none'; frame-src https://maps.google.com https://www.google.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    );
  }
}

const brandUrl = (env: Env) => env.BRAND_URL || `https://${env.PLATFORM_HOST || env.ROOT_DOMAIN}`;

function notFoundPage(env: Env): Response {
  const body = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Situs tidak ditemukan</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f6f7f9;color:#1f2937;padding:24px;text-align:center}p{color:#4b5563}a{color:#1d4ed8}</style></head><body><main><h1>Situs tidak ditemukan</h1><p>Alamat yang Anda buka belum terdaftar atau sudah tidak digunakan.</p><p><a href="${brandUrl(env)}">Buat website usaha Anda</a></p></main></body></html>`;
  const h = new Headers({ "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60" });
  securityHeaders(h, env, true);
  return new Response(body, { status: 404, headers: h });
}

const notFound = () =>
  new Response("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });

const text = (body: string) => new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });

type Target =
  | { kind: "landing"; path: string }
  | { kind: "site"; host: string; file: string; cacheUrl: string }
  | { kind: "response"; res: Response };

function requestHost(req: Request, url: URL): string {
  return (req.headers.get("host") ?? url.host).toLowerCase().replace(/:\d+$/, "");
}

function resolve(req: Request, url: URL, env: Env): Target {
  const mode = env.SITE_MODE === "subdomain" ? "subdomain" : "path";
  const dev = env.ENVIRONMENT === "development";
  let host = requestHost(req, url);

  // Dev: simulasi domain milik pelanggan / subdomain lewat header atau *.localhost
  const devHost = dev ? req.headers.get("x-dev-host")?.toLowerCase() : undefined;
  if (devHost) host = devHost;
  else if (dev && host.endsWith(".localhost")) host = `${host.slice(0, -".localhost".length)}.${env.ROOT_DOMAIN}`;

  // Alamat platform pada mode path: produksi = PLATFORM_HOST; dev & staging = host apa pun (localhost / workers.dev).
  const isPlatform = mode === "path" && !devHost && (host === env.PLATFORM_HOST || (env.ENVIRONMENT !== "production" && !host.endsWith(`.${env.ROOT_DOMAIN}`)));

  if (isPlatform) {
    if (url.pathname === "/robots.txt") return { kind: "response", res: text("User-agent: *\nAllow: /\n") };
    const m = SLUG_PATH.exec(url.pathname);
    if (!m) return { kind: "landing", path: url.pathname === "/" ? "/_landing/" : url.pathname };
    if (!m[2]) return { kind: "response", res: Response.redirect(`${url.origin}/${m[1]}/`, 301) };
    const file = FILES[m[2]];
    if (!file) return { kind: "response", res: notFound() };
    return { kind: "site", host: `${m[1]}.${env.ROOT_DOMAIN}`, file, cacheUrl: `${url.origin}/${m[1]}${m[2] === "/index.html" ? "/" : m[2]}` };
  }

  // Mode subdomain: domain utama → landing page
  if (mode === "subdomain" && (host === env.ROOT_DOMAIN || host === `www.${env.ROOT_DOMAIN}`)) {
    if (host.startsWith("www.")) return { kind: "response", res: Response.redirect(`https://${env.ROOT_DOMAIN}${url.pathname}`, 301) };
    return { kind: "landing", path: url.pathname === "/" ? "/_landing/" : url.pathname };
  }

  // Berdasarkan hostname (domain milik pelanggan / subdomain)
  const file = FILES[url.pathname];
  if (!file) return { kind: "response", res: notFound() };
  return { kind: "site", host, file, cacheUrl: `https://${host}${url.pathname === "/index.html" ? "/" : url.pathname}` };
}

export default {
  async fetch(req, env, ctx): Promise<Response> {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    const url = new URL(req.url);
    const t = resolve(req, url, env);
    if (t.kind === "response") return t.res;
    if (t.kind === "landing") return env.ASSETS.fetch(new Request(new URL(t.path, url.origin), req));

    // Kunci cache = URL publik, sehingga purge-by-URL dari CMS mengenai entri yang sama.
    const cache = caches.default;
    const cacheKey = new Request(t.cacheUrl, { method: "GET" });
    let res = await cache.match(cacheKey);

    if (!res) {
      const obj = await env.SITES.get(`h/${t.host}/${t.file}`);
      if (!obj) return t.file === "index.html" ? notFoundPage(env) : notFound();
      const status = Number(obj.customMetadata?.httpStatus ?? 200) || 200;
      const h = new Headers();
      obj.writeHttpMetadata(h);
      h.set("etag", obj.httpEtag);
      h.set("cache-control", status === 200 ? `public, max-age=0, must-revalidate, s-maxage=${EDGE_TTL}` : "no-store");
      securityHeaders(h, env, t.file === "index.html");
      res = new Response(obj.body, { status, headers: h });
      if (status === 200) ctx.waitUntil(cache.put(cacheKey, res.clone()));
    }

    const etag = res.headers.get("etag");
    if (etag && req.headers.get("if-none-match") === etag && res.status === 200) {
      return new Response(null, { status: 304, headers: res.headers });
    }
    if (req.method === "HEAD") return new Response(null, { status: res.status, headers: res.headers });
    return res;
  },
} satisfies ExportedHandler<Env>;
