import { loadPlatformSettings } from "@/lib/platform-plugins";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { connectorByKey } from "@/lib/integrations/catalog";
import { exchangeCode, readState } from "@/lib/integrations/oauth";
import { encrypt } from "@/lib/crypto";
import { APP_URL } from "@/lib/env";
import { syncGoogleBusiness } from "@/lib/integrations/google";
import { identify } from "@/lib/integrations/request";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  await loadPlatformSettings();
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(`${APP_URL}/app/integrations?${q}`);
  try {
    const c = connectorByKey((await params).key);
    const code = url.searchParams.get("code"), state = url.searchParams.get("state");
    if (!c || !code || !state) return back("error=missing");
    const s = await readState(state);
    if (s.k !== c.key) return back("error=state");
    const t = await exchangeCode(c, s.orgId, code, s.shop);
    const prev = await db.integration.findUnique({ where: { orgId_provider: { orgId: s.orgId, provider: c.key } } });
    const config = { ...((prev?.config ?? {}) as Record<string, string>), ...(s.shop ? { shop: s.shop } : {}) };
    await db.integration.upsert({
      where: { orgId_provider: { orgId: s.orgId, provider: c.key } },
      create: { orgId: s.orgId, provider: c.key, status: "CONNECTED", accessToken: encrypt(t.accessToken), refreshToken: t.refreshToken ? encrypt(t.refreshToken) : null, expiresAt: t.expiresIn ? new Date(Date.now() + t.expiresIn * 1000) : null, scopes: c.scopes ?? [], accountName: s.shop ?? null, config },
      update: { status: "CONNECTED", accessToken: encrypt(t.accessToken), refreshToken: t.refreshToken ? encrypt(t.refreshToken) : undefined, expiresAt: t.expiresIn ? new Date(Date.now() + t.expiresIn * 1000) : null, lastError: null, scopes: c.scopes ?? [], config },
    });
    await identify(c.key, s.orgId).catch(() => {});
    if (c.key === "google_business") syncGoogleBusiness(s.orgId).catch(console.error);
    return back(`connected=${c.key}`);
  } catch (e) {
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message : "failed")}`);
  }
}
