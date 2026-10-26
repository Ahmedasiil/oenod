import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { db } from "@/lib/db";
import { HttpError, requireOrg, route } from "@/lib/http";
import { APP_URL } from "@/lib/env";

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me");

// Start OAuth sign-in for a custom connector using the customer's own app.
export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("integrations", "edit");
  const c = await db.customConnector.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!c || c.authType !== "oauth2" || !c.authorizeUrl || !c.clientId) throw new HttpError(422, "Set the authorize URL, token URL and client ID first.");
  const state = await new SignJWT({ cid: c.id, orgId: ctx.org.id }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(key());
  const u = new URL(c.authorizeUrl);
  u.searchParams.set("client_id", c.clientId);
  u.searchParams.set("redirect_uri", `${APP_URL}/api/connectors/oauth/callback`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  if (c.scopes.length) u.searchParams.set("scope", c.scopes.join(" "));
  return NextResponse.redirect(u.toString());
});
