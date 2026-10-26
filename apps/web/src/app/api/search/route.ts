import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";
import { RESOURCES, labelFor, listResource } from "@/lib/resources";
import { canAccess, type Grants } from "@/lib/rbac";
import { MODULES } from "@/lib/modules";

// Global search (Ctrl/Cmd+K): records in every module the person can see, plus pages and actions.
export const GET = route(async (req: Request) => {
  const ctx = await requireOrg();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return ok({ q, results: [], pages: [] });
  const grants = ctx.membership?.grants as Grants | null;
  const specs = RESOURCES.filter((s) => s.search.length && canAccess(ctx.role, s.module, grants)).slice(0, 40);
  const groups = await Promise.all(specs.map(async (spec) => {
    try {
      const r = await listResource(spec, ctx, new URLSearchParams({ q, limit: "5" }));
      return r.data.map((row: any) => ({ type: spec.key, typeLabel: spec.singular, module: spec.module, id: row.id, title: labelFor(spec, row), subtitle: spec.subtitle ? row[spec.subtitle] ?? null : null, href: `/app/r/${spec.key}/${row.id}` }));
    } catch { return []; }
  }));
  const lower = q.toLowerCase();
  const pages = MODULES.filter((m) => canAccess(ctx.role, m.key, grants) && (m.name.toLowerCase().includes(lower) || m.tagline.toLowerCase().includes(lower) || m.features.some((f) => f.toLowerCase().includes(lower))))
    .slice(0, 6).map((m) => ({ title: m.name, subtitle: m.tagline, href: m.href }));
  const people = canAccess(ctx.role, "people", grants) ? [] : await db.employee.findMany({ where: { orgId: ctx.org.id, status: { not: "TERMINATED" }, OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] }, take: 5, select: { id: true, firstName: true, lastName: true, jobTitle: true } });
  return ok({
    q,
    results: groups.flat().slice(0, 60),
    // Colleague directory (name and title only) for people without HR access.
    directory: people.map((p) => ({ id: p.id, title: `${p.firstName} ${p.lastName}`, subtitle: p.jobTitle })),
    pages,
  });
});
