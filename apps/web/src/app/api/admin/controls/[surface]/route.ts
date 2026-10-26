import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireSuperAdmin, route } from "@/lib/http";
import { clearPlatformCache, SURFACES } from "@/lib/platform";
import { adminAudit } from "@/lib/admin";

const semver = z.string().regex(/^\d+\.\d+\.\d+$/, "Use a version like 1.4.0");

// Switch a surface between LIVE, MAINTENANCE and READ_ONLY, set a return time, force app updates or pause single modules.
export const PUT = route(async (req: Request, { params }: { params: Promise<{ surface: string }> }) => {
  const ctx = await requireSuperAdmin();
  const surface = (await params).surface;
  if (!SURFACES.some((s) => s.key === surface)) throw new HttpError(404, "Unknown surface.");
  const d = await body(req, z.object({
    mode: z.enum(["LIVE", "MAINTENANCE", "READ_ONLY"]),
    title: z.string().min(2).max(120).optional(),
    message: z.string().min(2).max(600).optional(),
    messages: z.record(z.string(), z.string().max(600)).optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    allowAdmins: z.boolean().optional(),
    allowOrgIds: z.array(z.string()).optional(),
    minVersion: semver.nullable().optional(),
    latestVersion: semver.nullable().optional(),
    updateUrl: z.string().url().nullable().optional(),
    pausedModules: z.array(z.string()).optional(),
  }));
  if (d.endsAt && d.endsAt < new Date()) throw new HttpError(422, "The return time is in the past.");
  const row = await db.platformControl.upsert({ where: { surface }, create: { surface, ...d, updatedBy: ctx.user.name }, update: { ...d, updatedBy: ctx.user.name } });
  clearPlatformCache();
  await adminAudit(ctx.user.id, `platform.${d.mode.toLowerCase()}`, "platform_control", surface, d);
  return ok(row);
});
