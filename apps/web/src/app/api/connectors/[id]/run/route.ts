import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { audit } from "@/lib/audit";
import { limit } from "@/lib/ratelimit";
import { runCustom } from "@/lib/integrations/custom";
import { METHODS } from "@/lib/integrations/request";

// Run a saved action, or test any path on the connected API.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("integrations", "edit");
  const c = await db.customConnector.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!c) throw new HttpError(404, "Connector not found.");
  if (c.status === "PAUSED") throw new HttpError(409, "This connector is paused.");
  if (!limit(`conn:${c.id}`, 120, 60_000)) throw new HttpError(429, "Too many requests to this connector. Wait a minute.");
  const d = await body(req, z.object({ action: z.string().optional(), input: z.record(z.unknown()).default({}), method: z.enum(METHODS).optional(), path: z.string().max(1000).optional(), body: z.unknown().optional() }));
  const r = await runCustom(c, d.action ?? null, d.input, d.action ? undefined : { method: d.method ?? "GET", path: d.path ?? "/", body: d.body });
  await audit(ctx, "connector.called", "connector", c.id, { action: d.action ?? `${d.method ?? "GET"} ${d.path ?? "/"}`, status: r.status });
  return ok({ status: r.status, ok: r.ok, data: r.data });
});
