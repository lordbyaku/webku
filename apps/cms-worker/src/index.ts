import { Hono } from "hono";
import type { AppEnv, Env } from "./env";
import { csrf, loadSession } from "./lib/auth";
import { ApiError } from "./lib/http";
import { runScheduled } from "./lib/jobs";
import { brandUrl, siteUrl } from "./lib/urls";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { ownerRoutes } from "./routes/owner";

const app = new Hono<AppEnv>();

app.use("/api/*", async (c, next) => {
  await next();
  c.header("cache-control", "no-store");
  c.header("x-content-type-options", "nosniff");
  c.header("x-robots-tag", "noindex");
  c.header("referrer-policy", "same-origin");
});
app.use("/api/*", csrf, loadSession);

app.get("/api/config", (c) =>
  c.json({ ok: true, data: { turnstileSiteKey: c.env.TURNSTILE_SITE_KEY, rootDomain: c.env.ROOT_DOMAIN, siteUrlPattern: siteUrl(c.env, "{slug}"), brandName: c.env.BRAND_NAME, brandUrl: brandUrl(c.env), mediaOrigin: c.env.MEDIA_ORIGIN } }),
);
app.route("/api/auth", authRoutes);
app.route("/api/admin", adminRoutes);

// Pengganti R2 publik untuk dev & staging.
app.get("/api/_dev/media/*", async (c) => {
  // Hanya dev & staging (workers.dev, belum ada R2 custom domain). Mati di produksi.
  if (c.env.ENVIRONMENT === "production") return c.notFound();
  const key = c.req.path.replace(/^\/api\/_dev\/media\//, "");
  const obj = await c.env.MEDIA.get(key);
  if (!obj) return c.notFound();
  return new Response(obj.body, { headers: { "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream" } });
});

app.route("/api", ownerRoutes);

app.notFound((c) => c.json({ ok: false, error: { code: "NOT_FOUND", message: "Alamat tidak ditemukan" } }, 404));

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json({ ok: false, error: { code: err.code, message: err.message, ...(err.extra ?? {}) } }, err.status);
  }
  console.error("Unhandled", err instanceof Error ? err.stack : err);
  return c.json({ ok: false, error: { code: "INTERNAL", message: "Terjadi kesalahan pada server" } }, 500);
});

async function scheduled(_ctrl: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
  ctx.waitUntil(runScheduled(env));
}

export default {
  fetch: app.fetch,
  scheduled,
} satisfies ExportedHandler<Env>;

export { app };
