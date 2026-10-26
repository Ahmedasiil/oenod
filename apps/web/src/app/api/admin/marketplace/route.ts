import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

// Plugins submitted by developers, for review before they appear in the marketplace.
export const GET = route(async (req: Request) => {
  await requireSuperAdmin();
  const status = new URL(req.url).searchParams.get("status") ?? "REVIEW";
  return ok({ data: await db.plugin.findMany({ where: { status }, orderBy: { updatedAt: "desc" }, include: { publisher: { select: { id: true, name: true, verificationStatus: true } } } }) });
});
