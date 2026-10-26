import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { postOrder } from "@/lib/accounting";
import { emit } from "@/lib/webhooks";
import { serialize } from "@/lib/resources";

const Schema = z.object({
  locationId: z.string().optional(),
  contactId: z.string().optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().positive().max(10000), modifiers: z.any().optional() })).min(1),
  couponCode: z.string().optional(),
  tip: z.number().min(0).default(0),
  paymentMethod: z.enum(["CARD", "CASH", "GIFT_CARD", "OTHER"]).default("CARD"),
  channel: z.enum(["POS", "ONLINE", "PHONE", "DELIVERY"]).default("POS"),
  idempotencyKey: z.string().max(100).optional(),
});

const round = (n: number) => Math.round(n * 100) / 100;

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("pos", "edit");
  const d = await body(req, Schema);
  const orgId = ctx.org.id;
  if (d.idempotencyKey) {
    const dup = await db.order.findUnique({ where: { idempotencyKey: d.idempotencyKey } });
    if (dup) return ok({ data: serialize(dup), duplicate: true });
  }
  const products = await db.product.findMany({ where: { orgId, id: { in: d.items.map((i) => i.productId) } } });
  if (products.length !== new Set(d.items.map((i) => i.productId)).size) throw new HttpError(422, "Some items are no longer available.");
  const tax = await db.taxRate.findFirst({ where: { orgId }, orderBy: { rate: "desc" } });
  const rate = tax ? Number(tax.rate) : 0;
  const lines = d.items.map((i) => ({ ...i, p: products.find((p) => p.id === i.productId)! }));
  const subtotal = round(lines.reduce((s, l) => s + Number(l.p.price) * l.quantity, 0));
  let discount = 0;
  let coupon = null;
  if (d.couponCode) {
    coupon = await db.coupon.findFirst({ where: { orgId, code: d.couponCode.toUpperCase(), active: true } });
    if (!coupon || (coupon.expiresAt && coupon.expiresAt < new Date()) || (coupon.maxUses && coupon.uses >= coupon.maxUses)) throw new HttpError(422, "That coupon isn't valid.");
    discount = round(coupon.kind === "PERCENT" ? subtotal * (Number(coupon.value) / 100) : Math.min(subtotal, Number(coupon.value)));
  }
  const taxable = lines.filter((l) => l.p.taxable).reduce((s, l) => s + Number(l.p.price) * l.quantity, 0);
  const taxAmt = round(Math.max(0, taxable - (subtotal ? discount * (taxable / subtotal) : 0)) * rate);
  const total = round(subtotal - discount + taxAmt + d.tip);
  const locationId = d.locationId ?? (await db.location.findFirst({ where: { orgId } }))?.id;
  const employee = ctx.membership ? await db.employee.findFirst({ where: { orgId, membershipId: ctx.membership.id } }) : null;
  const count = await db.order.count({ where: { orgId } });

  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        orgId, locationId, contactId: d.contactId, employeeId: employee?.id, number: `S-${String(count + 10001)}`, channel: d.channel, status: "PAID",
        subtotal, discount, tax: taxAmt, tip: d.tip, total, paymentMethod: d.paymentMethod, idempotencyKey: d.idempotencyKey,
        items: { create: lines.map((l) => ({ productId: l.p.id, name: l.p.name, quantity: l.quantity, price: l.p.price, modifiers: l.modifiers })) },
      },
      include: { items: true },
    });
    for (const l of lines) {
      if (!l.p.trackStock || !locationId) continue;
      await tx.stockLevel.upsert({ where: { productId_locationId: { productId: l.p.id, locationId } }, create: { productId: l.p.id, locationId, quantity: -l.quantity }, update: { quantity: { decrement: l.quantity } } });
      await tx.stockMovement.create({ data: { productId: l.p.id, locationId, quantity: -l.quantity, reason: "SALE", refId: o.id } });
    }
    if (coupon) await tx.coupon.update({ where: { id: coupon.id }, data: { uses: { increment: 1 } } });
    if (d.contactId) await tx.contact.update({ where: { id: d.contactId }, data: { type: "CUSTOMER", loyaltyPoints: { increment: Math.floor(total) }, lifetimeValue: { increment: total } } });
    return o;
  });
  await postOrder(order).catch(console.error);
  await emit(orgId, "order.created", serialize(order));
  for (const l of lines) {
    if (!l.p.trackStock || !l.p.reorderPoint) continue;
    const s = await db.stockLevel.aggregate({ where: { productId: l.p.id }, _sum: { quantity: true } });
    if (Number(s._sum.quantity ?? 0) <= l.p.reorderPoint) await emit(orgId, "product.low_stock", { productId: l.p.id, name: l.p.name, onHand: Number(s._sum.quantity ?? 0) });
  }
  return ok({ data: serialize(order) }, 201);
});
