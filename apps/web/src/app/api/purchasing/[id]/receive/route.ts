import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { post } from "@/lib/accounting";
import { audit } from "@/lib/audit";

// Receiving a PO updates stock and creates the supplier bill.
export const POST = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("purchasing", "edit");
  const po = await db.purchaseOrder.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!po) throw new HttpError(404, "Purchase order not found");
  if (po.status === "RECEIVED") throw new HttpError(409, "Already received");
  const locationId = po.locationId ?? (await db.location.findFirst({ where: { orgId: ctx.org.id } }))?.id;
  const items = po.items as { productId?: string; qty: number; price: number; name: string }[];
  await db.$transaction(async (tx) => {
    for (const i of items) {
      if (!i.productId || !locationId) continue;
      await tx.stockLevel.upsert({ where: { productId_locationId: { productId: i.productId, locationId } }, create: { productId: i.productId, locationId, quantity: i.qty }, update: { quantity: { increment: i.qty } } });
      await tx.stockMovement.create({ data: { productId: i.productId, locationId, quantity: i.qty, reason: "RECEIPT", refId: po.id } });
      await tx.product.update({ where: { id: i.productId }, data: { cost: i.price } });
    }
    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: "RECEIVED", receivedAt: new Date() } });
    const supplier = po.supplierId ? await tx.supplier.findUnique({ where: { id: po.supplierId } }) : null;
    await tx.bill.create({ data: { orgId: ctx.org.id, supplierId: po.supplierId, number: po.number, amount: po.total, dueDate: new Date(Date.now() + 30 * 864e5), status: "AWAITING_APPROVAL", notes: `Received from ${supplier?.name ?? "supplier"}` } });
  });
  await post(ctx.org.id, "PO_RECEIPT", po.id, `Stock received ${po.number}`, [{ code: "1200", debit: Number(po.total) }, { code: "2000", credit: Number(po.total) }]).catch(console.error);
  await audit(ctx, "purchasing.received", "purchaseOrder", po.id);
  return ok({ ok: true });
});
