import type { Context } from "hono";
import type { AppEnv } from "../env";

export function auditStmt(
  db: D1Database,
  e: { actorUserId: string | null; tenantId: string | null; action: string; detail?: unknown; ip?: string | null },
): D1PreparedStatement {
  return db
    .prepare("INSERT INTO audit_log (actor_user_id, tenant_id, action, detail_json, ip, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(e.actorUserId, e.tenantId, e.action, e.detail === undefined ? null : JSON.stringify(e.detail), e.ip ?? null, Date.now());
}

export function clientIp(c: Context<AppEnv>): string | null {
  return c.req.header("cf-connecting-ip") ?? null;
}

export async function audit(
  c: Context<AppEnv>,
  action: string,
  tenantId: string | null,
  detail?: unknown,
  actorUserId?: string | null,
): Promise<void> {
  const actor = actorUserId !== undefined ? actorUserId : (c.get("user")?.id ?? null);
  await auditStmt(c.env.DB, { actorUserId: actor, tenantId, action, detail, ip: clientIp(c) }).run();
}
