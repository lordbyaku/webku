import { SELF } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import { DAY_MS, hashPassword, newId, utcDate } from "@umkm/shared";
import { runScheduled } from "../src/lib/jobs";
import type { Env } from "../src/env";

const ORIGIN = "http://localhost:8787";
const E = env as unknown as Env;

class Client {
  cookie = "";
  async req(method: string, path: string, body?: unknown, form?: FormData) {
    const headers: Record<string, string> = { "x-cms": "1", origin: ORIGIN };
    if (this.cookie) headers.cookie = this.cookie;
    let payload: BodyInit | undefined;
    if (form) payload = form;
    else if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await SELF.fetch(`${ORIGIN}/api${path}`, { method, headers, body: payload });
    const m = /__Host-sid=([^;]*)/.exec(res.headers.get("set-cookie") ?? "");
    if (m) this.cookie = m[1] ? `__Host-sid=${m[1]}` : "";
    return { status: res.status, json: (await res.json()) as any };
  }
  login(u: string, p: string) {
    return this.req("POST", "/auth/login", { username: u, password: p, turnstileToken: "x" });
  }
}

const admin = new Client();

async function newTenant(slug: string, publish = true) {
  const r = await admin.req("POST", "/admin/tenants", { businessName: `Usaha ${slug}`, slug, category: "toko", owner: { username: slug } });
  expect(r.status).toBe(201);
  if (publish) expect((await admin.req("POST", `/admin/tenants/${r.json.data.tenantId}/publish`)).status).toBe(200);
  return r.json.data as { tenantId: string; username: string; temporaryPassword: string };
}

beforeAll(async () => {
  const pw = await hashPassword("AdminSangatRahasia-1", 1000);
  await E.DB.prepare(
    "INSERT INTO users (id, tenant_id, username, role, pw_hash, pw_salt, pw_iter, must_change_pw, created_at) VALUES (?, NULL, 'bossku', 'admin', ?, ?, ?, 0, ?)",
  )
    .bind(newId("u"), pw.hash, pw.salt, pw.iter, Date.now())
    .run();
  expect((await admin.login("bossku", "AdminSangatRahasia-1")).status).toBe(200);
});

describe("pembayaran & hosting", () => {
  it("menolak pembayaran kembar (klik ganda)", async () => {
    const t = await newTenant("toko-kembar");
    expect((await admin.req("POST", `/admin/tenants/${t.tenantId}/payments`, { kind: "setup", amountIdr: 150000 })).status).toBe(201);
    const dup = await admin.req("POST", `/admin/tenants/${t.tenantId}/payments`, { kind: "setup", amountIdr: 150000 });
    expect(dup.status).toBe(409);
    expect(dup.json.error.code).toBe("DUPLICATE_PAYMENT");
    const pays = await admin.req("GET", `/admin/tenants/${t.tenantId}/payments`);
    expect(pays.json.data).toHaveLength(1);
  });

  it("perpanjang hosting dari hari ini untuk yang sudah lama lewat", async () => {
    const t = await newTenant("toko-lewat");
    const longAgo = Date.now() - 400 * DAY_MS;
    await admin.req("PATCH", `/admin/tenants/${t.tenantId}/hosting`, { hostingUntil: longAgo });
    const r = await admin.req("POST", `/admin/tenants/${t.tenantId}/renew`, { from: "today" });
    expect(r.status).toBe(201);
    expect(r.json.data.hostingUntil).toBeGreaterThan(Date.now() + 360 * DAY_MS);
  });
});

describe("kuota atomik", () => {
  it("terbit oleh admin tidak memakai jatah harian pemilik; jatah habis → 429", async () => {
    const t = await newTenant("toko-jatah");
    const owner = new Client();
    await owner.login(t.username, t.temporaryPassword);
    await owner.req("POST", "/auth/change-password", { currentPassword: t.temporaryPassword, newPassword: "PasswordBaru-2026" });
    const today = utcDate();
    await E.DB.prepare("UPDATE tenants SET publish_count_day = 30, publish_count_date = ? WHERE id = ?").bind(today, t.tenantId).run();
    expect((await owner.req("POST", "/site/publish")).status).toBe(429);
    expect((await admin.req("POST", `/admin/tenants/${t.tenantId}/publish`)).status).toBe(200);
    const row = await E.DB.prepare("SELECT publish_count_day FROM tenants WHERE id = ?").bind(t.tenantId).first<{ publish_count_day: number }>();
    expect(row!.publish_count_day).toBe(30);
  });

  it("batas jumlah foto dicek atomik", async () => {
    const t = await newTenant("toko-foto", false);
    await E.DB.prepare("UPDATE tenants SET media_count = 60 WHERE id = ?").bind(t.tenantId).run();
    const f = new FormData();
    f.append("file", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])], "a.jpg", { type: "image/jpeg" }));
    const r = await admin.req("POST", `/admin/tenants/${t.tenantId}/media`, undefined, f);
    expect(r.status).toBe(413);
    expect(r.json.error.message).toContain("60 foto");
  });
});

