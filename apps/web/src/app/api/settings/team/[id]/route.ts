import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager, moduleLevels, type Grants } from "@/lib/rbac";
import { MODULE_KEYS } from "@/lib/modules";
import { audit, notify } from "@/lib/audit";

type P = { params: Promise<{ id: string }> };
const LEVEL = z.enum(["none", "view", "edit"]);

async function load(orgId: string, id: string) {
  const m = await db.membership.findFirst({ where: { id, orgId }, include: { user: { select: { id: true, name: true, email: true } } } });
  if (!m) throw new HttpError(404, "Team member not found.");
  return m;
}

// Change someone's role, title or per-module access (for example: let a cashier manage inventory, or a supervisor see marketing).
export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("settings", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only owners, admins and managers can change access.");
  const m = await load(ctx.org.id, (await params).id);
  const d = await body(req, z.object({
    role: z.enum(["OWNER", "ADMIN", "MANAGER", "FINANCE", "ACCOUNTANT", "EMPLOYEE"]).optional(),
    title: z.string().max(80).nullable().optional(),
    grants: z.record(z.string(), LEVEL).optional(),
  }));
  if (m.role === "OWNER" && ctx.role !== "OWNER") throw new HttpError(403, "Only the owner can change the owner's access.");
  if (d.role && ctx.role === "MANAGER") throw new HttpError(403, "Managers can change module access, not roles.");
  if (d.role === "OWNER" && ctx.role !== "OWNER") throw new HttpError(403, "Only the owner can hand over ownership.");
  if (m.userId === ctx.user?.id && d.role && d.role !== m.role) throw new HttpError(422, "You can't change your own role.");
  if (m.role === "OWNER" && d.role && d.role !== "OWNER" && (await db.membership.count({ where: { orgId: ctx.org.id, role: "OWNER" } })) <= 1) throw new HttpError(422, "The company needs at least one owner.");
  const grants = d.grants ? Object.fromEntries(Object.entries(d.grants).filter(([k]) => MODULE_KEYS.includes(k) || k === "billing")) : undefined;
  // Managers can only hand out access they have themselves.
  if (grants && ctx.role === "MANAGER") {
    const mine = moduleLevels(ctx.role, ctx.membership?.grants as Grants | null) as Record<string, string>;
    const rank = { none: 0, view: 1, edit: 2 } as const;
    const over = Object.entries(grants).find(([k, v]) => rank[v] > rank[(mine[k] ?? "none") as keyof typeof rank]);
    if (over) throw new HttpError(403, `You can't give more access to ${over[0]} than you have.`);
  }
  const updated = await db.membership.update({ where: { id: m.id }, data: { ...(d.role ? { role: d.role } : {}), ...(d.title !== undefined ? { title: d.title } : {}), ...(grants ? { grants } : {}) } });
  await audit(ctx, "member.access_changed", "membership", m.id, { role: d.role, grants });
  await notify(ctx.org.id, "Your access in OENOD was updated", { userId: m.userId, body: "Open the app to see what's new for you.", level: "info" });
  return ok({ ...updated, access: moduleLevels(updated.role, updated.grants as Grants | null) });
});

// Remove someone from the company. Their history (time, pay, tasks) stays for the records.
export const DELETE = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("settings", "edit");
  if (!["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only the owner or an admin can remove people.");
  const m = await load(ctx.org.id, (await params).id);
  if (m.role === "OWNER") throw new HttpError(422, "Transfer ownership before removing the owner.");
  if (m.userId === ctx.user?.id) throw new HttpError(422, "You can't remove yourself.");
  await db.employee.updateMany({ where: { membershipId: m.id }, data: { membershipId: null } });
  await db.membership.delete({ where: { id: m.id } });
  await audit(ctx, "member.removed", "membership", m.id, { email: m.user.email });
  return ok({ ok: true });
});
