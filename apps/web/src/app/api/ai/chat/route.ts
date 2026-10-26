import { z } from "zod";
import { chat } from "@/lib/ai/agent";
import { body, clientIp, HttpError, ok, requireOrg, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";

export const maxDuration = 300;

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("ai", "edit");
  if (!limit(`ai:${ctx.user?.id ?? clientIp(req)}`, 30, 60_000)) throw new HttpError(429, "Slow down a little — too many requests in a minute.");
  const d = await body(req, z.object({ message: z.string().trim().min(1).max(8000), conversationId: z.string().optional() }));
  if (!ctx.user) throw new HttpError(400, "Use a signed-in user for conversations.");
  return ok(await chat(ctx, d.message, d.conversationId));
});
