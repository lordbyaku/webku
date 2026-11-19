import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { DAY_MS, randomToken, sha256Hex } from "@umkm/shared";
import type { AppEnv, SessionUser } from "../env";
import { ApiError } from "./http";

export const COOKIE = "__Host-sid";
const OWNER_TTL = 30 * DAY_MS;
const ADMIN_TTL = 12 * 3600_000;
const SLIDE_WHEN_LEFT = 7 * DAY_MS;

export function sessionTtl(role: "admin" | "owner"): number {
  return role === "admin" ? ADMIN_TTL : OWNER_TTL;
}

export async function createSession(c: Context<AppEnv>, user: { id: string; role: "admin" | "owner" }): Promise<void> {
  const token = randomToken(32);
  const hash = await sha256Hex(token);
  const ts = Date.now();
  const ttl = sessionTtl(user.role);
  await c.env.DB.prepare("INSERT INTO sessions (id_hash, user_id, expires_at, created_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(hash, user.id, ts + ttl, ts, c.req.header("cf-connecting-ip") ?? null, (c.req.header("user-agent") ?? "").slice(0, 200))
    .run();
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: "Lax", path: "/", maxAge: Math.floor(ttl / 1000) });
}

export async function destroySession(c: Context<AppEnv>): Promise<void> {
  const token = getCookie(c, COOKIE);
  if (token) await c.env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(await sha256Hex(token)).run();
  deleteCookie(c, COOKIE, { path: "/", secure: true });
}

interface SessionRow {
  id_hash: string;
  expires_at: number;
  user_id: string;
  username: string;
  role: "admin" | "owner";
  tenant_id: string | null;
  must_change_pw: number;
}

/** Memuat sesi bila ada (tidak mewajibkan login). */
export const loadSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, COOKIE);
  if (token && token.length <= 128) {
    const hash = await sha256Hex(token);
    const ts = Date.now();
    const row = await c.env.DB.prepare(
      `SELECT s.id_hash, s.expires_at, u.id AS user_id, u.username, u.role, u.tenant_id, u.must_change_pw
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id_hash = ? AND s.expires_at > ? AND u.disabled = 0`,
    )
      .bind(hash, ts)
      .first<SessionRow>();
    if (row) {
      let expiresAt = row.expires_at;
      if (row.role === "owner" && expiresAt - ts < SLIDE_WHEN_LEFT) {
        expiresAt = ts + OWNER_TTL;
        await c.env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE id_hash = ?").bind(expiresAt, hash).run();
        setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: "Lax", path: "/", maxAge: Math.floor(OWNER_TTL / 1000) });
      }
      const user: SessionUser = {
        id: row.user_id,
        username: row.username,
        role: row.role,
        tenantId: row.tenant_id,
        mustChangePw: row.must_change_pw === 1,
        sessionHash: hash,
        expiresAt,
      };
      c.set("user", user);
    }
  }
  await next();
};

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get("user");
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Silakan login terlebih dahulu");
  if (user.mustChangePw) throw new ApiError(403, "PASSWORD_CHANGE_REQUIRED", "Silakan ganti password terlebih dahulu");
  await next();
};

/** Pemilik UMKM: tenant SELALU diambil dari sesi. */
export const requireOwner: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get("user");
  if (!user || user.role !== "owner" || !user.tenantId) throw new ApiError(403, "FORBIDDEN", "Halaman ini khusus pemilik usaha");
  c.set("tenantId", user.tenantId);
  await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get("user");
  if (!user || user.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Khusus admin");
  await next();
};

/** CSRF: method tulis wajib Origin yang sama + header X-CMS. */
export const csrf: MiddlewareHandler<AppEnv> = async (c, next) => {
  const m = c.req.method;
  if (m !== "GET" && m !== "HEAD" && m !== "OPTIONS") {
    const origin = c.req.header("origin");
    if (origin !== c.env.CMS_ORIGIN || c.req.header("x-cms") !== "1") {
      throw new ApiError(403, "CSRF_FAILED", "Permintaan ditolak");
    }
  }
  await next();
};

const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890", "qwerty123", "11111111",
  "00000000", "87654321", "iloveyou", "sayang123", "bismillah", "indonesia", "admin123", "rahasia123",
  "qwertyuiop", "abc12345", "passw0rd", "welcome1", "12341234", "asdfghjk", "superman", "doraemon",
]);

export function checkNewPassword(pw: string, username: string): string | null {
  if (pw.length < 8) return "Password minimal 8 karakter";
  if (pw.length > 128) return "Password terlalu panjang";
  if (pw.toLowerCase() === username.toLowerCase()) return "Password tidak boleh sama dengan username";
  if (COMMON.has(pw.toLowerCase())) return "Password terlalu umum, pilih yang lain";
  return null;
}
