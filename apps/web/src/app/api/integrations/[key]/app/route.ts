import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { encrypt } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { connectorByKey } from "@/lib/integrations/catalog";
import { redirectUri } from "@/lib/integrations/oauth";

// "Use my own app": a company can register its own Google/Microsoft/Salesforce... OAuth app.
export const GET = route(async (_req: Request, { params }: { params: Promise<{ key: string }> }) => {
  await requireOrg("integrations");
  const c = connectorByKey((await params).key);
  if (!c || c.auth !== "oauth") throw new HttpError(404, "Unknown connector");
  return ok({ redirectUri: redirectUri(c), scopes: c.scopes ?? [], help: c.envPrefix === "MICROSOFT" ? "Register an app in Microsoft Entra admin center > App registrations, add this redirect URI (Web), create a client secret and add the Microsoft Graph permissions listed." : c.envPrefix === "GOOGLE" ? "Create an OAuth client (Web application) in Google Cloud Console > APIs & Services > Credentials, add this redirect URI and enable the APIs listed." : "Create an OAuth app with the provider, add this redirect URI and copy the client ID and secret." });
});

export const POST = route(async (req: Request, { params }: { params: Promise<{ key: string }> }) => {
  const ctx = await requireOrg("integrations", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can connect apps.");
  const c = connectorByKey((await params).key);
  if (!c || c.auth !== "oauth") throw new HttpError(404, "Unknown connector");
  const d = await body(req, z.object({ clientId: z.string().trim().min(4).max(300), clientSecret: z.string().trim().min(4).max(500), tenant: z.string().trim().max(100).optional() }));
  const prev = await db.integration.findUnique({ where: { orgId_provider: { orgId: ctx.org.id, provider: c.key } } });
  const config = { ...((prev?.config ?? {}) as Record<string, string>), clientId: d.clientId, clientSecret: encrypt(d.clientSecret), ...(d.tenant ? { tenant: d.tenant } : {}) };
  await db.integration.upsert({ where: { orgId_provider: { orgId: ctx.org.id, provider: c.key } }, create: { orgId: ctx.org.id, provider: c.key, status: "PENDING", config }, update: { config } });
  await audit(ctx, "integration.own_app_saved", "integration", c.key);
  return ok({ ok: true, next: `/api/integrations/${c.key}/connect` });
});
