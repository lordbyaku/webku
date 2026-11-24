import { SELF } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";

const SITES = (env as unknown as { SITES: R2Bucket }).SITES;
const get = (path: string, host: string, init: RequestInit = {}) =>
  SELF.fetch(`http://localhost${path}`, { ...init, headers: { "x-dev-host": host, ...(init.headers as Record<string, string>) }, redirect: "manual" });

beforeAll(async () => {
  const meta = { httpMetadata: { contentType: "text/html; charset=utf-8" } };
  await SITES.put("h/toko.domainku.id/index.html", "<!doctype html><title>Toko</title><h1>Halo</h1>", { ...meta, customMetadata: { httpStatus: "200" } });
  await SITES.put("h/toko.domainku.id/robots.txt", "User-agent: *\nAllow: /\n", { httpMetadata: { contentType: "text/plain" } });
  await SITES.put("h/tutup.domainku.id/index.html", "<!doctype html><h1>Situs sedang tidak aktif</h1>", { ...meta, customMetadata: { httpStatus: "503" } });
});

describe("site-worker", () => {
  it("melayani HTML pelanggan dengan header keamanan & izin huruf", async () => {
    const r = await get("/", "toko.domainku.id");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("<h1>Halo</h1>");
    const csp = r.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("script-src 'none'");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("cache-control")).toContain("s-maxage=300");
  });

  it("ETag → 304 dan HEAD tanpa isi", async () => {
    const first = await get("/", "toko.domainku.id");
    await first.text();
    const etag = first.headers.get("etag")!;
    expect(etag).toBeTruthy();
    const second = await get("/", "toko.domainku.id", { headers: { "if-none-match": etag } });
    expect(second.status).toBe(304);
    const head = await get("/", "toko.domainku.id", { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });

  it("robots.txt dilayani dari R2", async () => {
    const r = await get("/robots.txt", "toko.domainku.id");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("User-agent");
  });

  it("path lain → 404 ringan, bukan redirect (hemat kuota)", async () => {
    const r = await get("/halaman-lain", "toko.domainku.id");
    expect(r.status).toBe(404);
    expect(r.headers.get("location")).toBeNull();
  });

  it("subdomain tak terdaftar → halaman 404", async () => {
    const r = await get("/", "tidak-ada.domainku.id");
    expect(r.status).toBe(404);
    expect(await r.text()).toContain("Situs tidak ditemukan");
  });

  it("situs nonaktif → 503 dan tidak di-cache", async () => {
    const r = await get("/", "tutup.domainku.id");
    expect(r.status).toBe(503);
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("method selain GET/HEAD ditolak", async () => {
    const r = await get("/", "toko.domainku.id", { method: "POST" });
    expect(r.status).toBe(405);
  });

  it("alamat platform: / landing, /<slug>/ situs, /<slug> dialihkan, /robots.txt", async () => {
    const land = await SELF.fetch("http://localhost/");
    expect(await land.text()).toContain("mulai dari");
    const site = await SELF.fetch("http://localhost/toko/");
    expect(site.status).toBe(200);
    expect(await site.text()).toContain("<h1>Halo</h1>");
    const redir = await SELF.fetch("http://localhost/toko", { redirect: "manual" });
    expect(redir.status).toBe(301);
    expect(redir.headers.get("location")).toBe("http://localhost/toko/");
    const robots = await SELF.fetch("http://localhost/robots.txt");
    expect(await robots.text()).toContain("Allow: /");
    expect((await SELF.fetch("http://localhost/tidak-ada/")).status).toBe(404);
  });
});

describe("staging di workers.dev (path)", () => {
  // Panggil handler langsung dengan ENVIRONMENT=staging (tes lain memakai env.dev).
  const call = async (path: string) => {
    const { default: worker } = await import("../src/index");
    const { createExecutionContext, waitOnExecutionContext } = await import("cloudflare:test");
    const ctx = createExecutionContext();
    const res = await worker.fetch(new Request(`https://umkm-site-staging.contoh.workers.dev${path}`), { ...(env as any), ENVIRONMENT: "staging" }, ctx);
    await waitOnExecutionContext(ctx);
    return res;
  };

  it("/<slug>/ melayani situs pelanggan", async () => {
    const r = await call("/toko/");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("<h1>Halo</h1>");
  });

  it("/<slug> dialihkan ke /<slug>/ dan /<slug>/robots.txt bekerja", async () => {
    const r = await call("/toko");
    expect(r.status).toBe(301);
    expect(r.headers.get("location")).toBe("https://umkm-site-staging.contoh.workers.dev/toko/");
    expect((await call("/toko/robots.txt")).status).toBe(200);
  });

  it("/ menampilkan landing page; slug tak terdaftar → 404", async () => {
    expect(await (await call("/")).text()).toContain("mulai dari");
    expect((await call("/tidak-ada/")).status).toBe(404);
  });
});

describe("produksi: web.rela.my.id/<slug>/ & domain milik pelanggan", () => {
  const call = async (u: string, over: Record<string, string> = {}) => {
    const { default: worker } = await import("../src/index");
    const { createExecutionContext, waitOnExecutionContext } = await import("cloudflare:test");
    const ctx = createExecutionContext();
    const e = { ...(env as any), ENVIRONMENT: "production", SITE_MODE: "path", PLATFORM_HOST: "web.rela.my.id", ...over };
    const res = await worker.fetch(new Request(u, { redirect: "manual" }), e, ctx);
    await waitOnExecutionContext(ctx);
    return res;
  };

  it("alamat platform melayani situs lewat path", async () => {
    const r = await call("https://web.rela.my.id/toko/");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("<h1>Halo</h1>");
    expect((await call("https://web.rela.my.id/")).status).toBe(200);
  });

  it("domain milik pelanggan dilayani berdasarkan hostname", async () => {
    await SITES.put("h/www.tokoku.com/index.html", "<!doctype html><h1>Tokoku</h1>", { httpMetadata: { contentType: "text/html" } });
    const r = await call("https://www.tokoku.com/");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("Tokoku");
    expect((await call("https://domain-lain.com/")).status).toBe(404);
  });

  it("mode subdomain tetap didukung (untuk kebutuhan mendatang)", async () => {
    const r = await call("https://toko.domainku.id/", { SITE_MODE: "subdomain" });
    expect(r.status).toBe(200);
    const w = await call("https://www.domainku.id/", { SITE_MODE: "subdomain" });
    expect(w.status).toBe(301);
  });
});
