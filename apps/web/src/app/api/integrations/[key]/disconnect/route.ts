import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export const POST = route(async (_req: Request, { params }: { params: Promise<{ key: string }> }) => {
  const ctx = await requireOrg("integrations", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can disconnect apps.");
  const key = (await params).key;
  await db.integration.updateMany({ where: { orgId: ctx.org.id, provider: key }, data: { status: "DISCONNECTED", accessToken: null, refreshToken: null, config: undefined } });
  await audit(ctx, "integration.disconnected", "integration", key);
  return ok({ ok: true });
});
