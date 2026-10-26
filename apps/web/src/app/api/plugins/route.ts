import { db } from "@/lib/db";
import { ok, route } from "@/lib/http";
import { getCtx } from "@/lib/auth";

// Public plugin marketplace listing. Signed-in companies also see what they have installed.
export const GET = route(async (req: Request) => {
  const u = new URL(req.url).searchParams;
  const q = u.get("q")?.trim(), category = u.get("category");
  const plugins = await db.plugin.findMany({
    where: { status: "PUBLISHED", ...(category ? { category } : {}), ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { tagline: { contains: q, mode: "insensitive" } }, { developer: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: [{ featured: "desc" }, { installs: "desc" }], take: 100,
    select: { id: true, slug: true, name: true, tagline: true, category: true, developer: true, color: true, iconUrl: true, priceCents: true, verified: true, featured: true, installs: true, rating: true },
  });
  const ctx = await getCtx().catch(() => null);
  const orgId = ctx?.org?.id;
  const installed = orgId ? new Set((await db.pluginInstall.findMany({ where: { orgId, status: "ACTIVE" }, select: { pluginId: true } })).map((i) => i.pluginId)) : new Set<string>();
  const categories = await db.plugin.groupBy({ by: ["category"], where: { status: "PUBLISHED" }, _count: true });
  return ok({ plugins: plugins.map((p) => ({ ...p, installed: installed.has(p.id) })), categories: categories.map((c) => ({ name: c.category, count: c._count })) });
});
