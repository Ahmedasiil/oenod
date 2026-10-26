import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { replyToGoogleReview } from "@/lib/integrations/google";
import { audit } from "@/lib/audit";

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("reviews", "edit");
  const { reply } = await body(req, z.object({ reply: z.string().min(2).max(4000) }));
  const r = await db.review.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!r) throw new HttpError(404, "Review not found");
  let posted = false;
  if (r.source === "GOOGLE" && r.externalId) {
    await replyToGoogleReview(ctx.org.id, r.externalId, reply);
    posted = true;
  }
  await db.review.update({ where: { id: r.id }, data: { reply, repliedAt: new Date() } });
  await audit(ctx, "review.replied", "review", r.id);
  return ok({ posted });
});
