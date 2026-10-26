import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

export const GET = route(async (req: Request) => {
  await requireSuperAdmin();
  const q = new URL(req.url).searchParams;
  const search = q.get("q")?.trim();
  const page = Math.max(1, Number(q.get("page") ?? 1));
  const where = search ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }] } : {};
  const [rows, total] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, select: { id: true, name: true, email: true, isSuperAdmin: true, locale: true, lastSeenAt: true, createdAt: true, marketingEmailConsent: true, memberships: { select: { role: true, org: { select: { id: true, name: true } } } } } }),
    db.user.count({ where }),
  ]);
  return ok({ data: rows, total, page, pages: Math.ceil(total / 50) });
});
