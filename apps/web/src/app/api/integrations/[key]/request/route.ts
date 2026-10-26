import { z } from "zod";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { audit } from "@/lib/audit";
import { limit } from "@/lib/ratelimit";
import { callConnected, METHODS } from "@/lib/integrations/request";

// Universal request: call any endpoint of a connected app with the stored credentials.
export const POST = route(async (req: Request, { params }: { params: Promise<{ key: string }> }) => {
  const ctx = await requireOrg("integrations", "edit");
  const key = (await params).key;
  if (!limit(`intreq:${ctx.org.id}:${key}`, 120, 60_000)) throw new HttpError(429, "Too many requests. Wait a minute.");
  const d = await body(req, z.object({ method: z.enum(METHODS).default("GET"), path: z.string().min(1).max(2000), body: z.unknown().optional(), query: z.record(z.string()).optional() }));
  const r = await callConnected(ctx.org.id, key, d.method, d.path, d.body, d.query);
  await audit(ctx, "integration.request", "integration", key, { method: d.method, path: d.path, status: r.status });
  return ok({ status: r.status, ok: r.ok, data: r.data });
});
