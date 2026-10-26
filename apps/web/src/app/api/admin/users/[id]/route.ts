import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

// Sign a user out everywhere, block or unblock the account, clear a lockout, or grant / remove super admin.
export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const d = await body(req, z.object({ action: z.enum(["signout", "disable", "enable", "unlock", "make_super_admin", "remove_super_admin"]) }));
  if (d.action === "remove_super_admin" && id === ctx.user.id) throw new HttpError(422, "You can't remove your own super admin access.");
  if (d.action === "remove_super_admin" && (await db.user.count({ where: { isSuperAdmin: true } })) <= 1) throw new HttpError(422, "There must always be at least one super admin.");
  if (d.action === "disable" && id === ctx.user.id) throw new HttpError(422, "You can't disable your own account.");
  const data =
    d.action === "signout" ? { tokenVersion: { increment: 1 } }
    : d.action === "disable" ? { disabledAt: new Date(), tokenVersion: { increment: 1 } }
    : d.action === "enable" ? { disabledAt: null }
    : d.action === "unlock" ? { lockedUntil: null, failedLogins: 0 }
    : { isSuperAdmin: d.action === "make_super_admin", tokenVersion: { increment: 1 } };
  if (["signout", "disable"].includes(d.action) || d.action.endsWith("super_admin")) await db.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
  const u = await db.user.update({ where: { id }, data, select: { id: true, name: true, email: true, isSuperAdmin: true } });
  await adminAudit(ctx.user.id, `user.${d.action}`, "user", id);
  return ok(u);
});
