import { z } from "zod";
import { db } from "@/lib/db";
import { body, clientIp, HttpError, ok, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { emit } from "@/lib/webhooks";
import { notify } from "@/lib/audit";
import { nextNumber } from "@/lib/resources";

// Customer accepts or declines a quote; accepting creates the invoice automatically (quote-to-cash).
export const POST = route(async (req: Request, { params }: { params: Promise<{ token: string }> }) => {
  if (!limit(`quote:${clientIp(req)}`, 20, 3600_000)) throw new HttpError(429, "Too many attempts. Try again later.");
  const { decision, name } = await body(req, z.object({ decision: z.enum(["accept", "decline"]), name: z.string().min(2).max(100) }));
  const q = await db.quote.findUnique({ where: { publicToken: (await params).token } });
  if (!q) throw new HttpError(404, "Quote not found");
  if (q.status !== "SENT") throw new HttpError(409, q.status === "DRAFT" ? "This quote hasn't been sent yet." : `This quote is already ${q.status.toLowerCase()}.`);
  if (q.validUntil && q.validUntil < new Date()) throw new HttpError(409, "This quote has expired. Ask for an updated one.");
  // Only one decision counts, even if the button is pressed twice.
  const claimed = await db.quote.updateMany({ where: { id: q.id, status: "SENT" }, data: decision === "decline" ? { status: "DECLINED" } : { status: "ACCEPTED", acceptedAt: new Date() } });
  if (!claimed.count) throw new HttpError(409, "This quote was already answered.");
  if (decision === "decline") {
    await notify(q.orgId, `Quote ${q.number} declined`, { body: `Declined by ${name}`, link: "/app/sales", level: "warning" });
    return ok({ status: "DECLINED" });
  }
  const org = await db.organization.findUnique({ where: { id: q.orgId }, select: { currency: true } });
  const inv = await db.invoice.create({ data: { orgId: q.orgId, contactId: q.contactId, number: await nextNumber(q.orgId, "invoice", "INV"), currency: org?.currency ?? "CAD", status: "SENT", dueDate: new Date(Date.now() + 14 * 864e5), items: q.items as object, subtotal: q.subtotal, tax: q.tax, total: q.total, notes: `From quote ${q.number}, accepted by ${name}` } });
  await emit(q.orgId, "quote.accepted", { id: q.id, number: q.number, invoiceId: inv.id });
  await notify(q.orgId, `Quote ${q.number} accepted 🎉`, { body: `Accepted by ${name}. Invoice ${inv.number} was created.`, link: "/app/sales", level: "success" });
  return ok({ status: "ACCEPTED", invoiceToken: inv.publicToken });
});
