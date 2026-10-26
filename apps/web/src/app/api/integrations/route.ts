import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";
import { CONNECTORS, isConfigured } from "@/lib/integrations/catalog";
import { APP_URL } from "@/lib/env";

export const GET = route(async () => {
  const ctx = await requireOrg("integrations");
  const rows = await db.integration.findMany({ where: { orgId: ctx.org.id } });
  return ok({
    gpsIngestUrl: `${APP_URL}/api/fleet/ingest`,
    apiDocsUrl: `${APP_URL}/developers`,
    data: CONNECTORS.map((c) => {
      const r = rows.find((x) => x.provider === c.key);
      return { key: c.key, name: c.name, category: c.category, auth: c.auth, description: c.description, color: c.color, fields: c.fields?.map((f) => ({ name: f.name, label: f.label, secret: f.secret, placeholder: f.placeholder })), syncs: c.syncs, available: isConfigured(c), status: c.auth === "builtin" ? "AVAILABLE" : r?.status ?? "NOT_CONNECTED", accountName: r?.accountName, lastSyncAt: r?.lastSyncAt, lastError: r?.lastError };
    }),
  });
});
