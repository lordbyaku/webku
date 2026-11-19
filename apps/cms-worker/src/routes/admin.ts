import { Hono, type Context } from "hono";
import { CATEGORIES, sampleContent, type Category } from "@umkm/content-schema";
import {
  addOneYear, checkSlug, formatRupiah, formatTanggalWIB, generateTempPassword, hashPassword, hostingState, newId, DAY_MS,
} from "@umkm/shared";
import { defaultTemplateFor, isTemplateId } from "@umkm/templates";
import type { AppEnv } from "../env";
import { audit, auditStmt, clientIp } from "../lib/audit";
import { requireAdmin, requireAuth } from "../lib/auth";
import { ApiError, badRequest, notFound, ok, readJson, str } from "../lib/http";
import { deleteMedia, listMedia, mediaDto, uploadMedia } from "../lib/media";
import { publishTenant, writeSuspendedPages } from "../lib/publish";
import { getHostnames, getTenant, tenantDto, type TenantRow } from "../lib/repo";
import { getSiteData, previewSite, publishSite, saveContent, setTemplate } from "../lib/site-ops";

export const adminRoutes = new Hono<AppEnv>();
adminRoutes.use("*", requireAuth, requireAdmin);

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

async function mustTenant(c: { env: AppEnv["Bindings"] }, id: string): Promise<TenantRow> {
  const t = await getTenant(c.env.DB, id);
  if (!t) throw notFound("Pelanggan");
  return t;
}

// ---------- tenant ----------

