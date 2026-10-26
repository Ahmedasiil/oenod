import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { audit } from "@/lib/audit";
import { token } from "@/lib/crypto";

type P = { params: Promise<{ id: string }> };

async function load(id: string) {
  const ctx = await requireOrg("developers", "edit");
  if (ctx.actor === "api" || !["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only owners and admins can see signing secrets.");
  const w = await db.webhook.findFirst({ where: { id, orgId: ctx.org.id } });
  if (!w) throw new HttpError(404, "Webhook not found");
  return { ctx, w };
}

// Reveal the signing secret (audited) so the receiving app can verify X-Oenod-Signature.
export const GET = route(async (_req: Request, { params }: P) => {
  const { ctx, w } = await load((await params).id);
  await audit(ctx, "webhook.secret_viewed", "webhook", w.id);
  return ok({ secret: w.secret });
});

// Rotate: the old secret stops working immediately.
export const POST = route(async (_req: Request, { params }: P) => {
  const { ctx, w } = await load((await params).id);
  const secret = `whsec_${token(24)}`;
  await db.webhook.update({ where: { id: w.id }, data: { secret } });
  await audit(ctx, "webhook.secret_rotated", "webhook", w.id);
  return ok({ secret });
});
