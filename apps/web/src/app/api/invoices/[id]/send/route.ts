import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { emailLayout, sendEmail } from "@/lib/messaging";
import { APP_URL } from "@/lib/env";
import { money } from "@/lib/format";
import { postInvoice } from "@/lib/accounting";
import { emit } from "@/lib/webhooks";

export const POST = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("sales", "edit");
  const inv = await db.invoice.findFirst({ where: { id: (await params).id, orgId: ctx.org.id }, include: { contact: true } });
  if (!inv) throw new HttpError(404, "Invoice not found");
  if (!inv.contact?.email) throw new HttpError(422, "Add an email address to this customer first.");
  const r = await sendEmail({
    to: inv.contact.email, scope: "ORG", orgId: ctx.org.id, idempotencyKey: `invoice-send:${inv.id}:${Date.now()}`,
    subject: `Invoice ${inv.number} from ${ctx.org.name}`,
    html: emailLayout({ brand: ctx.org.name, title: `Invoice ${inv.number}`, body: `Hi ${inv.contact.firstName},\n\nHere is your invoice for ${money(inv.total, inv.currency)}, due ${inv.dueDate.toLocaleDateString("en-CA")}.\n\nThank you for your business.`, ctaLabel: "View and pay online", ctaUrl: `${APP_URL}/pay/${inv.publicToken}` }),
  });
  if (!r.ok) throw new HttpError(502, `Email failed: ${r.error}`);
  const updated = await db.invoice.update({ where: { id: inv.id }, data: { status: inv.status === "DRAFT" ? "SENT" : inv.status } });
  await postInvoice(updated);
  await emit(ctx.org.id, "invoice.updated", { id: inv.id, status: updated.status });
  return ok({ ok: true });
});
