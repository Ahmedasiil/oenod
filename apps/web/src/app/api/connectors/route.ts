import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { token, encrypt } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { APP_URL } from "@/lib/env";
import { AUTH_TYPES, ConnectorInput, encryptAuth, INBOUND_RESOURCES, publicConnector, validateBase } from "@/lib/integrations/custom";

export const GET = route(async () => {
  const ctx = await requireOrg("integrations");
  const rows = await db.customConnector.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "desc" } });
  return ok({ data: rows.map((c) => ({ ...publicConnector(c), inboundUrl: `${APP_URL}/api/hooks/${c.inboundToken}` })), inboundResources: INBOUND_RESOURCES });
});

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("integrations", "edit");
  if (!isManager(ctx.role) && ctx.actor !== "api") throw new HttpError(403, "Only managers can add connectors.");
  const d = await body(req, ConnectorInput);
  await validateBase(d.baseUrl);
  for (const u of [d.authorizeUrl, d.tokenUrl].filter(Boolean) as string[]) await validateBase(u);
  if ((await db.customConnector.count({ where: { orgId: ctx.org.id } })) >= 100) throw new HttpError(422, "You can have up to 100 custom connectors.");
  const c = await db.customConnector.create({
    data: {
      orgId: ctx.org.id, name: d.name, description: d.description, color: d.color, baseUrl: d.baseUrl.replace(/\/$/, ""), authType: d.authType, authConfig: encryptAuth(d.authConfig),
      authorizeUrl: d.authorizeUrl, tokenUrl: d.tokenUrl, scopes: d.scopes, clientId: d.clientId, clientSecret: d.clientSecret ? encrypt(d.clientSecret) : null,
      defaultHeaders: d.defaultHeaders, actions: d.actions, inboundResource: d.inboundResource ?? null, inboundMapping: d.inboundMapping, inboundToken: `in_${token(24)}`,
    },
  });
  await audit(ctx, "connector.created", "connector", c.id, { name: c.name, baseUrl: c.baseUrl });
  return ok({ data: { ...publicConnector(c), inboundUrl: `${APP_URL}/api/hooks/${c.inboundToken}` } }, 201);
});
