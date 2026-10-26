import { z } from "zod";
import { LOCALES } from "@oenod/i18n";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { MODULE_KEYS } from "@/lib/modules";
import { audit } from "@/lib/audit";

export const GET = route(async () => {
  const ctx = await requireOrg("settings");
  const o = await db.organization.findUniqueOrThrow({ where: { id: ctx.org.id }, include: { plan: true, _count: { select: { memberships: true, employees: true, locations: true } } } });
  const { stripeCustomerId: _a, stripeSubscriptionId: _b, ...safe } = o;
  return ok(safe);
});

// Company basics: name, branding, language, currency, time zone and which modules are switched on.
export const PATCH = route(async (req: Request) => {
  const ctx = await requireOrg("settings", "edit");
  if (!["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only the owner or an admin can change company settings.");
  const d = await body(req, z.object({
    name: z.string().trim().min(2).max(120).optional(),
    industry: z.string().optional(),
    country: z.string().length(2).optional(),
    region: z.string().max(10).nullable().optional(),
    currency: z.string().length(3).optional(),
    timezone: z.string().refine((tz) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } }, "Unknown time zone").optional(),
    locale: z.enum(LOCALES.map((l) => l.code) as [string, ...string[]]).optional(),
    logoUrl: z.string().url().startsWith("https://").nullable().optional(),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    website: z.string().url().nullable().optional(),
    phone: z.string().max(30).nullable().optional(),
    address: z.record(z.string(), z.string()).nullable().optional(),
    modules: z.array(z.enum(MODULE_KEYS as [string, ...string[]])).optional(),
    aiDefaultAutonomy: z.enum(["ASSIST", "APPROVE", "AUTO"]).optional(),
  }));
  const { address, ...rest } = d;
  const o = await db.organization.update({ where: { id: ctx.org.id }, data: { ...rest, ...(address !== undefined ? { address: address ?? undefined } : {}) } });
  await audit(ctx, "settings.org_updated", "organization", ctx.org.id, d);
  return ok(o);
});