describe("alamat, hapus, pulihkan, ekspor", () => {
  it("ganti subdomain memindahkan situs dan mematikan alamat lama", async () => {
    const t = await newTenant("toko-lama");
    const r = await admin.req("POST", `/admin/tenants/${t.tenantId}/slug`, { slug: "toko-baru" });
    expect(r.status).toBe(200);
    expect(await E.SITES.head("h/toko-baru.domainku.id/index.html")).not.toBeNull();
    expect(await E.SITES.head("h/toko-lama.domainku.id/index.html")).toBeNull();
    const d = await admin.req("GET", `/admin/tenants/${t.tenantId}`);
    expect(d.json.data.hostnames).toEqual(["toko-baru.domainku.id"]);
    expect((await admin.req("POST", `/admin/tenants/${t.tenantId}/slug`, { slug: "cms" })).status).toBe(400);
  });

  it("hapus → situs mati & login ditolak; pulihkan → nonaktif; ekspor tetap bisa", async () => {
    const t = await newTenant("toko-hapus");
    const owner = new Client();
    expect((await owner.login(t.username, t.temporaryPassword)).status).toBe(200);
    expect((await admin.req("DELETE", `/admin/tenants/${t.tenantId}`)).status).toBe(200);
    expect(await E.SITES.head("h/toko-hapus.domainku.id/index.html")).toBeNull();
    expect((await owner.req("GET", "/auth/me")).status).toBe(401);
    expect((await new Client().login(t.username, t.temporaryPassword)).status).toBe(401);

    const list = await admin.req("GET", "/admin/tenants?status=deleted");
    expect(list.json.data.some((x: any) => x.id === t.tenantId)).toBe(true);
    const exp = await admin.req("GET", `/admin/tenants/${t.tenantId}/export`);
    expect(exp.status).toBe(200);
    expect(exp.json.data.content.published.business.name).toBe("Usaha toko-hapus");

    const res = await admin.req("POST", `/admin/tenants/${t.tenantId}/restore`);
    expect(res.json.data.status).toBe("suspended");
    const page = await E.SITES.get("h/toko-hapus.domainku.id/index.html");
    expect(page!.customMetadata?.httpStatus).toBe("503");
    expect((await new Client().login(t.username, t.temporaryPassword)).status).toBe(200);
  });
});

describe("tugas terjadwal", () => {
  it("backup bertahap selesai dan menulis _complete.json", async () => {
    await newTenant("toko-backup");
    for (let i = 0; i < 6; i++) await runScheduled(E);
    const list = await E.SITES.list({ prefix: "backups/" });
    const complete = list.objects.find((o) => o.key.endsWith("/_complete.json"));
    expect(complete).toBeTruthy();
    const info = (await (await E.SITES.get(complete!.key))!.json()) as { counts: Record<string, number> };
    expect(info.counts.tenants).toBeGreaterThan(0);
    expect(info.counts.site_content).toBeGreaterThan(0);
    const stats = await admin.req("GET", "/admin/stats");
    expect(stats.json.data.lastBackupAt).toBeGreaterThan(0);
  });

  it("menghapus permanen pelanggan yang dihapus > 30 hari beserta fotonya", async () => {
    const t = await newTenant("toko-purge", false);
    const f = new FormData();
    f.append("file", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])], "a.jpg", { type: "image/jpeg" }));
    const up = await admin.req("POST", `/admin/tenants/${t.tenantId}/media`, undefined, f);
    expect(up.status).toBe(201);
    await admin.req("DELETE", `/admin/tenants/${t.tenantId}`);
    await E.DB.prepare("UPDATE tenants SET deleted_at = ? WHERE id = ?").bind(Date.now() - 31 * DAY_MS, t.tenantId).run();
    await runScheduled(E);
    expect(await E.DB.prepare("SELECT 1 FROM tenants WHERE id = ?").bind(t.tenantId).first()).toBeNull();
    expect(await E.DB.prepare("SELECT 1 FROM users WHERE tenant_id = ?").bind(t.tenantId).first()).toBeNull();
    expect((await E.MEDIA.list({ prefix: `t/${t.tenantId}/` })).objects).toHaveLength(0);
  });
});