adminRoutes.get("/tenants", async (c) => {
  const status = c.req.query("status");
  const q = (c.req.query("q") ?? "").trim().toLowerCase().slice(0, 40);
  const where: string[] = ["t.status != 'deleted'"];
  const args: unknown[] = [];
  if (status && ["draft", "active", "suspended"].includes(status)) {
    where.push("t.status = ?");
    args.push(status);
  }
  if (c.req.query("unpaid") === "1") where.push("t.payment_status = 'unpaid'");
  if (q) {
    where.push("(t.slug LIKE ? OR lower(t.business_name) LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }
  const r = await c.env.DB.prepare(
    `SELECT t.*, u.username FROM tenants t LEFT JOIN users u ON u.tenant_id = t.id AND u.role = 'owner'
     WHERE ${where.join(" AND ")} ORDER BY t.created_at DESC LIMIT 200`,
  )
    .bind(...args)
    .all<TenantRow & { username: string | null }>();
  return ok(
    c,
    r.results.map((t) => ({ ...tenantDto(t), username: t.username, hostingState: hostingState(t.hosting_until) })),
  );
});

adminRoutes.post("/tenants", async (c) => {
  const b = await readJson(c);
  const businessName = (str(b.businessName) ?? "").trim();
  const slug = (str(b.slug) ?? "").trim().toLowerCase();
  const category = str(b.category) as Category | null;
  const username = (str((b.owner as Record<string, unknown> | undefined)?.username) ?? slug).trim().toLowerCase();
  const fields: Record<string, string> = {};
  if (businessName.length < 1 || businessName.length > 60) fields.businessName = "Nama usaha 1–60 karakter";
  const sc = checkSlug(slug);
  if (!sc.ok) fields.slug = sc.reason;
  if (!category || !CATEGORIES.includes(category)) fields.category = "Kategori tidak valid";
  const templateId = str(b.templateId) ?? (category ? defaultTemplateFor(category) : "");
  if (!isTemplateId(templateId)) fields.templateId = "Template tidak dikenal";
  if (!USERNAME_RE.test(username)) fields["owner.username"] = "Username 3–32 karakter: huruf kecil, angka, titik, garis";
  if (Object.keys(fields).length) throw badRequest("Periksa kembali isian", fields);

  if (await c.env.DB.prepare("SELECT 1 FROM tenants WHERE slug = ?").bind(slug).first()) {
    throw new ApiError(409, "SLUG_TAKEN", "Subdomain sudah dipakai", { fields: { slug: "Subdomain sudah dipakai" } });
  }
  if (await c.env.DB.prepare("SELECT 1 FROM users WHERE username = ?").bind(username).first()) {
    throw new ApiError(409, "USERNAME_TAKEN", "Username sudah dipakai", { fields: { "owner.username": "Username sudah dipakai" } });
  }

  const ts = Date.now();
  const tenantId = newId("t");
  const userId = newId("u");
  const tempPassword = generateTempPassword();
  const pw = await hashPassword(tempPassword, Number(c.env.PBKDF2_ITER) || 100_000);
  const host = `${slug}.${c.env.ROOT_DOMAIN}`;
  const db = c.env.DB;
  await db.batch([
    db.prepare(
      `INSERT INTO tenants (id, slug, business_name, category, template_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?)`,
    ).bind(tenantId, slug, businessName, category, templateId, ts, ts),
    db.prepare(
      `INSERT INTO users (id, tenant_id, username, role, pw_hash, pw_salt, pw_iter, must_change_pw, created_at)
       VALUES (?, ?, ?, 'owner', ?, ?, ?, 1, ?)`,
    ).bind(userId, tenantId, username, pw.hash, pw.salt, pw.iter, ts),
    db.prepare("INSERT INTO hostnames (hostname, tenant_id, kind, status, created_at) VALUES (?, ?, 'subdomain', 'active', ?)").bind(host, tenantId, ts),
    db.prepare("INSERT INTO site_content (tenant_id, draft_json, version, draft_updated_at, draft_updated_by) VALUES (?, ?, 1, ?, ?)").bind(
      tenantId,
      JSON.stringify(sampleContent(category!, businessName)),
      ts,
      c.get("user").id,
    ),
    auditStmt(db, { actorUserId: c.get("user").id, tenantId, action: "admin.tenant_create", detail: { slug, username }, ip: clientIp(c) }),
  ]);

  const siteUrl = `https://${host}`;
  const message =
    `Halo ${businessName}, website Anda sudah siap!\n\n` +
    `Alamat website: ${siteUrl}\nHalaman edit (CMS): ${c.env.CMS_ORIGIN}\nUsername: ${username}\nPassword sementara: ${tempPassword}\n\n` +
    `Saat login pertama Anda akan diminta membuat password baru. Simpan password Anda baik-baik.`;
  return ok(c, { tenantId, siteUrl, cmsUrl: c.env.CMS_ORIGIN, username, temporaryPassword: tempPassword, waMessage: message }, 201);
});

adminRoutes.get("/tenants/:id", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  const [users, hosts, payments] = await Promise.all([
    c.env.DB.prepare("SELECT id, username, must_change_pw, failed_attempts, locked_until, last_login_at, disabled FROM users WHERE tenant_id = ?").bind(t.id).all(),
    getHostnames(c.env.DB, t.id, false),
    c.env.DB.prepare("SELECT * FROM payments WHERE tenant_id = ? ORDER BY paid_at DESC").bind(t.id).all(),
  ]);
  return ok(c, { tenant: { ...tenantDto(t), notes: t.notes, hostingState: hostingState(t.hosting_until) }, users: users.results, hostnames: hosts, payments: payments.results });
});

adminRoutes.patch("/tenants/:id", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  const b = await readJson(c);
  const sets: string[] = [];
  const args: unknown[] = [];
  const fields: Record<string, string> = {};
  if (b.businessName !== undefined) {
    const v = (str(b.businessName) ?? "").trim();
    if (v.length < 1 || v.length > 60) fields.businessName = "Nama usaha 1–60 karakter";
    sets.push("business_name = ?");
    args.push(v);
  }
  if (b.category !== undefined) {
    if (!CATEGORIES.includes(b.category as Category)) fields.category = "Kategori tidak valid";
    sets.push("category = ?");
    args.push(b.category);
  }
  if (b.templateId !== undefined) {
    if (!isTemplateId(String(b.templateId))) fields.templateId = "Template tidak dikenal";
    sets.push("template_id = ?");
    args.push(b.templateId);
  }
  for (const [key, col] of [["allowTemplateSwitch", "allow_template_switch"], ["showBranding", "show_branding"]] as const) {
    if (b[key] !== undefined) {
      sets.push(`${col} = ?`);
      args.push(b[key] ? 1 : 0);
    }
  }
  if (b.notes !== undefined) {
    sets.push("notes = ?");
    args.push((str(b.notes) ?? "").slice(0, 2000) || null);
  }
  if (b.mediaQuotaBytes !== undefined) {
    const n = Number(b.mediaQuotaBytes);
    if (!Number.isInteger(n) || n < 1_000_000 || n > 200_000_000) fields.mediaQuotaBytes = "Kuota 1–200 MB";
    sets.push("media_quota_bytes = ?");
    args.push(n);
  }
  if (Object.keys(fields).length) throw badRequest("Periksa kembali isian", fields);
  if (sets.length === 0) return ok(c, tenantDto(t));
  sets.push("updated_at = ?");
  args.push(Date.now());
  await c.env.DB.prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?`).bind(...args, t.id).run();
  await audit(c, "admin.tenant_update", t.id, b);
  return ok(c, tenantDto((await getTenant(c.env.DB, t.id))!));
});

adminRoutes.post("/tenants/:id/status", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  const b = await readJson(c);
  const status = str(b.status);
  if (status !== "active" && status !== "suspended") throw badRequest("Status harus active atau suspended");
  if (status === t.status) return ok(c, { status });
  if (status === "suspended") {
    await c.env.DB.prepare("UPDATE tenants SET status = 'suspended', updated_at = ? WHERE id = ?").bind(Date.now(), t.id).run();
    const { purge } = await writeSuspendedPages(c.env, t.id);
    c.executionCtx.waitUntil(purge);
  } else {
    if (t.status === "suspended") {
      await c.env.DB.prepare("UPDATE tenants SET status = 'active', updated_at = ? WHERE id = ?").bind(Date.now(), t.id).run();
      // tayangkan kembali versi terbit terakhir (bukan draf)
      const r = await publishTenant(c.env, t.id, { actorId: c.get("user").id, source: "published", enforceDailyLimit: false, allowFirstPublish: true }).catch(
        (e) => {
          if (e instanceof ApiError && e.code === "NOTHING_PUBLISHED") return null;
          throw e;
        },
      );
      if (r) c.executionCtx.waitUntil(r.purge);
    } else {
      throw badRequest("Situs draf diaktifkan dengan menekan Terbitkan");
    }
  }
  await audit(c, `admin.tenant_${status}`, t.id);
  return ok(c, { status });
});

// ---------- konten atas nama pelanggan ----------

adminRoutes.get("/tenants/:id/content", async (c) => ok(c, await getSiteData(c, (await mustTenant(c, c.req.param("id"))).id)));
adminRoutes.put("/tenants/:id/content", async (c) => saveContent(c, (await mustTenant(c, c.req.param("id"))).id));
adminRoutes.post("/tenants/:id/preview", async (c) => previewSite(c, (await mustTenant(c, c.req.param("id"))).id));
adminRoutes.post("/tenants/:id/publish", async (c) => publishSite(c, (await mustTenant(c, c.req.param("id"))).id, true));
adminRoutes.put("/tenants/:id/template", async (c) => setTemplate(c, (await mustTenant(c, c.req.param("id"))).id, true));

adminRoutes.get("/tenants/:id/media", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  return ok(c, await listMedia(c.env, t.id, c.req.query("cursor") ?? null));
});
adminRoutes.post("/tenants/:id/media", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  const row = await uploadMedia(c.env, t.id, await c.req.formData());
  await audit(c, "media.upload", t.id, { id: row.id, bytes: row.bytes });
  return ok(c, mediaDto(c.env, row), 201);
});
adminRoutes.delete("/tenants/:id/media/:mid", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  await deleteMedia(c.env, t.id, c.req.param("mid"), c.req.query("force") === "1");
  await audit(c, "media.delete", t.id, { id: c.req.param("mid") });
  return ok(c, null);
});

/** Terbitkan ulang versi terbit (dipanggil berulang oleh UI untuk "Terbitkan ulang semua"). */
adminRoutes.post("/republish", async (c) => {
  const b = await readJson(c);
  const t = await mustTenant(c, str(b.tenantId) ?? "");
  if (t.status !== "active") return ok(c, { skipped: true, reason: `status ${t.status}` });
  const r = await publishTenant(c.env, t.id, { actorId: c.get("user").id, source: "published", enforceDailyLimit: false, allowFirstPublish: false });
  c.executionCtx.waitUntil(r.purge);
  return ok(c, { publishedAt: r.publishedAt });
});

// ---------- pengguna ----------

async function ownerUser(c: { env: AppEnv["Bindings"] }, userId: string) {
  const u = await c.env.DB.prepare("SELECT id, tenant_id, username, role FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; tenant_id: string | null; username: string; role: string }>();
  if (!u || u.role !== "owner") throw notFound("Pengguna");
  return u;
}

adminRoutes.post("/users/:id/reset-password", async (c) => {
  const u = await ownerUser(c, c.req.param("id"));
  const temp = generateTempPassword();
  const pw = await hashPassword(temp, Number(c.env.PBKDF2_ITER) || 100_000);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, must_change_pw = 1, failed_attempts = 0, locked_until = NULL WHERE id = ?",
    ).bind(pw.hash, pw.salt, pw.iter, u.id),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id),
    auditStmt(c.env.DB, { actorUserId: c.get("user").id, tenantId: u.tenant_id, action: "admin.reset_password", detail: { userId: u.id }, ip: clientIp(c) }),
  ]);
  return ok(c, { username: u.username, temporaryPassword: temp });
});

adminRoutes.post("/users/:id/unlock", async (c) => {
  const u = await ownerUser(c, c.req.param("id"));
  await c.env.DB.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?").bind(u.id).run();
  await audit(c, "admin.unlock", u.tenant_id, { userId: u.id });
  return ok(c, null);
});

adminRoutes.post("/users/:id/disable", async (c) => {
  const u = await ownerUser(c, c.req.param("id"));
  const disabled = (await readJson(c)).disabled ? 1 : 0;
  const stmts = [c.env.DB.prepare("UPDATE users SET disabled = ? WHERE id = ?").bind(disabled, u.id)];
  if (disabled) stmts.push(c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id));
  await c.env.DB.batch(stmts);
  await audit(c, disabled ? "admin.user_disable" : "admin.user_enable", u.tenant_id, { userId: u.id });
  return ok(c, { disabled: disabled === 1 });
});

// ---------- pembayaran & hosting ----------

function parsePaidAt(v: unknown): number {
  const n = v === undefined ? Date.now() : Number(v);
  if (!Number.isFinite(n) || n < Date.UTC(2020, 0, 1) || n > Date.now() + DAY_MS) throw badRequest("Tanggal bayar tidak valid");
  return n;
}

function parseAmount(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000_000) throw badRequest("Nominal tidak valid", { amountIdr: "Nominal tidak valid" });
  return n;
}

async function renew(c: Context<AppEnv>, t: TenantRow, b: Record<string, unknown>) {
  const amount = b.amountIdr === undefined ? Number(c.env.HOSTING_PRICE_IDR) || 100_000 : parseAmount(b.amountIdr);
  const paidAt = parsePaidAt(b.paidAt);
  const fromToday = b.from === "today" || !t.hosting_until;
  const start = fromToday ? Date.now() : t.hosting_until!;
  const end = addOneYear(start);
  const id = newId("pay");
  const ts = Date.now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO payments (id, tenant_id, kind, amount_idr, paid_at, period_start, period_end, method, note, recorded_by, created_at)
       VALUES (?, ?, 'hosting', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, t.id, amount, paidAt, start, end, (str(b.method) ?? "").slice(0, 60) || null, (str(b.note) ?? "").slice(0, 300) || null, c.get("user").id, ts),
    c.env.DB.prepare("UPDATE tenants SET hosting_until = ?, updated_at = ? WHERE id = ?").bind(end, ts, t.id),
    auditStmt(c.env.DB, { actorUserId: c.get("user").id, tenantId: t.id, action: "admin.hosting_renew", detail: { amount, start, end }, ip: clientIp(c) }),
  ]);
  return { paymentId: id, hostingUntil: end };
}

adminRoutes.get("/tenants/:id/payments", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  const r = await c.env.DB.prepare("SELECT * FROM payments WHERE tenant_id = ? ORDER BY paid_at DESC").bind(t.id).all();
  return ok(c, r.results);
});

adminRoutes.post("/tenants/:id/payments", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  const b = await readJson(c);
  const kind = str(b.kind);
  if (kind === "hosting") return ok(c, await renew(c, t, b), 201);
  if (kind !== "setup" && kind !== "maintenance" && kind !== "addon") throw badRequest("Jenis pembayaran tidak valid");
  const amount = parseAmount(b.amountIdr);
  const paidAt = parsePaidAt(b.paidAt);
  const id = newId("pay");
  const ts = Date.now();
  const stmts = [
    c.env.DB.prepare(
      `INSERT INTO payments (id, tenant_id, kind, amount_idr, paid_at, method, note, recorded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, t.id, kind, amount, paidAt, (str(b.method) ?? "").slice(0, 60) || null, (str(b.note) ?? "").slice(0, 300) || null, c.get("user").id, ts),
    auditStmt(c.env.DB, { actorUserId: c.get("user").id, tenantId: t.id, action: "admin.payment", detail: { kind, amount }, ip: clientIp(c) }),
  ];
  if (kind === "setup") stmts.push(c.env.DB.prepare("UPDATE tenants SET payment_status = 'paid', updated_at = ? WHERE id = ?").bind(ts, t.id));
  await c.env.DB.batch(stmts);
  return ok(c, { paymentId: id }, 201);
});

