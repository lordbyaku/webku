import { SELF } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, newId, DAY_MS } from "@umkm/shared";

const ORIGIN = "http://localhost:8787";
const E = env as unknown as { DB: D1Database; SITES: R2Bucket; MEDIA: R2Bucket };

type Json = { ok: boolean; data?: any; error?: { code: string; message: string; fields?: Record<string, string>; retryAfter?: number } };

class Client {
  cookie = "";
  async req(method: string, path: string, body?: unknown, opts: { origin?: string | null; form?: FormData } = {}) {
    const headers: Record<string, string> = { "x-cms": "1" };
    if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
    if (this.cookie) headers.cookie = this.cookie;
    let payload: BodyInit | undefined;
    if (opts.form) payload = opts.form;
    else if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await SELF.fetch(`${ORIGIN}/api${path}`, { method, headers, body: payload });
    const set = res.headers.get("set-cookie");
    if (set) {
      const m = /__Host-sid=([^;]*)/.exec(set);
      if (m) this.cookie = m[1] ? `__Host-sid=${m[1]}` : "";
    }
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, json: (ct.includes("json") ? await res.json() : null) as Json, text: ct.includes("html") ? await res.text() : "" };
  }
  login(username: string, password: string) {
    return this.req("POST", "/auth/login", { username, password, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" });
  }
}

const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x1a, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c, 0x0d, 0, 0, 0, 0x2f, 0, 0, 0, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe, 0x07, 0]);

function imageForm(bytes: Uint8Array, name = "foto.webp") {
  const f = new FormData();
  f.append("file", new File([bytes], name, { type: "image/webp" }));
  f.append("width", "1");
  f.append("height", "1");
  return f;
}

const admin = new Client();
const ownerA = new Client();
const ownerB = new Client();
let tenantA = "";
let tenantB = "";
const NEW_PW_A = "PasswordBaruA-2026";

beforeAll(async () => {
  const pw = await hashPassword("AdminSangatRahasia-1", 1000);
  await E.DB.prepare(
    "INSERT INTO users (id, tenant_id, username, role, pw_hash, pw_salt, pw_iter, must_change_pw, created_at) VALUES (?, NULL, 'bossku', 'admin', ?, ?, ?, 0, ?)",
  )
    .bind(newId("u"), pw.hash, pw.salt, pw.iter, Date.now())
    .run();
});

