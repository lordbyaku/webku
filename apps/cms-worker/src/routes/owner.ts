import { Hono } from "hono";
import { TEMPLATES } from "@umkm/templates";
import type { AppEnv } from "../env";
import { audit } from "../lib/audit";
import { requireAuth, requireOwner } from "../lib/auth";
import { ok, readJson, str } from "../lib/http";
import { deleteMedia, listMedia, mediaDto, updateMediaAlt, uploadMedia } from "../lib/media";
import { getSiteData, previewSite, publishSite, saveContent, setTemplate } from "../lib/site-ops";

/** Endpoint pemilik UMKM. tenantId SELALU dari sesi (requireOwner). */
export const ownerRoutes = new Hono<AppEnv>();
ownerRoutes.use("*", requireAuth, requireOwner);

ownerRoutes.get("/site", async (c) => ok(c, await getSiteData(c, c.get("tenantId"))));
ownerRoutes.put("/site/content", (c) => saveContent(c, c.get("tenantId")));
ownerRoutes.post("/site/preview", (c) => previewSite(c, c.get("tenantId")));
ownerRoutes.post("/site/publish", (c) => publishSite(c, c.get("tenantId"), false));
ownerRoutes.put("/site/template", (c) => setTemplate(c, c.get("tenantId"), false));

ownerRoutes.get("/templates", (c) =>
  ok(c, TEMPLATES.map((t) => ({ ...t, thumbnail: `/_tpl/thumbs/${t.id}.webp` }))),
);

ownerRoutes.get("/media", async (c) => ok(c, await listMedia(c.env, c.get("tenantId"), c.req.query("cursor") ?? null)));

ownerRoutes.post("/media", async (c) => {
  const tenantId = c.get("tenantId");
  const row = await uploadMedia(c.env, tenantId, await c.req.formData());
  await audit(c, "media.upload", tenantId, { id: row.id, bytes: row.bytes });
  return ok(c, mediaDto(c.env, row), 201);
});

ownerRoutes.patch("/media/:id", async (c) => {
  const body = await readJson(c);
  await updateMediaAlt(c.env, c.get("tenantId"), c.req.param("id"), str(body.alt));
  return ok(c, null);
});

ownerRoutes.delete("/media/:id", async (c) => {
  const tenantId = c.get("tenantId");
  await deleteMedia(c.env, tenantId, c.req.param("id"), c.req.query("force") === "1");
  await audit(c, "media.delete", tenantId, { id: c.req.param("id") });
  return ok(c, null);
});