adminRoutes.delete("/payments/:id", async (c) => {
  const p = await c.env.DB.prepare("SELECT * FROM payments WHERE id = ?").bind(c.req.param("id")).first<{ id: string; tenant_id: string; kind: string; amount_idr: number }>();
  if (!p) throw notFound("Pembayaran");
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM payments WHERE id = ?").bind(p.id),
    auditStmt(c.env.DB, { actorUserId: c.get("user").id, tenantId: p.tenant_id, action: "admin.payment_delete", detail: p, ip: clientIp(c) }),
  ]);
  return ok(c, { note: p.kind === "hosting" ? "Periksa dan koreksi masa hosting secara manual bila perlu" : null });
});

adminRoutes.post("/tenants/:id/renew", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  return ok(c, await renew(c, t, await readJson(c)), 201);
});

adminRoutes.patch("/tenants/:id/hosting", async (c) => {
  const t = await mustTenant(c, c.req.param("id"));
  const b = await readJson(c);
  const until = b.hostingUntil === null ? null : Number(b.hostingUntil);
  if (until !== null && (!Number.isFinite(until) || until < Date.UTC(2020, 0, 1))) throw badRequest("Tanggal tidak valid");
  await c.env.DB.prepare("UPDATE tenants SET hosting_until = ?, updated_at = ? WHERE id = ?").bind(until, Date.now(), t.id).run();
  await audit(c, "admin.hosting_set", t.id, { from: t.hosting_until, to: until });
  return ok(c, { hostingUntil: until });
});

