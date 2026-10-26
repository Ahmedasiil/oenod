import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";
import { describeScopes, Manifest } from "@/lib/plugins";

export const GET = route(async () => {
  const ctx = await requireOrg("integrations");
  const rows = await db.pluginInstall.findMany({ where: { orgId: ctx.org.id }, include: { plugin: true }, orderBy: { createdAt: "desc" } });
  const keys = await db.apiKey.findMany({ where: { id: { in: rows.map((r) => r.apiKeyId).filter(Boolean) as string[] } }, select: { id: true, lastUsedAt: true } });
  const used = new Map(keys.map((k) => [k.id, k.lastUsedAt]));
  return ok(rows.map((r) => ({
    id: r.id, status: r.status, installedAt: r.createdAt, lastActivity: r.apiKeyId ? used.get(r.apiKeyId) ?? null : null,
    plugin: { slug: r.plugin.slug, name: r.plugin.name, developer: r.plugin.developer, color: r.plugin.color, iconUrl: r.plugin.iconUrl, verified: r.plugin.verified },
    permissions: describeScopes(Manifest.parse(r.plugin.manifest)),
  })));
});
