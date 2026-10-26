import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { audit } from "@/lib/audit";

export const DELETE = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("developers", "edit");
  if (!["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only owners and admins can revoke API keys.");
  const id = (await params).id;
  await db.apiKey.updateMany({ where: { id, orgId: ctx.org.id }, data: { revokedAt: new Date() } });
  await audit(ctx, "apikey.revoked", "apiKey", id);
  return ok({ ok: true });
});
