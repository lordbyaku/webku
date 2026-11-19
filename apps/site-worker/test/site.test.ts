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

  it("domain utama menampilkan landing page; www dialihkan", async () => {
    const r = await get("/", "domainku.id");
    expect(r.status).toBe(200);
    expect(await r.text()).toContain("mulai dari");
    const w = await get("/", "www.domainku.id");
    expect(w.status).toBe(301);
    expect(w.headers.get("location")).toBe("https://domainku.id/");
  });
});
