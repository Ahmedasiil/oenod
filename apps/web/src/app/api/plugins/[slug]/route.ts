import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { getCtx } from "@/lib/auth";
import { audit, notify } from "@/lib/audit";
import { describeScopes, installPlugin, Manifest, revokeInstall } from "@/lib/plugins";

type P = { params: Promise<{ slug: string }> };
const find = async (slug: string) => {
  const p = await db.plugin.findUnique({ where: { slug } });
  if (!p) throw new HttpError(404, "Plugin not found.");
  return p;
};

export const GET = route(async (_req: Request, { params }: P) => {
  const p = await find((await params).slug);
  const ctx = await getCtx().catch(() => null);
  const mine = ctx?.org && p.publisherOrgId === ctx.org.id;
  if (p.status !== "PUBLISHED" && !mine) throw new HttpError(404, "Plugin not found.");
  const m = Manifest.parse(p.manifest);
  const install = ctx?.org ? await db.pluginInstall.findUnique({ where: { orgId_pluginId: { orgId: ctx.org.id, pluginId: p.id } }, select: { id: true, status: true, createdAt: true } }) : null;
  return ok({
    plugin: { ...p, manifest: undefined, publisherOrgId: undefined, reviewNote: mine ? p.reviewNote : undefined },
    permissions: describeScopes(m),
    settings: m.settings.map(({ name, label, secret, required }) => ({ name, label, secret, required })),
    embed: m.embed ? { placement: m.embed.placement, title: m.embed.title ?? p.name } : null,
    install,
  });
});

// Install: the person must accept the listed permissions. Owners and admins only.
export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("integrations", "edit");
  if (ctx.actor === "api" || !["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only owners and admins can install plugins.");
  const p = await find((await params).slug);
  if (p.status !== "PUBLISHED") throw new HttpError(409, "This plugin isn't available yet.");
  const { accept, settings } = await body(req, z.object({ accept: z.literal(true, { errorMap: () => ({ message: "Please review and accept the permissions." }) }), settings: z.record(z.string().max(2000)).default({}) }));
  void accept;
  const m = Manifest.parse(p.manifest);
  const missing = m.settings.filter((s) => s.required && !settings[s.name]).map((s) => s.label);
  if (missing.length) throw new HttpError(400, `Please fill in: ${missing.join(", ")}.`);
  if (p.priceCents > 0 && !ctx.org.stripeSubscriptionId) throw new HttpError(402, "Paid plugins need an active subscription. Add billing first.");
  const r = await installPlugin(ctx.org.id, p.id, ctx.user?.id, settings);
  await audit(ctx, "plugin.installed", "plugin", p.id, { name: p.name, scopes: m.scopes });
  await notify(ctx.org.id, `${p.name} was installed`, { body: `It can: ${describeScopes(m).join("; ")}`, link: "/app/integrations/plugins" });
  return ok({ installed: true, installId: r.install.id, ...(r.apiKey ? { apiKey: r.apiKey, webhookSecret: r.webhookSecret, note: "Paste these into the plugin's settings. They won't be shown again." } : {}) }, 201);
});

export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("integrations", "edit");
  if (!["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only owners and admins can change plugins.");
  const p = await find((await params).slug);
  const { status } = await body(req, z.object({ status: z.enum(["ACTIVE", "DISABLED"]) }));
  const i = await db.pluginInstall.findUnique({ where: { orgId_pluginId: { orgId: ctx.org.id, pluginId: p.id } } });
  if (!i) throw new HttpError(404, "Not installed.");
  await db.pluginInstall.update({ where: { id: i.id }, data: { status } });
  if (i.apiKeyId) await db.apiKey.update({ where: { id: i.apiKeyId }, data: { revokedAt: status === "DISABLED" ? new Date() : null } });
  if (i.webhookId) await db.webhook.updateMany({ where: { id: i.webhookId }, data: { active: status === "ACTIVE" } });
  await audit(ctx, status === "ACTIVE" ? "plugin.enabled" : "plugin.disabled", "plugin", p.id);
  return ok({ status });
});

export const DELETE = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("integrations", "edit");
  if (!["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only owners and admins can remove plugins.");
  const p = await find((await params).slug);
  const i = await db.pluginInstall.findUnique({ where: { orgId_pluginId: { orgId: ctx.org.id, pluginId: p.id } } });
  if (!i) return ok({ removed: false });
  await revokeInstall(i.id);
  await db.pluginInstall.delete({ where: { id: i.id } });
  await db.plugin.update({ where: { id: p.id }, data: { installs: { decrement: 1 } } });
  await audit(ctx, "plugin.removed", "plugin", p.id, { name: p.name });
  return ok({ removed: true, note: "Its access key was revoked and it no longer receives your data." });
});