describe("alur lengkap CMS", () => {
  it("menolak request tanpa Origin/X-CMS (CSRF)", async () => {
    const r = await new Client().req("POST", "/auth/login", { username: "bossku", password: "x" }, { origin: null });
    expect(r.status).toBe(403);
    expect(r.json.error?.code).toBe("CSRF_FAILED");
    const r2 = await new Client().req("POST", "/auth/login", { username: "bossku", password: "x" }, { origin: "https://jahat.com" });
    expect(r2.status).toBe(403);
  });

  it("admin login & membuat dua pelanggan", async () => {
    expect((await admin.login("bossku", "salah-password")).status).toBe(401);
    const r = await admin.login("bossku", "AdminSangatRahasia-1");
    expect(r.status).toBe(200);
    expect(r.json.data.user.role).toBe("admin");
    expect(admin.cookie).toMatch(/^__Host-sid=/);

    const a = await admin.req("POST", "/admin/tenants", { businessName: "Warung Bu Sri", slug: "warung-busri", category: "kuliner", templateId: "kuliner-01", owner: { username: "busri" } });
    expect(a.status).toBe(201);
    tenantA = a.json.data.tenantId;
    expect(a.json.data.siteUrl).toBe("https://warung-busri.domainku.id");
    expect(a.json.data.waMessage).toContain(a.json.data.temporaryPassword);

    const dup = await admin.req("POST", "/admin/tenants", { businessName: "X", slug: "warung-busri", category: "kuliner", owner: { username: "lain" } });
    expect(dup.status).toBe(409);
    const bad = await admin.req("POST", "/admin/tenants", { businessName: "X", slug: "cms", category: "kuliner" });
    expect(bad.status).toBe(400);
    expect(bad.json.error?.fields?.slug).toBeTruthy();

    const b = await admin.req("POST", "/admin/tenants", { businessName: "Bengkel Jaya", slug: "bengkel-jaya", category: "jasa", owner: { username: "jaya" } });
    expect(b.status).toBe(201);
    tenantB = b.json.data.tenantId;

    // login pelanggan dengan password sementara → wajib ganti
    const la = await ownerA.login("busri", a.json.data.temporaryPassword);
    expect(la.json.data.user.mustChangePassword).toBe(true);
    expect((await ownerA.req("GET", "/site")).json.error?.code).toBe("PASSWORD_CHANGE_REQUIRED");
    const weak = await ownerA.req("POST", "/auth/change-password", { currentPassword: a.json.data.temporaryPassword, newPassword: "12345678" });
    expect(weak.status).toBe(400);
    const ch = await ownerA.req("POST", "/auth/change-password", { currentPassword: a.json.data.temporaryPassword, newPassword: NEW_PW_A });
    expect(ch.status).toBe(200);

    const lb = await ownerB.login("jaya", b.json.data.temporaryPassword);
    expect(lb.status).toBe(200);
    await ownerB.req("POST", "/auth/change-password", { currentPassword: b.json.data.temporaryPassword, newPassword: "PasswordBaruB-2026" });
  });

  it("pemilik membaca & menyimpan draf dengan optimistic locking", async () => {
    const s = await ownerA.req("GET", "/site");
    expect(s.status).toBe(200);
    expect(s.json.data.tenant.id).toBe(tenantA);
    expect(s.json.data.tenant.status).toBe("draft");
    const content = s.json.data.content.draft;
    content.hero.title = `<script>alert("xss")</script>`;
    content.contact.whatsapp = "0812 3456 7890";
    const v = s.json.data.content.version;
    const save = await ownerA.req("PUT", "/site/content", { version: v, content });
    expect(save.status).toBe(200);
    expect(save.json.data.version).toBe(v + 1);
    const stale = await ownerA.req("PUT", "/site/content", { version: v, content });
    expect(stale.status).toBe(409);
    const invalid = await ownerA.req("PUT", "/site/content", { version: v + 1, content: { ...content, contact: { ...content.contact, mapsUrl: "javascript:alert(1)" } } });
    expect(invalid.status).toBe(400);
    expect(invalid.json.error?.fields?.["contact.mapsUrl"]).toBeTruthy();
  });

  it("media: upload, cek magic bytes, isolasi antar tenant", async () => {
    const up = await ownerA.req("POST", "/media", undefined, { form: imageForm(WEBP) });
    expect(up.status).toBe(201);
    const mediaId: string = up.json.data.id;
    expect(await E.MEDIA.head(`t/${tenantA}/${mediaId}.webp`)).not.toBeNull();

    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect((await ownerA.req("POST", "/media", undefined, { form: imageForm(html, "foto.jpg") })).status).toBe(400);

    // B tidak bisa melihat / menghapus / memakai media A
    const listB = await ownerB.req("GET", "/media");
    expect(listB.json.data.items).toHaveLength(0);
    expect((await ownerB.req("DELETE", `/media/${mediaId}`)).status).toBe(404);
    expect((await ownerB.req("PATCH", `/media/${mediaId}`, { alt: "curian" })).status).toBe(404);
    const sB = await ownerB.req("GET", "/site");
    const cB = sB.json.data.content.draft;
    cB.hero.imageMediaId = mediaId;
    expect((await ownerB.req("PUT", "/site/content", { version: sB.json.data.content.version, content: cB })).status).toBe(400);

    // A memakai media sendiri → boleh; lalu media terpakai tidak bisa dihapus tanpa force
    const sA = await ownerA.req("GET", "/site");
    const cA = sA.json.data.content.draft;
    cA.hero.imageMediaId = mediaId;
    expect((await ownerA.req("PUT", "/site/content", { version: sA.json.data.content.version, content: cA })).status).toBe(200);
    expect((await ownerA.req("DELETE", `/media/${mediaId}`)).json.error?.code).toBe("MEDIA_IN_USE");
  });

  it("pemilik tidak bisa mengakses admin", async () => {
    expect((await ownerA.req("GET", "/admin/tenants")).status).toBe(403);
    expect((await ownerA.req("GET", `/admin/tenants/${tenantB}`)).status).toBe(403);
  });

  it("pratinjau & publish: publish pertama oleh admin, lalu oleh pemilik", async () => {
    const pv = await ownerA.req("POST", "/site/preview");
    expect(pv.status).toBe(200);
    expect(pv.text).toContain("noindex");
    expect(pv.text).not.toContain(`<script>alert("xss")`);

    expect((await ownerA.req("POST", "/site/publish")).status).toBe(403); // masih draf
    const pub = await admin.req("POST", `/admin/tenants/${tenantA}/publish`);
    expect(pub.status).toBe(200);
    expect(pub.json.data.urls).toEqual(["https://warung-busri.domainku.id/"]);

    const obj = await E.SITES.get("h/warung-busri.domainku.id/index.html");
    const html = await obj!.text();
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("https://wa.me/6281234567890");
    expect(await E.SITES.head("h/warung-busri.domainku.id/sitemap.xml")).not.toBeNull();

    const s = await ownerA.req("GET", "/site");
    expect(s.json.data.tenant.status).toBe("active");
    const until = s.json.data.tenant.hosting.until as number;
    expect(until - Date.now()).toBeGreaterThan(364 * DAY_MS);
    expect(s.json.data.content.hasUnpublishedChanges).toBe(false);

    const pub2 = await ownerA.req("POST", "/site/publish", { version: s.json.data.content.version });
    expect(pub2.status).toBe(200);
    expect((await ownerA.req("POST", "/site/publish", { version: 1 })).status).toBe(409);
  });

  it("ganti template oleh pemilik (dan bisa dikunci admin)", async () => {
    expect((await ownerA.req("PUT", "/site/template", { templateId: "kuliner-02" })).status).toBe(200);
    expect((await ownerA.req("PUT", "/site/template", { templateId: "palsu-99" })).status).toBe(400);
    await admin.req("PATCH", `/admin/tenants/${tenantA}`, { allowTemplateSwitch: false });
    expect((await ownerA.req("PUT", "/site/template", { templateId: "kuliner-03" })).status).toBe(403);
  });

  it("perpanjangan hosting, daftar segera habis, dan statistik", async () => {
    const before = (await admin.req("GET", `/admin/tenants/${tenantA}`)).json.data.tenant.hostingUntil as number;
    const r = await admin.req("POST", `/admin/tenants/${tenantA}/renew`, { method: "transfer BCA" });
    expect(r.status).toBe(201);
    expect(new Date(r.json.data.hostingUntil).getUTCFullYear()).toBe(new Date(before).getUTCFullYear() + 1);

    await admin.req("PATCH", `/admin/tenants/${tenantA}/hosting`, { hostingUntil: Date.now() + 5 * DAY_MS });
    const exp = await admin.req("GET", "/admin/hosting/expiring?days=30");
    const item = exp.json.data.find((x: any) => x.id === tenantA);
    expect(item.hostingState).toBe("expiring_7");
    expect(item.waReminderText).toContain("Rp 100.000");
    expect(item.waReminderText).toContain("warung-busri.domainku.id");

    const site = await ownerA.req("GET", "/site");
    expect(site.json.data.tenant.hosting.state).toBe("expiring_7");

    const pay = await admin.req("POST", `/admin/tenants/${tenantA}/payments`, { kind: "setup", amountIdr: 100000 });
    expect(pay.status).toBe(201);
    const stats = await admin.req("GET", "/admin/stats");
    expect(stats.json.data.tenants.active).toBe(1);
    expect(stats.json.data.hostingExpiring30).toBe(1);
  });

  it("suspend menulis halaman tidak aktif & aktivasi menayangkan versi terbit", async () => {
    expect((await admin.req("POST", `/admin/tenants/${tenantA}/status`, { status: "suspended" })).status).toBe(200);
    const page = await E.SITES.get("h/warung-busri.domainku.id/index.html");
    expect(page!.customMetadata?.httpStatus).toBe("503");
    expect(await page!.text()).toContain("tidak aktif");
    expect((await ownerA.req("POST", "/site/publish")).status).toBe(403);

    expect((await admin.req("POST", `/admin/tenants/${tenantA}/status`, { status: "active" })).status).toBe(200);
    const back = await E.SITES.get("h/warung-busri.domainku.id/index.html");
    expect(back!.customMetadata?.httpStatus).toBe("200");
    expect(await back!.text()).toContain("Warung Bu Sri");
  });

  it("lockout setelah 5 kali salah password & reset oleh admin", async () => {
    const c = new Client();
    for (let i = 0; i < 5; i++) expect((await c.login("busri", "salah-terus")).status).toBe(401);
    const locked = await c.login("busri", NEW_PW_A);
    expect(locked.status).toBe(423);
    expect(locked.json.error?.retryAfter).toBeGreaterThan(0);

    const detail = await admin.req("GET", `/admin/tenants/${tenantA}`);
    const userId = detail.json.data.users[0].id;
    const reset = await admin.req("POST", `/admin/users/${userId}/reset-password`);
    expect(reset.status).toBe(200);
    // sesi lama pemilik dicabut
    expect((await ownerA.req("GET", "/site")).status).toBe(401);
    const relog = await c.login("busri", reset.json.data.temporaryPassword);
    expect(relog.status).toBe(200);
    expect(relog.json.data.user.mustChangePassword).toBe(true);
  });

  it("username tidak dikenal memberi pesan yang sama (tanpa enumerasi)", async () => {
    const r = await new Client().login("tidak-ada-orang", "apapun-123");
    expect(r.status).toBe(401);
    expect(r.json.error?.message).toBe("Username atau password salah");
  });
});
