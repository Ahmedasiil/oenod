import { db } from "@/lib/db";
import { ok, requireOrg, route } from "@/lib/http";

export const GET = route(async () => {
  const ctx = await requireOrg("pos");
  const [products, tax, locations, coupons] = await Promise.all([
    db.product.findMany({ where: { orgId: ctx.org.id, active: true, type: { not: "INGREDIENT" } }, include: { stock: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.taxRate.findFirst({ where: { orgId: ctx.org.id }, orderBy: { rate: "desc" } }),
    db.location.findMany({ where: { orgId: ctx.org.id, active: true } }),
    db.coupon.findMany({ where: { orgId: ctx.org.id, active: true } }),
  ]);
  return ok({
    currency: ctx.org.currency,
    taxRate: tax ? Number(tax.rate) : 0,
    taxName: tax?.name ?? "Tax",
    locations: locations.map((l) => ({ id: l.id, name: l.name })),
    coupons: coupons.map((c) => ({ code: c.code, kind: c.kind, value: Number(c.value) })),
    products: products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: Number(p.price), taxable: p.taxable, color: p.color, sku: p.sku, barcode: p.barcode, onHand: p.trackStock ? p.stock.reduce((s, x) => s + Number(x.quantity), 0) : null })),
  });
});
