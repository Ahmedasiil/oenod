import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";
import { Manifest } from "@/lib/plugins";

const secret = () => new TextEncoder().encode(`${process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me"}:plugin-embed`);

// Panels that installed plugins add inside OENOD. Each iframe gets a short-lived signed token
// so the plugin knows which company and person is looking, without ever seeing their session.
export const GET = route(async (req: Request) => {
  const ctx = await requireOrg();
  const placement = new URL(req.url).searchParams.get("placement");
  const rows = await db.pluginInstall.findMany({ where: { orgId: ctx.org.id, status: "ACTIVE", plugin: { status: "PUBLISHED" } }, include: { plugin: true } });
  const out = [];
  for (const r of rows) {
    const m = Manifest.safeParse(r.plugin.manifest);
    if (!m.success || !m.data.embed || (placement && m.data.embed.placement !== placement)) continue;
    const t = await new SignJWT({ org: ctx.org.id, install: r.id, user: ctx.user?.id, role: ctx.role, locale: ctx.user?.locale ?? ctx.org.locale })
      .setProtectedHeader({ alg: "HS256" }).setAudience(r.plugin.slug).setIssuedAt().setExpirationTime("10m").sign(secret());
    const url = new URL(m.data.embed.url);
    url.searchParams.set("oenod_token", t);
    out.push({ slug: r.plugin.slug, title: m.data.embed.title ?? r.plugin.name, placement: m.data.embed.placement, url: url.toString(), origin: url.origin });
  }
  return ok(out);
});
