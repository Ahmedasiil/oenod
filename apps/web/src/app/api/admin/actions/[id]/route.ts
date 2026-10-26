import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit, executeAdminAction } from "@/lib/admin";

// Approve (runs it now) or reject an AI proposal. Edits to the payload can be made before approving.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const d = await body(req, z.object({ decision: z.enum(["approve", "reject"]), note: z.string().max(600).optional(), payload: z.record(z.string(), z.unknown()).optional() }));
  const a = await db.adminAction.findUnique({ where: { id } });
  if (!a) throw new HttpError(404, "Action not found.");
  if (d.decision === "reject") {
    if (a.status !== "PROPOSED") throw new HttpError(409, `This action is already ${a.status.toLowerCase()}.`);
    await db.adminAction.update({ where: { id }, data: { status: "REJECTED", decidedBy: ctx.user.name, decidedAt: new Date(), error: d.note } });
    await adminAudit(ctx.user.id, "admin_action.rejected", "admin_action", id);
    return ok({ ok: true });
  }
  if (d.payload || d.note) await db.adminAction.update({ where: { id }, data: { payload: JSON.parse(JSON.stringify({ ...(a.payload as object), ...(d.payload ?? {}), ...(d.note ? { note: d.note } : {}) })) } });
  await executeAdminAction(id, { id: ctx.user.id, name: ctx.user.name });
  return ok(await db.adminAction.findUnique({ where: { id } }));
});
