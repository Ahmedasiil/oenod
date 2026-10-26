import { z } from "zod";
import { safeFetch } from "./integrations/safeurl";
import { db } from "./db";
import { sha256, token, encrypt } from "./crypto";
import { MODULE_KEYS } from "./modules";
import { WEBHOOK_EVENTS } from "./webhooks";

/** What a plugin asks for when it is installed. Every scope is shown to the person before they agree. */
export const Manifest = z.object({
  scopes: z.array(z.string().regex(/^[a-z_]+(:(read|write))?$/)).max(40).default([]),
  events: z.array(z.string()).max(40).default([]),
  webhookUrl: z.string().url().startsWith("https://").optional(),
  installUrl: z.string().url().startsWith("https://").optional(),
  embed: z.object({ url: z.string().url().startsWith("https://"), placement: z.enum(["dashboard", "sidebar", "record", "settings"]), title: z.string().max(40).optional() }).optional(),
  settings: z.array(z.object({ name: z.string().regex(/^[a-zA-Z0-9_]+$/), label: z.string().max(60), secret: z.boolean().default(false), required: z.boolean().default(false) })).max(20).default([]),
}).superRefine((m, c) => {
  for (const s of m.scopes) if (!MODULE_KEYS.includes(s.split(":")[0])) c.addIssue({ code: "custom", message: `Unknown scope ${s}` });
  for (const e of m.events) if (!WEBHOOK_EVENTS.includes(e)) c.addIssue({ code: "custom", message: `Unknown event ${e}` });
});
export type Manifest = z.infer<typeof Manifest>;

/** Plain-language list of what the plugin will be able to do, for the consent screen. */
export function describeScopes(m: Manifest) {
  return m.scopes.map((s) => {
    const [mod, lvl] = s.split(":");
    return `${lvl === "write" ? "View and change" : "View"} ${mod.replace(/_/g, " ")}`;
  }).concat(m.events.length ? [`Get notified about: ${m.events.join(", ")}`] : []);
}

/** Install: a scoped API key (only the plugin's scopes) and a signed webhook for its events. */
export async function installPlugin(orgId: string, pluginId: string, userId: string | undefined, settings: Record<string, string>) {
  const plugin = await db.plugin.findUniqueOrThrow({ where: { id: pluginId } });
  const m = Manifest.parse(plugin.manifest);
  const raw = `oen_plg_${token(28)}`;
  const key = await db.apiKey.create({ data: { orgId, name: `Plugin: ${plugin.name}`, prefix: raw.slice(0, 14), hash: sha256(raw), scopes: m.scopes.length ? m.scopes : ["overview:read"] } });
  const hookSecret = token(24);
  const hook = m.webhookUrl && m.events.length ? await db.webhook.create({ data: { orgId, url: m.webhookUrl, events: m.events, secret: hookSecret } }) : null;
  const stored = Object.fromEntries(m.settings.map((s) => [s.name, s.secret && settings[s.name] ? encrypt(settings[s.name]) : settings[s.name] ?? null]));
  const existing = await db.pluginInstall.findUnique({ where: { orgId_pluginId: { orgId, pluginId } } });
  if (existing) await revokeInstall(existing.id);
  const install = await db.pluginInstall.upsert({
    where: { orgId_pluginId: { orgId, pluginId } },
    create: { orgId, pluginId, apiKeyId: key.id, webhookId: hook?.id, settings: stored, installedBy: userId },
    update: { apiKeyId: key.id, webhookId: hook?.id, settings: stored, installedBy: userId, status: "ACTIVE" },
  });
  if (!existing) await db.plugin.update({ where: { id: pluginId }, data: { installs: { increment: 1 } } });
  // The key and webhook secret are handed to the plugin once (via its installUrl) and never stored in plain text.
  if (m.installUrl) {
    await safeFetch(m.installUrl, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "plugin.installed", installId: install.id, orgId, apiKey: raw, webhookSecret: hook ? hookSecret : null, apiBase: `${process.env.APP_URL ?? ""}/api/v1` }),
    }, 8000).catch(() => null);
  }
  return { install, apiKey: m.installUrl ? null : raw, webhookSecret: m.installUrl ? null : hook ? hookSecret : null };
}

export async function revokeInstall(installId: string) {
  const i = await db.pluginInstall.findUnique({ where: { id: installId } });
  if (!i) return;
  if (i.apiKeyId) await db.apiKey.updateMany({ where: { id: i.apiKeyId }, data: { revokedAt: new Date() } });
  if (i.webhookId) await db.webhook.deleteMany({ where: { id: i.webhookId } });
}
