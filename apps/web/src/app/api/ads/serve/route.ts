import { getCtx } from "@/lib/auth";
import { clientIp, ok, route } from "@/lib/http";
import { serveAds, type Viewer } from "@/lib/ads";
import { db } from "@/lib/db";

// Public: get sponsored cards for a placement. Used by the website, web app, desktop and mobile.
export const GET = route(async (req: Request) => {
  const p = new URL(req.url).searchParams;
  const placement = p.get("placement") ?? "web_feed";
  const n = Math.min(3, Math.max(1, Number(p.get("n") || 1)));
  const ctx = await getCtx();
  const emp = ctx.membership ? await db.employee.findFirst({ where: { membershipId: ctx.membership.id }, select: { id: true } }) : null;
  const addr = (ctx.org?.address ?? {}) as Record<string, string>;
  const audience: Viewer["audience"] = !ctx.user ? (placement === "jobs" ? "job_seekers" : placement === "academy" ? "learners" : "visitors") : ctx.role === "OWNER" || ctx.role === "ADMIN" ? "owners" : ctx.role === "MANAGER" ? "managers" : emp ? "employees" : placement === "academy" ? "learners" : "job_seekers";
  const v: Viewer = {
    userId: ctx.user?.id, orgId: ctx.org?.id, role: ctx.role ?? undefined, audience,
    country: p.get("country") ?? ctx.org?.country ?? req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? undefined,
    region: p.get("region") ?? ctx.org?.region ?? undefined, city: p.get("city") ?? addr.city, industry: ctx.org?.industry,
    locale: p.get("locale") ?? ctx.user?.locale ?? req.headers.get("accept-language")?.slice(0, 2),
    lat: p.get("lat") ? Number(p.get("lat")) : ctx.org?.lat ?? undefined, lng: p.get("lng") ? Number(p.get("lng")) : ctx.org?.lng ?? undefined,
    ip: clientIp(req), ua: req.headers.get("user-agent"),
  };
  return ok({ data: await serveAds(placement, v, n) }, { headers: { "Cache-Control": "no-store" } });
});
