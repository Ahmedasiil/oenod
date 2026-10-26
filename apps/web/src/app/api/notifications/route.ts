import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";

// Company-wide notices (no userId) are for managers; employees only see their own.
const scope = (ctx: Awaited<ReturnType<typeof requireOrg>>) =>
  ctx.role === "EMPLOYEE" ? { orgId: ctx.org.id, userId: ctx.user?.id ?? "-" } : { orgId: ctx.org.id, OR: [{ userId: null }, { userId: ctx.user?.id }] };

export const GET = route(async () => {
  const ctx = await requireOrg();
  const where = scope(ctx);
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 30 }),
    db.notification.count({ where: { ...where, readAt: null } }),
  ]);
  return ok({ items, unread });
});

export const POST = route(async () => {
  const ctx = await requireOrg();
  await db.notification.updateMany({ where: { ...scope(ctx), readAt: null }, data: { readAt: new Date() } });
  return ok({ ok: true });
});
