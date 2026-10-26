import { db } from "./db";
import { HttpError } from "./http";
import { stripe } from "./billing";
import { APP_URL } from "./env";
import { emailLayout, sendEmail } from "./messaging";

// OENOD Academy pricing. Course prices live on each course; these are the passes.
export const ACADEMY_PASS = {
  month: { cents: 2900, label: "Academy Pass — monthly", days: 31 },
  year: { cents: 24900, label: "Academy Pass — yearly", days: 366 },
};
export const SEAT_DISCOUNT = [{ min: 50, pct: 30 }, { min: 20, pct: 20 }, { min: 5, pct: 10 }];

export async function hasAccess(userId: string | undefined, courseId: string) {
  const c = await db.course.findUnique({ where: { id: courseId }, select: { priceCents: true, orgId: true } });
  if (!c) return false;
  if (c.priceCents === 0) return true;
  if (!userId) return false;
  const [u, e] = await Promise.all([db.user.findUnique({ where: { id: userId }, select: { academyPassUntil: true } }), db.enrollment.findUnique({ where: { courseId_userId: { courseId, userId } } })]);
  return Boolean(e) || Boolean(u?.academyPassUntil && u.academyPassUntil > new Date() && !c.orgId);
}

/** Stripe Checkout for a course, the Academy Pass, or company seats. */
export async function academyCheckout(opts: { userId: string; email: string; kind: "COURSE" | "PASS_MONTH" | "PASS_YEAR" | "SEATS"; courseId?: string; seats?: number; orgId?: string }) {
  let amount = 0, name = "", currency = "cad";
  if (opts.kind === "COURSE" || opts.kind === "SEATS") {
    const c = await db.course.findUnique({ where: { id: opts.courseId ?? "" } });
    if (!c || !c.published) throw new HttpError(404, "Course not found.");
    if (c.priceCents === 0) throw new HttpError(400, "This course is free. Enroll directly.");
    const seats = opts.kind === "SEATS" ? Math.max(2, opts.seats ?? 2) : 1;
    const pct = opts.kind === "SEATS" ? SEAT_DISCOUNT.find((d) => seats >= d.min)?.pct ?? 0 : 0;
    amount = Math.round(c.priceCents * seats * (1 - pct / 100));
    name = opts.kind === "SEATS" ? `${c.title} — ${seats} seats${pct ? ` (${pct}% off)` : ""}` : c.title;
    currency = c.currency.toLowerCase();
  } else {
    const p = opts.kind === "PASS_YEAR" ? ACADEMY_PASS.year : ACADEMY_PASS.month;
    amount = p.cents; name = p.label;
  }
  const purchase = await db.coursePurchase.create({ data: { kind: opts.kind, userId: opts.userId, orgId: opts.orgId, courseId: opts.courseId, seats: opts.seats ?? 1, amountCents: amount, currency: currency.toUpperCase() } });
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: opts.email,
    line_items: [{ quantity: 1, price_data: { currency, unit_amount: amount, product_data: { name: `OENOD Academy: ${name}` } } }],
    allow_promotion_codes: true,
    metadata: { kind: "academy", purchaseId: purchase.id },
    success_url: `${APP_URL}/academy/purchased?p=${purchase.id}`,
    cancel_url: `${APP_URL}/academy`,
  });
  await db.coursePurchase.update({ where: { id: purchase.id }, data: { stripeSessionId: session.id } });
  return session.url!;
}

/** Called from the Stripe webhook once payment is confirmed. Safe to call twice. */
export async function fulfillAcademy(purchaseId: string) {
  const p = await db.coursePurchase.findUnique({ where: { id: purchaseId } });
  if (!p || p.status === "PAID") return;
  await db.coursePurchase.update({ where: { id: p.id }, data: { status: "PAID", paidAt: new Date() } });
  const user = p.userId ? await db.user.findUnique({ where: { id: p.userId } }) : null;
  if (p.kind === "COURSE" && p.userId && p.courseId) {
    await db.enrollment.upsert({ where: { courseId_userId: { courseId: p.courseId, userId: p.userId } }, create: { courseId: p.courseId, userId: p.userId, completedLessons: [], source: "PURCHASE", paidCents: p.amountCents }, update: { source: "PURCHASE", paidCents: p.amountCents } });
    await db.course.update({ where: { id: p.courseId }, data: { enrollCount: { increment: 1 } } });
  }
  if ((p.kind === "PASS_MONTH" || p.kind === "PASS_YEAR") && user) {
    const days = p.kind === "PASS_YEAR" ? ACADEMY_PASS.year.days : ACADEMY_PASS.month.days;
    const from = user.academyPassUntil && user.academyPassUntil > new Date() ? user.academyPassUntil : new Date();
    await db.user.update({ where: { id: user.id }, data: { academyPassUntil: new Date(from.getTime() + days * 864e5) } });
  }
  if (p.kind === "SEATS" && p.orgId && p.courseId) {
    // Seats become training the company can assign to employees.
    await db.courseSeat.upsert({ where: { orgId_courseId: { orgId: p.orgId, courseId: p.courseId } }, create: { orgId: p.orgId, courseId: p.courseId, seats: p.seats }, update: { seats: { increment: p.seats } } });
  }
  if (user) await sendEmail({ to: user.email, scope: "PLATFORM", idempotencyKey: `academy:${p.id}`, subject: "Your OENOD Academy purchase", html: emailLayout({ title: "You're all set", body: `Thanks for your purchase. ${p.kind.startsWith("PASS") ? "Your Academy Pass is active: every OENOD course is unlocked." : "Your course is ready in My learning."}`, ctaLabel: "Start learning", ctaUrl: `${APP_URL}/academy/my` }) }).catch(() => {});
}