adminRoutes.get("/hosting/expiring", async (c) => {
  const days = Math.min(Math.max(Number(c.req.query("days") ?? 30) || 30, 1), 365);
  const limit = Date.now() + days * DAY_MS;
  const r = await c.env.DB.prepare(
    `SELECT * FROM tenants WHERE status IN ('active','suspended') AND hosting_until IS NOT NULL AND hosting_until < ?
     ORDER BY hosting_until ASC`,
  )
    .bind(limit)
    .all<TenantRow>();
  const price = formatRupiah(Number(c.env.HOSTING_PRICE_IDR) || 100_000);
  return ok(
    c,
    r.results.map((t) => {
      const expired = (t.hosting_until ?? 0) <= Date.now();
      const host = `${t.slug}.${c.env.ROOT_DOMAIN}`;
      const tgl = formatTanggalWIB(t.hosting_until!);
      const waReminderText =
        `Halo ${t.business_name}, ` +
        (expired ? `masa hosting website ${host} telah berakhir pada ${tgl}. ` : `masa hosting website ${host} akan berakhir pada ${tgl}. `) +
        `Biaya perpanjangan ${price} per tahun.` +
        (c.env.PAYMENT_INFO ? `\n\nPembayaran: ${c.env.PAYMENT_INFO}` : "") +
        `\n\nTerima kasih.`;
      return { ...tenantDto(t), hostingState: hostingState(t.hosting_until), waReminderText };
    }),
  );
});

