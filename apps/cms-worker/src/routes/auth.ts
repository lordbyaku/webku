import { Hono } from "hono";
import { dummyPasswordWork, hashPassword, verifyPassword } from "@umkm/shared";
import type { AppEnv } from "../env";
import { audit, clientIp } from "../lib/audit";
import { checkNewPassword, createSession, destroySession } from "../lib/auth";
import { ApiError, badRequest, ok, readJson, str } from "../lib/http";
import { verifyTurnstile } from "../lib/turnstile";

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;

interface UserRow {
  id: string;
  tenant_id: string | null;
  username: string;
  role: "admin" | "owner";
  pw_hash: string;
  pw_salt: string;
  pw_iter: number;
  must_change_pw: number;
  failed_attempts: number;
  locked_until: number | null;
  disabled: number;
}

export const authRoutes = new Hono<AppEnv>();

async function meDto(c: { env: AppEnv["Bindings"] }, userId: string) {
  const u = await c.env.DB.prepare("SELECT id, username, role, tenant_id, must_change_pw FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; username: string; role: string; tenant_id: string | null; must_change_pw: number }>();
  if (!u) return null;
  const tenant = u.tenant_id
    ? await c.env.DB.prepare("SELECT id, slug, business_name FROM tenants WHERE id = ?")
        .bind(u.tenant_id)
        .first<{ id: string; slug: string; business_name: string }>()
    : null;
  return {
    user: { id: u.id, username: u.username, role: u.role, mustChangePassword: u.must_change_pw === 1 },
    tenant: tenant ? { id: tenant.id, slug: tenant.slug, businessName: tenant.business_name } : null,
  };
}

authRoutes.post("/login", async (c) => {
  const body = await readJson(c);
  const username = str(body.username)?.trim() ?? "";
  const password = str(body.password) ?? "";
  if (!username || !password || username.length > 64 || password.length > 128) {
    throw badRequest("Username dan password wajib diisi");
  }
  const ip = clientIp(c);
  if (!(await verifyTurnstile(c.env.TURNSTILE_SECRET, str(body.turnstileToken), ip))) {
    throw new ApiError(403, "TURNSTILE_FAILED", "Verifikasi keamanan gagal, muat ulang halaman");
  }

  const iterTarget = Number(c.env.PBKDF2_ITER) || 100_000;
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first<UserRow>();
  const invalid = new ApiError(401, "UNAUTHENTICATED", "Username atau password salah");
  if (!user || user.disabled) {
    await dummyPasswordWork(iterTarget);
    throw invalid;
  }
  const ts = Date.now();
  if (user.locked_until && user.locked_until > ts) {
    const retryAfter = Math.ceil((user.locked_until - ts) / 1000);
    throw new ApiError(423, "ACCOUNT_LOCKED", `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.`, { retryAfter });
  }

  const good = await verifyPassword(password, { hash: user.pw_hash, salt: user.pw_salt, iter: user.pw_iter });
  if (!good) {
    const fails = user.failed_attempts + 1;
    const lock = fails >= MAX_FAILS;
    await c.env.DB.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?")
      .bind(lock ? 0 : fails, lock ? ts + LOCK_MS : user.locked_until, user.id)
      .run();
    await audit(c, lock ? "auth.locked" : "auth.login_failed", user.tenant_id, undefined, user.id);
    throw invalid;
  }

  // Login sukses; naikkan iterasi bila konfigurasi lebih tinggi (rehash).
  if (user.pw_iter < iterTarget) {
    const h = await hashPassword(password, iterTarget);
    await c.env.DB.prepare("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ? WHERE id = ?").bind(h.hash, h.salt, h.iter, user.id).run();
  }
  await c.env.DB.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?").bind(ts, user.id).run();
  await createSession(c, user);
  await audit(c, "auth.login", user.tenant_id, undefined, user.id);
  return ok(c, await meDto(c, user.id));
});

authRoutes.post("/logout", async (c) => {
  await destroySession(c);
  return ok(c, null);
});

authRoutes.get("/me", async (c) => {
  const user = c.get("user");
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Belum login");
  return ok(c, await meDto(c, user.id));
});

authRoutes.post("/change-password", async (c) => {
  const user = c.get("user");
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Belum login");
  const body = await readJson(c);
  const current = str(body.currentPassword) ?? "";
  const next = str(body.newPassword) ?? "";
  const row = await c.env.DB.prepare("SELECT pw_hash, pw_salt, pw_iter FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ pw_hash: string; pw_salt: string; pw_iter: number }>();
  if (!row || !(await verifyPassword(current, { hash: row.pw_hash, salt: row.pw_salt, iter: row.pw_iter }))) {
    throw badRequest("Password lama salah", { currentPassword: "Password lama salah" });
  }
  const problem = checkNewPassword(next, user.username);
  if (problem) throw badRequest(problem, { newPassword: problem });
  if (next === current) throw badRequest("Password baru harus berbeda", { newPassword: "Password baru harus berbeda" });

  const h = await hashPassword(next, Number(c.env.PBKDF2_ITER) || 100_000);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, must_change_pw = 0 WHERE id = ?").bind(h.hash, h.salt, h.iter, user.id),
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND id_hash != ?").bind(user.id, user.sessionHash),
  ]);
  await audit(c, "auth.change_password", user.tenantId);
  return ok(c, await meDto(c, user.id));
});
