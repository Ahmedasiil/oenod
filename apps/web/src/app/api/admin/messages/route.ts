import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

// Every email and SMS the platform sent or skipped, for delivery checks and consent audits.
export const GET = route(async (req: Request) => {
  await requireSuperAdmin();
  const q = new URL(req.url).searchParams;
  const where = { ...(q.get("status") ? { status: q.get("status")! } : {}), ...(q.get("channel") ? { channel: q.get("channel")! } : {}), ...(q.get("to") ? { to: { contains: q.get("to")! } } : {}), ...(q.get("campaignId") ? { campaignId: q.get("campaignId")! } : {}) };
  const page = Math.max(1, Number(q.get("page") ?? 1));
  const [rows, total] = await Promise.all([db.messageLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 100, take: 100 }), db.messageLog.count({ where })]);
  return ok({ data: rows, total, page, pages: Math.ceil(total / 100) });
});
