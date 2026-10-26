import { db } from "@/lib/db";
import { ok } from "@/lib/http";
import { publicStatus } from "@/lib/platform";

// Public, always on: the apps call this at launch to show maintenance or force-update screens.
export async function GET() {
  const [surfaces, banner, incidents] = await Promise.all([
    publicStatus(),
    db.platformBanner.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" }, select: { message: true, level: true, link: true } }).catch(() => null),
    db.statusIncident.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, status: true, message: true, components: true, createdAt: true } }).catch(() => []),
  ]);
  return ok({ surfaces, banner, incidents, time: new Date() }, { headers: { "Cache-Control": "public, max-age=15" } });
}
