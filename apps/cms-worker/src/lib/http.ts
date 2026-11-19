import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class ApiError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const notFound = (what = "Data") => new ApiError(404, "NOT_FOUND", `${what} tidak ditemukan`);
export const badRequest = (message: string, fields?: Record<string, string>) =>
  new ApiError(400, "VALIDATION_ERROR", message, fields ? { fields } : undefined);

export function ok<T>(c: Context, data: T, status: ContentfulStatusCode = 200) {
  return c.json({ ok: true, data }, status);
}

export async function readJson<T = Record<string, unknown>>(c: Context): Promise<T> {
  try {
    const body = await c.req.json();
    if (body === null || typeof body !== "object") throw new Error();
    return body as T;
  } catch {
    throw badRequest("Body harus berupa JSON yang valid");
  }
}

export function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export function now(): number {
  return Date.now();
}
