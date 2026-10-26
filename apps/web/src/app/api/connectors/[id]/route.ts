import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { encrypt } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";
import { APP_URL } from "@/lib/env";
import { encryptAuth, publicConnector, validateBase } from "@/lib/integrations/custom";
import { ConnectorInput } from "@/lib/integrations/custom";

type P = { params: Promise<{ id: string }> };
async function find(orgId: string, id: string) {
  const c = await db.customConnector.findFirst({ where: { id, orgId } });
  if (!c) throw new HttpError(404, "Connector not found.");
  return c;
}

export const GET = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("integrations");
  const c = await find(ctx.org.id, (await params).id);
  return ok({ data: { ...publicConnector(c), inboundUrl: `${APP_URL}/api/hooks/${c.inboundToken}` } });
});

export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("integrations", "edit");
  if (!isManager(ctx.role) && ctx.actor !== "api") throw new HttpError(403, "Only managers can change connectors.");
  const c = await find(ctx.org.id, (await params).id);
  const d = await body(req, ConnectorInput.partial().extend({ status: ConnectorInput.shape.name.optional() }));
  if (d.baseUrl) await validateBase(d.baseUrl);
  for (const u of [d.authorizeUrl, d.tokenUrl].filter(Boolean) as string[]) await validateBase(u);
  // Keep stored secrets when the form sends the masked placeholder back.
  const prevAuth = (c.authConfig ?? {}) as Record<string, string>;
  const auth = d.authConfig ? Object.fromEntries(Object.entries(encryptAuth(Object.fromEntries(Object.entries(d.authConfig).filter(([, v]) => v !== "••••••")))).concat(Object.entries(d.authConfig).filter(([, v]) => v === "••••••").map(([k]) => [k, prevAuth[k]]))) : undefined;
  const row = await db.customConnector.update({
    where: { id: c.id },
    data: {
      ...(d.name ? { name: d.name } : {}), ...(d.description !== undefined ? { description: d.description } : {}), ...(d.color ? { color: d.color } : {}),
      ...(d.baseUrl ? { baseUrl: d.baseUrl.replace(/\/$/, "") } : {}), ...(d.authType ? { authType: d.authType } : {}), ...(auth ? { authConfig: auth } : {}),
      ...(d.authorizeUrl ? { authorizeUrl: d.authorizeUrl } : {}), ...(d.tokenUrl ? { tokenUrl: d.tokenUrl } : {}), ...(d.scopes ? { scopes: d.scopes } : {}),
      ...(d.clientId ? { clientId: d.clientId } : {}), ...(d.clientSecret && d.clientSecret !== "••••••" ? { clientSecret: encrypt(d.clientSecret) } : {}),
      ...(d.defaultHeaders ? { defaultHeaders: d.defaultHeaders } : {}), ...(d.actions ? { actions: d.actions } : {}),
      ...(d.inboundResource !== undefined ? { inboundResource: d.inboundResource } : {}), ...(d.inboundMapping ? { inboundMapping: d.inboundMapping } : {}),
      ...(d.status === "PAUSED" || d.status === "ACTIVE" ? { status: d.status } : {}),
    },
  });
  await audit(ctx, "connector.updated", "connector", c.id);
  return ok({ data: publicConnector(row) });
});

export const DELETE = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("integrations", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can remove connectors.");
  const c = await find(ctx.org.id, (await params).id);
  await db.customConnector.delete({ where: { id: c.id } });
  await audit(ctx, "connector.deleted", "connector", c.id, { name: c.name });
  return ok({ ok: true });
});
