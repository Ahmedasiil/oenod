import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

// The approvals queue: everything the AI proposed and is waiting on a super admin.
export const GET = route(async (req: Request) => {
  await requireSuperAdmin();
  const status = new URL(req.url).searchParams.get("status") ?? "PROPOSED";
  const [rows, counts] = await Promise.all([
    db.adminAction.findMany({ where: status === "all" ? {} : { status }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.adminAction.groupBy({ by: ["status"], _count: true }),
  ]);
  return ok({ data: rows, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) });
});
