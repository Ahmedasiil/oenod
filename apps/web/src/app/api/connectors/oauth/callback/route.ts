import { loadPlatformSettings } from "@/lib/platform-plugins";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { APP_URL } from "@/lib/env";
import { safeFetch } from "@/lib/integrations/safeurl";

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me");

export async function GET(req: Request) {
  await loadPlatformSettings();
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(`${APP_URL}/app/integrations?tab=custom&${q}`);
  try {
    const { payload } = await jwtVerify(url.searchParams.get("state") ?? "", key());
    const { cid, orgId } = payload as { cid: string; orgId: string };
    const c = await db.customConnector.findFirst({ where: { id: cid, orgId } });
    const code = url.searchParams.get("code");
    if (!c || !code || !c.tokenUrl) return back("error=missing");
    const r = await safeFetch(c.tokenUrl, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: `${APP_URL}/api/connectors/oauth/callback`, client_id: c.clientId ?? "", client_secret: decrypt(c.clientSecret) ?? "" }),
    });
    const j = r.data as Record<string, any>;
    if (!r.ok || !j?.access_token) return back(`error=${encodeURIComponent(j?.error_description ?? j?.error ?? "Sign-in failed")}`);
    await db.customConnector.update({ where: { id: c.id }, data: { accessToken: encrypt(j.access_token), refreshToken: j.refresh_token ? encrypt(j.refresh_token) : null, expiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : null, status: "ACTIVE", lastError: null } });
    return back(`connected=${c.id}`);
  } catch {
    return back("error=state");
  }
}
