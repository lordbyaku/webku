/**
 * Worker situs publik: melayani *.ROOT_DOMAIN dari R2 (HTML hasil render) + Cache API.
 * Tidak menyentuh D1. Aset statis (/_landing, favicon) dilayani Static Assets tanpa Worker.
 */
export interface Env {
  SITES: R2Bucket;
  ASSETS: Fetcher;
  ROOT_DOMAIN: string;
  MEDIA_ORIGIN: string;
  ENVIRONMENT: string;
}

const EDGE_TTL = 300; // detik

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

function notFoundPage(env: Env): Response {
  const body = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Situs tidak ditemukan</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f6f7f9;color:#1f2937;padding:24px;text-align:center}p{color:#4b5563}a{color:#1d4ed8}</style></head><body><main><h1>Situs tidak ditemukan</h1><p>Alamat yang Anda buka belum terdaftar atau sudah tidak digunakan.</p><p><a href="https://${env.ROOT_DOMAIN}">Buat website usaha Anda</a></p></main></body></html>`;
  const h = new Headers({ "content-type": "text/html; charset=utf-8", "cache-control": `public, max-age=60, s-maxage=60` });
  securityHeaders(h, env, true);
  return new Response(body, { status: 404, headers: h });
}

function resolveHost(req: Request, url: URL, env: Env): string {
  // Hanya di pengembangan lokal: izinkan simulasi subdomain lewat header.
  if (env.ENVIRONMENT === "development") {
    const dev = req.headers.get("x-dev-host");
    if (dev) return dev.toLowerCase();
    // http://<slug>.localhost:8788 → <slug>.ROOT_DOMAIN ; http://localhost:8788 → landing page
    const h = (req.headers.get("host") ?? url.host).toLowerCase().replace(/:\d+$/, "");
    if (h === "localhost" || h === "127.0.0.1") return env.ROOT_DOMAIN;
    if (h.endsWith(".localhost")) return `${h.slice(0, -".localhost".length)}.${env.ROOT_DOMAIN}`;
  }
  return url.hostname.toLowerCase();
}

export default {
  async fetch(req, env, ctx): Promise<Response> {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405, headers: { allow: "GET, HEAD" } });
    }
    const url = new URL(req.url);
    let host = resolveHost(req, url, env);
    let pathname = url.pathname;

    // Staging di workers.dev (belum ada domain): situs pelanggan dibuka lewat path, mis. /warung-busri/
    if (env.ENVIRONMENT === "staging") {
      const m = /^\/([a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9])(\/.*)?$/.exec(pathname);
      if (m) {
        if (!m[2]) return Response.redirect(`${url.origin}/${m[1]}/`, 301);
        host = `${m[1]}.${env.ROOT_DOMAIN}`;
        pathname = m[2];
      } else {
        host = env.ROOT_DOMAIN;
      }
    }

    // Landing page di domain utama
    if (host === env.ROOT_DOMAIN || host === `www.${env.ROOT_DOMAIN}`) {
      if (host.startsWith("www.")) return Response.redirect(`https://${env.ROOT_DOMAIN}${url.pathname}`, 301);
      const path = pathname === "/" ? "/_landing/" : pathname;
      return env.ASSETS.fetch(new Request(new URL(path, url.origin), req));
    }
    // Subdomain pelanggan & domain kustom (Fase 7) dilayani dari R2 berdasarkan hostname.

    const file = FILES[pathname];
    // Path lain: 404 ringan (bukan redirect) agar tidak memicu permintaan Worker kedua.
    if (!file) return new Response("Not Found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });

    const cache = caches.default;
    const cacheKey = new Request(`https://${host}/${file}`, { method: "GET" });
    let res = await cache.match(cacheKey);

    if (!res) {
      const obj = await env.SITES.get(`h/${host}/${file}`);
      if (!obj) return file === "index.html" ? notFoundPage(env) : new Response("Not Found", { status: 404 });
      const status = Number(obj.customMetadata?.httpStatus ?? 200) || 200;
      const h = new Headers();
      obj.writeHttpMetadata(h);
      h.set("etag", obj.httpEtag);
      h.set("cache-control", status === 200 ? `public, max-age=0, must-revalidate, s-maxage=${EDGE_TTL}` : "no-store");
      securityHeaders(h, env, file === "index.html");
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
