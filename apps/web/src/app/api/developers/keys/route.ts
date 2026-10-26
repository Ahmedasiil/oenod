import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { sha256, token } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export const GET = route(async () => {
  const ctx = await requireOrg("developers");
  const keys = await db.apiKey.findMany({ where: { orgId: ctx.org.id, revokedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, createdAt: true } });
  const deliveries = await db.webhookDelivery.findMany({ where: { webhook: { orgId: ctx.org.id } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, event: true, status: true, responseCode: true, attempts: true, createdAt: true } });
  return ok({ keys, deliveries });
});

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("developers", "edit");
  if (ctx.actor === "api" || !["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only owners and admins can create API keys.");
  const { name } = await body(req, z.object({ name: z.string().min(2).max(60) }));
  const raw = `oen_live_${token(28)}`;
  await db.apiKey.create({ data: { orgId: ctx.org.id, name, prefix: raw.slice(0, 14), hash: sha256(raw), scopes: ["*"] } });
  await audit(ctx, "apikey.created", "apiKey", undefined, { name });
  return ok({ key: raw, note: "Copy this key now. For your security it won't be shown again." }, 201);
});
