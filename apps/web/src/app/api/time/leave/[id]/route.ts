import { z } from "zod";
import { body, ok, requireOrg, route } from "@/lib/http";
import { decideLeave, leaveContext } from "@/lib/leave";

type P = { params: Promise<{ id: string }> };

// Everything a manager needs before deciding: hours, balance after, shifts affected, who else is off.
export const GET = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("leave", "edit");
  const c = await leaveContext(ctx.org.id, (await params).id);
  const { employee, ...request } = c.request;
  return ok({ ...c, request, employee: { id: employee.id, name: `${employee.firstName} ${employee.lastName}` } });
});

export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("leave", "edit");
  const { decision, note } = await body(req, z.object({ decision: z.enum(["APPROVED", "REJECTED"]), note: z.string().max(500).optional() }));
  return ok(await decideLeave(ctx, (await params).id, decision, note));
});
