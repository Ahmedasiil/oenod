import { z } from "zod";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { checkoutUrl } from "@/lib/billing";

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("billing", "edit");
  if (!ctx.user) throw new HttpError(400, "Sign in to manage billing.");
  const d = await body(req, z.object({ plan: z.string(), interval: z.enum(["month", "year"]).default("month") }));
  return ok({ url: await checkoutUrl(ctx.org.id, d.plan, d.interval, ctx.user.email) });
});
