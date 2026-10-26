import { z } from "zod";
import { body, HttpError, ok, requireUser, route } from "@/lib/http";
import { academyCheckout } from "@/lib/academy";
import { getCtx } from "@/lib/auth";

// Buy a course, the Academy Pass, or seats for your team.
export const POST = route(async (req: Request) => {
  const ctx = await requireUser();
  const d = await body(req, z.object({ kind: z.enum(["COURSE", "PASS_MONTH", "PASS_YEAR", "SEATS"]), courseId: z.string().optional(), seats: z.number().int().min(2).max(1000).optional() }));
  let orgId: string | undefined;
  if (d.kind === "SEATS") {
    const c = await getCtx();
    if (!c.org || !c.role || !["OWNER", "ADMIN", "MANAGER", "FINANCE"].includes(c.role)) throw new HttpError(403, "Only company managers can buy seats.");
    orgId = c.org.id;
  }
  return ok({ url: await academyCheckout({ userId: ctx.user.id, email: ctx.user.email, kind: d.kind, courseId: d.courseId, seats: d.seats, orgId }) });
});
