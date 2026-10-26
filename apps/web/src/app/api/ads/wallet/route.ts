import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { stripe } from "@/lib/billing";
import { APP_URL } from "@/lib/env";

export const GET = route(async () => {
  const ctx = await requireOrg("marketing");
  const ledger = await db.adLedger.findMany({ where: { orgId: ctx.org.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return ok({ balanceCents: ctx.org.adBalanceCents, currency: ctx.org.currency, ledger });
});

// Top up the ad wallet with a card (Stripe Checkout). Credit is added when Stripe confirms payment.
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("marketing", "edit");
  if (!["OWNER", "ADMIN", "MANAGER", "FINANCE"].includes(ctx.role)) throw new HttpError(403, "Only owners, managers or finance can add ad funds.");
  const { amountCents } = await body(req, z.object({ amountCents: z.number().int().min(2000).max(5_000_000) }));
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: ctx.org.stripeCustomerId ?? undefined,
    customer_email: ctx.org.stripeCustomerId ? undefined : ctx.user?.email,
    line_items: [{ quantity: 1, price_data: { currency: ctx.org.currency.toLowerCase(), unit_amount: amountCents, product_data: { name: "OENOD Ads credit" } } }],
    metadata: { kind: "ad_topup", orgId: ctx.org.id, amountCents: String(amountCents) },
    automatic_tax: { enabled: false },
    success_url: `${APP_URL}/app/ads?funded=1`,
    cancel_url: `${APP_URL}/app/ads`,
  });
  return ok({ url: session.url });
});
