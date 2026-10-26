import Stripe from "stripe";
import { db } from "./db";
import { postPayment } from "./accounting";
import { emit } from "./webhooks";
import { decrypt } from "./crypto";
import { HttpError } from "./http";
import { APP_URL } from "./env";

export async function recordPayment(invoiceId: string, amount: number, method: string, reference?: string) {
  const inv = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  if (reference) {
    const dup = await db.payment.findFirst({ where: { invoiceId, reference } });
    if (dup) return { payment: dup, duplicate: true };
  }
  const p = await db.payment.create({ data: { orgId: inv.orgId, invoiceId, amount, method, reference } });
  const paid = Number(inv.amountPaid) + amount;
  const status = paid >= Number(inv.total) - 0.005 ? "PAID" : "PARTIAL";
  await db.invoice.update({ where: { id: inv.id }, data: { amountPaid: paid, status } });
  if (inv.contactId) await db.contact.update({ where: { id: inv.contactId }, data: { type: "CUSTOMER", lifetimeValue: { increment: amount } } });
  await postPayment(p);
  await emit(inv.orgId, "payment.received", { id: p.id, invoiceId, amount, method });
  if (status === "PAID") await emit(inv.orgId, "invoice.paid", { id: inv.id, number: inv.number });
  return { payment: p, status };
}

/** Customers pay invoices through the business's own connected Stripe account. */
export async function invoiceCheckout(token: string) {
  const inv = await db.invoice.findUnique({ where: { publicToken: token }, include: { org: true } });
  if (!inv) throw new HttpError(404, "Invoice not found");
  const integ = await db.integration.findUnique({ where: { orgId_provider: { orgId: inv.orgId, provider: "stripe" } } });
  const key = decrypt((integ?.config as any)?.secretKey ?? null);
  if (!key) throw new HttpError(400, `${inv.org.name} hasn't turned on online card payments yet.`);
  const balance = Number(inv.total) - Number(inv.amountPaid);
  if (inv.status === "VOID" || inv.status === "DRAFT") throw new HttpError(400, "This invoice can't be paid online.");
  if (balance <= 0) throw new HttpError(400, "This invoice is already paid. Thank you!");
  const s = new Stripe(key);
  const session = await s.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency: inv.currency.toLowerCase(), unit_amount: Math.round(balance * 100), product_data: { name: `Invoice ${inv.number} — ${inv.org.name}` } } }],
    metadata: { oenodInvoice: inv.id },
    success_url: `${APP_URL}/pay/${token}?paid=1&session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/pay/${token}`,
  });
  return session.url!;
}

export async function confirmInvoiceCheckout(token: string, sessionId: string) {
  const inv = await db.invoice.findUnique({ where: { publicToken: token } });
  if (!inv) return;
  const integ = await db.integration.findUnique({ where: { orgId_provider: { orgId: inv.orgId, provider: "stripe" } } });
  const key = decrypt((integ?.config as any)?.secretKey ?? null);
  if (!key) return;
  const session = await new Stripe(key).checkout.sessions.retrieve(sessionId);
  if (session.payment_status === "paid" && session.metadata?.oenodInvoice === inv.id) {
    await recordPayment(inv.id, (session.amount_total ?? 0) / 100, "CARD", session.id);
  }
}
