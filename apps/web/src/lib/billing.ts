import Stripe from "stripe";
import { db } from "./db";
import { APP_URL } from "./env";
import { HttpError } from "./http";

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpError(503, "Payments aren't set up yet. Add STRIPE_SECRET_KEY in your hosting settings.");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export const DEFAULT_PLANS = [
  { key: "STARTER", name: "Starter", tagline: "For a single location getting organized", priceMonthly: 4900, priceYearly: 47000, seats: 5, aiCredits: 500, sortOrder: 1,
    modules: ["overview", "ai", "people", "time", "scheduling", "leave", "crm", "sales", "pos", "inventory", "reviews", "chat", "academy", "monitors", "integrations", "settings", "live"],
    features: ["Up to 5 team members", "Scheduling and time clock", "CRM, quotes and invoices", "Point of sale", "Google Business reviews", "AI assistant (500 actions/mo)", "Jobs marketplace posting"] },
  { key: "GROWTH", name: "Growth", tagline: "Most popular for growing teams", priceMonthly: 14900, priceYearly: 143000, seats: 25, aiCredits: 3000, sortOrder: 2,
    modules: ["overview", "ai", "live", "people", "recruiting", "time", "scheduling", "leave", "payroll", "crm", "sales", "support", "bookings", "accounting", "expenses", "pos", "inventory", "purchasing", "projects", "fieldservice", "fleet", "marketing", "reviews", "loyalty", "academy", "chat", "reports", "monitors", "integrations", "developers", "settings"],
    features: ["Up to 25 team members", "Everything in Starter", "Payroll and accounting", "Marketing campaigns and loyalty", "Field service and fleet GPS (10 vehicles)", "Full API and webhooks", "AI Business Manager (3,000 actions/mo)"] },
  { key: "SCALE", name: "Scale", tagline: "Multi-location operations", priceMonthly: 39900, priceYearly: 383000, seats: 100, aiCredits: 15000, sortOrder: 3,
    modules: ["*"],
    features: ["Up to 100 team members", "Everything in Growth", "Unlimited locations and vehicles", "Assets, safety and compliance", "Advanced automations", "Priority support", "AI Business Manager (15,000 actions/mo)"] },
  { key: "ENTERPRISE", name: "Enterprise", tagline: "Franchises and large groups", priceMonthly: 0, priceYearly: 0, seats: 100000, aiCredits: 100000, sortOrder: 4,
    modules: ["*"],
    features: ["Unlimited team members", "Dedicated success manager", "Custom integrations", "SSO and advanced security", "Data migration", "Custom contract and SLA"] },
];

export async function checkoutUrl(orgId: string, planKey: string, interval: "month" | "year", email: string) {
  const s = stripe();
  const [org, plan] = await Promise.all([db.organization.findUniqueOrThrow({ where: { id: orgId } }), db.plan.findUniqueOrThrow({ where: { key: planKey } })]);
  if (!plan.priceMonthly) throw new HttpError(400, "Enterprise is set up with our team. Contact sales.");
  let customer = org.stripeCustomerId;
  if (!customer) {
    customer = (await s.customers.create({ email, name: org.name, metadata: { orgId } })).id;
    await db.organization.update({ where: { id: orgId }, data: { stripeCustomerId: customer } });
  }
  const priceId = interval === "year" ? plan.stripePriceYearly : plan.stripePriceMonthly;
  const line = priceId
    ? { price: priceId, quantity: 1 }
    : { quantity: 1, price_data: { currency: org.currency.toLowerCase(), unit_amount: interval === "year" ? plan.priceYearly : plan.priceMonthly, recurring: { interval }, product_data: { name: `OENOD ${plan.name}` } } };
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [line],
    allow_promotion_codes: true,
    subscription_data: { metadata: { orgId, planKey } },
    metadata: { orgId, planKey },
    success_url: `${APP_URL}/app/settings/billing?success=1`,
    cancel_url: `${APP_URL}/app/settings/billing`,
  });
  return session.url!;
}

export async function portalUrl(orgId: string) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: orgId } });
  if (!org.stripeCustomerId) throw new HttpError(400, "No billing account yet. Choose a plan first.");
  const p = await stripe().billingPortal.sessions.create({ customer: org.stripeCustomerId, return_url: `${APP_URL}/app/settings/billing` });
  return p.url;
}

const STATUS: Record<string, "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "PAUSED"> = {
  trialing: "TRIALING", active: "ACTIVE", past_due: "PAST_DUE", unpaid: "PAST_DUE", canceled: "CANCELED", incomplete_expired: "CANCELED", paused: "PAUSED", incomplete: "PAST_DUE",
};

export async function applySubscription(sub: Stripe.Subscription) {
  const orgId = sub.metadata?.orgId;
  if (!orgId) return;
  const interval = sub.items.data[0]?.price.recurring?.interval ?? "month";
  await db.organization.update({
    where: { id: orgId },
    data: { stripeSubscriptionId: sub.id, subscriptionStatus: STATUS[sub.status] ?? "ACTIVE", billingInterval: interval, ...(sub.metadata.planKey ? { planKey: sub.metadata.planKey } : {}) },
  });
}
