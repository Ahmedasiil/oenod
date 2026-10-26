import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

export const GET = route(async (req: Request) => {
  await requireSuperAdmin();
  const q = new URL(req.url).searchParams;
  const where = { ...(q.get("orgId") ? { orgId: q.get("orgId")! } : {}), ...(q.get("actor") ? { actor: q.get("actor")! } : {}), ...(q.get("action") ? { action: { startsWith: q.get("action")! } } : {}), ...(q.get("userId") ? { userId: q.get("userId")! } : {}) };
  const page = Math.max(1, Number(q.get("page") ?? 1));
  const [rows, total] = await Promise.all([db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 100, take: 100, include: { org: { select: { name: true } } } }), db.auditLog.count({ where })]);
  return ok({ data: rows, total, page, pages: Math.ceil(total / 100) });
});
