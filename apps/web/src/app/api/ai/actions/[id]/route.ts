import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { runApproved } from "@/lib/ai/tools";
import { isManager, isFinance } from "@/lib/rbac";
import { audit } from "@/lib/audit";

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("ai", "edit");
  const { id } = await params;
  const { decision } = await body(req, z.object({ decision: z.enum(["approve", "reject", "retry"]) }));
  const a = await db.aiAction.findFirst({ where: { id, orgId: ctx.org.id } });
  if (!a) throw new HttpError(404, "Action not found.");
  const financial = ["prepare_payroll", "create_purchase_order", "send_invoice_reminders"].includes(a.tool ?? "");
  if (!(isManager(ctx.role) || (financial && isFinance(ctx.role)))) throw new HttpError(403, "Only a manager can approve this.");
  if (ctx.org.aiPaused && decision !== "reject") throw new HttpError(409, "Automations are paused. Turn off the emergency stop first.");
  await audit(ctx, `ai.action.${decision}`, "aiAction", a.id);
  if (decision === "reject") {
    return ok(await db.aiAction.update({ where: { id }, data: { status: "REJECTED", decidedBy: ctx.user?.name, decidedAt: new Date() } }));
  }
  if (!["NEEDS_APPROVAL", "FAILED", "BLOCKED", "SIMULATED"].includes(a.status)) throw new HttpError(409, "This action has already been handled.");
  await db.aiAction.update({ where: { id }, data: { status: "IN_PROGRESS", decidedBy: ctx.user?.name, decidedAt: new Date() } });
  return ok(await runApproved(ctx, id));
});
