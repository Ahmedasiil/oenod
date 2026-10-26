import { z } from "zod";
import { body, HttpError, ok, requireSuperAdmin, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { adminChat } from "@/lib/ai/admin-agent";

export const maxDuration = 300;

export const POST = route(async (req: Request) => {
  const ctx = await requireSuperAdmin();
  if (!limit(`adminai:${ctx.user.id}`, 30)) throw new HttpError(429, "Slow down a little and try again in a minute.");
  const d = await body(req, z.object({ message: z.string().min(1).max(8000), conversationId: z.string().optional() }));
  return ok(await adminChat({ id: ctx.user.id, name: ctx.user.name }, d.message, d.conversationId));
});
