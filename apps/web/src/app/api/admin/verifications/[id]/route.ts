import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { decideVerification } from "@/lib/verification";
import { notify } from "@/lib/audit";
import { adminAudit } from "@/lib/admin";

// Approve, reject, or ask the company for more information.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const d = await body(req, z.object({ decision: z.enum(["approve", "reject", "needs_info"]), note: z.string().max(600).optional() }));
  if (d.decision === "needs_info") {
    const v = await db.verificationRequest.update({ where: { id }, data: { status: "NEEDS_INFO", reviewNote: d.note, reviewedBy: ctx.user.name } });
    await notify(v.orgId, "We need a little more information for your verified badge", { body: d.note, link: "/app/settings/verification", level: "warning" });
  } else await decideVerification(id, d.decision === "approve", ctx.user.name, d.note);
  await db.adminAction.updateMany({ where: { status: "PROPOSED", kind: { in: ["approve_verification", "reject_verification"] }, payload: { path: ["requestId"], equals: id } }, data: { status: "DONE", decidedBy: ctx.user.name, decidedAt: new Date() } });
  await adminAudit(ctx.user.id, `verification.${d.decision}`, "verification_request", id, d);
  return ok({ ok: true });
});
