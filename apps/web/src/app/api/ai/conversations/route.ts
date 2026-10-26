import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";

export const GET = route(async () => {
  const ctx = await requireOrg("ai");
  const rows = await db.aiConversation.findMany({ where: { orgId: ctx.org.id, userId: ctx.user?.id }, orderBy: { updatedAt: "desc" }, take: 30, select: { id: true, title: true, updatedAt: true } });
  return ok(rows);
});
