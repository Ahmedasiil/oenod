import { loadPlatformSettings } from "@/lib/platform-plugins";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { applySubscription, stripe } from "@/lib/billing";
import { fulfillAcademy } from "@/lib/academy";

export async function POST(req: Request) {
  await loadPlatformSettings();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return new Response("Not configured", { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object as Stripe.Subscription);
      break;
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status === "paid" && s.metadata?.kind === "ad_topup" && s.metadata.orgId) {
        const cents = Number(s.metadata.amountCents);
        const added = await db.adLedger.create({ data: { orgId: s.metadata.orgId, kind: "TOPUP", amountCents: cents, reference: s.id, note: "Card top-up" } }).then(() => true, () => false);
        if (added) {
          await db.organization.update({ where: { id: s.metadata.orgId }, data: { adBalanceCents: { increment: cents } } });
          await db.adCampaign.updateMany({ where: { orgId: s.metadata.orgId, status: "OUT_OF_FUNDS" }, data: { status: "ACTIVE" } });
        }
      }
      if (s.payment_status === "paid" && s.metadata?.kind === "academy" && s.metadata.purchaseId) await fulfillAcademy(s.metadata.purchaseId);
      if (s.subscription && s.metadata?.orgId) {
        const sub = await stripe().subscriptions.retrieve(String(s.subscription));
        await applySubscription(sub);
      }
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      if (inv.customer) await db.organization.updateMany({ where: { stripeCustomerId: String(inv.customer) }, data: { subscriptionStatus: "PAST_DUE" } });
      break;
    }
  }
  return Response.json({ received: true });
}
