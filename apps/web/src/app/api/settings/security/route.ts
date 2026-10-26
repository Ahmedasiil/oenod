import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, requireOrg, route } from "@/lib/http";
import { orgSecurity, ipAllowed, validCidr } from "@/lib/security";
import { audit } from "@/lib/audit";

const ownerOrAdmin = (role: string) => role === "OWNER" || role === "ADMIN";

export const GET = route(async () => {
  const ctx = await requireOrg();
  return ok(orgSecurity(ctx.org));
});

// Company-wide rules: require two-step sign-in, restrict to office networks, shorter sessions, longer passwords.
export const PUT = route(async (req: Request) => {
  const ctx = await requireOrg();
  if (!ownerOrAdmin(ctx.role) || ctx.actor === "api") throw new HttpError(403, "Only the owner or an admin can change security settings.");
  const d = await body(req, z.object({
    require2fa: z.boolean().optional(),
    ipAllowlist: z.array(z.string().trim()).max(100).optional(),
    sessionDays: z.number().int().min(1).max(30).optional(),
    passwordMinLength: z.number().int().min(10).max(64).optional(),
    alertOnNewDevice: z.boolean().optional(),
  }));
  const bad = d.ipAllowlist?.find((x) => !validCidr(x));
  if (bad) throw new HttpError(422, `"${bad}" isn't a valid IP address or range (for example 203.0.113.0/24).`);
  // Never let an admin lock themselves out.
  if (d.ipAllowlist?.length && !ipAllowed(clientIp(req), d.ipAllowlist)) throw new HttpError(422, `Your current address (${clientIp(req) ?? "unknown"}) isn't in the list, so saving would lock you out. Add it first.`);
  if (d.require2fa && !ctx.user?.totpEnabledAt) throw new HttpError(422, "Turn on two-step sign-in for your own account first, then require it for everyone.");
  const next = { ...orgSecurity(ctx.org), ...d };
  await db.organization.update({ where: { id: ctx.org.id }, data: { security: next } });
  await audit(ctx, "security.policy_updated", "organization", ctx.org.id, d);
  return ok(next);
});