// ---------- pemantauan ----------

adminRoutes.get("/stats", async (c) => {
  const now = Date.now();
  const r = await c.env.DB.prepare(
    `SELECT
       SUM(status = 'active') AS active, SUM(status = 'draft') AS draft, SUM(status = 'suspended') AS suspended,
       SUM(payment_status = 'unpaid' AND status != 'deleted') AS unpaid,
       SUM(status IN ('active','suspended') AND hosting_until IS NOT NULL AND hosting_until > ? AND hosting_until <= ?) AS expiring30,
       SUM(status IN ('active','suspended') AND hosting_until IS NOT NULL AND hosting_until <= ?) AS expired,
       SUM(media_used_bytes) AS media_bytes,
       SUM(CASE WHEN publish_count_date = ? THEN publish_count_day ELSE 0 END) AS publishes_today
     FROM tenants WHERE status != 'deleted'`,
  )
    .bind(now, now + 30 * DAY_MS, now, new Date(now).toISOString().slice(0, 10))
    .first<Record<string, number | null>>();
  return ok(c, {
    tenants: { active: r?.active ?? 0, draft: r?.draft ?? 0, suspended: r?.suspended ?? 0 },
    unpaid: r?.unpaid ?? 0,
    hostingExpiring30: r?.expiring30 ?? 0,
    hostingExpired: r?.expired ?? 0,
    mediaTotalBytes: r?.media_bytes ?? 0,
    publishesToday: r?.publishes_today ?? 0,
  });
});

adminRoutes.get("/audit", async (c) => {
  const tenantId = c.req.query("tenantId");
  const before = Number(c.req.query("cursor") ?? Number.MAX_SAFE_INTEGER);
  const r = tenantId
    ? await c.env.DB.prepare("SELECT * FROM audit_log WHERE tenant_id = ? AND id < ? ORDER BY id DESC LIMIT 100").bind(tenantId, before).all<{ id: number }>()
    : await c.env.DB.prepare("SELECT * FROM audit_log WHERE id < ? ORDER BY id DESC LIMIT 100").bind(before).all<{ id: number }>();
  return ok(c, { items: r.results, nextCursor: r.results.length === 100 ? String(r.results[99]!.id) : null });
});
