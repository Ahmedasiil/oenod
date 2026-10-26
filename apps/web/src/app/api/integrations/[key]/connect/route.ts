import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { connectorByKey } from "@/lib/integrations/catalog";
import { authorizeUrl } from "@/lib/integrations/oauth";
import { encrypt } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { isManager } from "@/lib/rbac";

type P = { params: Promise<{ key: string }> };

// OAuth connectors: redirect to the provider's sign-in.
export const GET = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("integrations");
  const c = connectorByKey((await params).key);
  if (!c || c.auth !== "oauth") throw new HttpError(404, "Unknown connector");
  const shop = new URL(req.url).searchParams.get("shop") ?? undefined;
  return NextResponse.redirect(await authorizeUrl(c, ctx.org.id, shop ? { shop } : {}));
});

// Key connectors: store the customer's credentials encrypted.
export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("integrations", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only managers can connect apps.");
  const c = connectorByKey((await params).key);
  if (!c || (c.auth !== "apikey" && c.auth !== "webhook")) throw new HttpError(404, "Unknown connector");
  const input = (await req.json()) as Record<string, string>;
  const config: Record<string, string> = {};
  for (const f of c.fields ?? []) {
    const v = String(input[f.name] ?? "").trim();
    if (!v) throw new HttpError(422, `${f.label} is required.`);
    config[f.name] = f.secret ? encrypt(v) : v;
  }
  if (c.key === "stripe" && !String(input.secretKey).startsWith("sk_")) throw new HttpError(422, "That doesn't look like a Stripe secret key (sk_...).");
  await db.integration.upsert({
    where: { orgId_provider: { orgId: ctx.org.id, provider: c.key } },
    create: { orgId: ctx.org.id, provider: c.key, status: "CONNECTED", config, accountName: config.shop ?? config.url ?? null },
    update: { status: "CONNECTED", config, lastError: null },
  });
  await audit(ctx, "integration.connected", "integration", c.key);
  return ok({ ok: true });
});
