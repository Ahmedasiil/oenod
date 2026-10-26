import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

export const GET = route(async () => {
  const ctx = await requireSuperAdmin();
  return ok({ data: await db.adminConversation.findMany({ where: { userId: ctx.user.id }, orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, title: true, updatedAt: true } }) });
});
