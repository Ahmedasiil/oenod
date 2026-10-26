import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

// Blue badge requests with the AI report, newest waiting first.
export const GET = route(async (req: Request) => {
  await requireSuperAdmin();
  const status = new URL(req.url).searchParams.get("status");
  const rows = await db.verificationRequest.findMany({
    where: status ? { status } : { status: { in: ["SUBMITTED", "AI_CHECKED", "NEEDS_INFO"] } },
    orderBy: { submittedAt: "desc" }, take: 100,
    include: { org: { select: { id: true, name: true, slug: true, logoUrl: true, website: true, createdAt: true } } },
  });
  const docs = await db.document.findMany({ where: { id: { in: rows.flatMap((r) => r.documentIds) } }, select: { id: true, name: true, kind: true, mime: true } });
  return ok({ data: rows.map(({ emailCode: _c, ...r }) => ({ ...r, documents: docs.filter((d) => r.documentIds.includes(d.id)) })) });
});
