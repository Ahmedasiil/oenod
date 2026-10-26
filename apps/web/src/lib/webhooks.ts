import { db } from "./db";
import { safeFetch } from "./integrations/safeurl";
import { hmac } from "./crypto";

export const WEBHOOK_EVENTS = [
  "contact.created", "contact.updated", "deal.created", "deal.updated", "invoice.created", "invoice.paid", "invoice.overdue",
  "quote.accepted", "order.created", "payment.received", "employee.created", "employee.updated", "shift.published",
  "timeentry.clock_in", "timeentry.clock_out", "leave.requested", "leave.decided", "payrun.approved", "job.created",
  "application.created", "application.stage_changed", "ticket.created", "booking.created", "workorder.completed",
  "product.low_stock", "purchaseorder.created", "alert.opened", "alert.resolved", "fleet.speeding", "fleet.long_stop",
  "fleet.geofence", "review.received", "ai.action_completed",
];

/** Queue and deliver an event to every subscribed webhook (signed with HMAC-SHA256). */
export async function emit(orgId: string, event: string, data: unknown) {
  const hooks = await db.webhook.findMany({ where: { orgId, active: true, OR: [{ events: { has: event } }, { events: { has: "*" } }] } });
  await Promise.all(hooks.map(async (h) => {
    const payload = { id: crypto.randomUUID(), event, createdAt: new Date().toISOString(), data };
    const d = await db.webhookDelivery.create({ data: { webhookId: h.id, event, payload: JSON.parse(JSON.stringify(payload)) } });
    await deliver(d.id);
  }));
}

export async function deliver(deliveryId: string) {
  const d = await db.webhookDelivery.findUnique({ where: { id: deliveryId }, include: { webhook: true } });
  if (!d || d.status === "DELIVERED") return;
  const body = JSON.stringify(d.payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  let code: number | null = null;
  try {
    // safeFetch refuses private addresses and redirects into them (SSRF).
    const res = await safeFetch(d.webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Oenod-Event": d.event, "X-Oenod-Timestamp": ts, "X-Oenod-Signature": `sha256=${hmac(d.webhook.secret, `${ts}.${body}`)}`, "X-Oenod-Delivery": d.id },
      body,
    }, 8000);
    code = res.status;
  } catch {
    code = null;
  }
  const delivered = code !== null && code >= 200 && code < 300;
  const attempts = d.attempts + 1;
  await db.webhookDelivery.update({
    where: { id: d.id },
    data: { attempts, responseCode: code, status: delivered ? "DELIVERED" : attempts >= 6 ? "FAILED" : "PENDING", nextAttemptAt: delivered ? null : new Date(Date.now() + 2 ** attempts * 60_000) },
  });
  await db.webhook.update({ where: { id: d.webhookId }, data: { lastStatus: code ?? 0 } });
}

export async function retryDue() {
  const due = await db.webhookDelivery.findMany({ where: { status: "PENDING", nextAttemptAt: { lte: new Date() } }, take: 100 });
  for (const d of due) await deliver(d.id);
  return due.length;
}
