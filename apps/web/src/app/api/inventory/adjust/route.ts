import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { audit } from "@/lib/audit";

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("inventory", "edit");
  const d = await body(req, z.object({ productId: z.string(), locationId: z.string(), quantity: z.number(), mode: z.enum(["set", "add"]).default("add"), reason: z.enum(["ADJUSTMENT", "RECEIPT", "WASTE", "RETURN", "TRANSFER"]).default("ADJUSTMENT") }));
  const [p, l] = await Promise.all([db.product.findFirst({ where: { id: d.productId, orgId: ctx.org.id } }), db.location.findFirst({ where: { id: d.locationId, orgId: ctx.org.id } })]);
  if (!p || !l) throw new HttpError(404, "Product or location not found");
  const cur = await db.stockLevel.findUnique({ where: { productId_locationId: { productId: p.id, locationId: l.id } } });
  const delta = d.mode === "set" ? d.quantity - Number(cur?.quantity ?? 0) : d.reason === "WASTE" ? -Math.abs(d.quantity) : d.quantity;
  const s = await db.stockLevel.upsert({ where: { productId_locationId: { productId: p.id, locationId: l.id } }, create: { productId: p.id, locationId: l.id, quantity: delta }, update: { quantity: { increment: delta } } });
  await db.stockMovement.create({ data: { productId: p.id, locationId: l.id, quantity: delta, reason: d.reason } });
  await audit(ctx, "inventory.adjust", "product", p.id, { delta, reason: d.reason });
  return ok({ quantity: Number(s.quantity) });
});

export const GET = route(async () => {
  const ctx = await requireOrg("inventory");
  const [products, locations] = await Promise.all([
    db.product.findMany({ where: { orgId: ctx.org.id, trackStock: true }, include: { stock: true, supplier: true }, orderBy: { name: "asc" } }),
    db.location.findMany({ where: { orgId: ctx.org.id } }),
  ]);
  return ok({
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
    products: products.map((p) => {
      const onHand = p.stock.reduce((s, x) => s + Number(x.quantity), 0);
      return { id: p.id, name: p.name, sku: p.sku, category: p.category, cost: Number(p.cost), price: Number(p.price), reorderPoint: p.reorderPoint, reorderQty: p.reorderQty, supplier: p.supplier?.name, onHand, value: onHand * Number(p.cost), low: p.reorderPoint > 0 && onHand <= p.reorderPoint, byLocation: Object.fromEntries(p.stock.map((s) => [s.locationId, Number(s.quantity)])) };
    }),
  });
});
