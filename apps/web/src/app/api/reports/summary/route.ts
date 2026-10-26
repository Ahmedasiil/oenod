import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { canAccess, type Grants } from "@/lib/rbac";

const day = (d: Date) => d.toISOString().slice(0, 10);

// The owner's dashboard numbers: sales, cash, labour, pipeline, people and operations, with daily trends.
export const GET = route(async (req: Request) => {
  const ctx = await requireOrg("reports");
  const days = Math.min(365, Math.max(7, Number(new URL(req.url).searchParams.get("days") ?? 30)));
  const orgId = ctx.org.id;
  const since = new Date(Date.now() - days * 864e5), prev = new Date(Date.now() - 2 * days * 864e5);
  const g = ctx.membership?.grants as Grants | null;
  const can = (m: string) => canAccess(ctx.role, m, g);
  if (!["OWNER", "ADMIN", "MANAGER", "FINANCE", "ACCOUNTANT"].includes(ctx.role) && !g?.reports) throw new HttpError(403, "Reports are for managers. Ask for access.");

  const [orders, ordersPrev, invPaid, ar, overdue, entries, headcount, newHires, leads, dealsWon, pipeline, tickets, lowStock, projects, reviews] = await Promise.all([
    can("pos") || can("sales") ? db.order.findMany({ where: { orgId, status: "PAID", createdAt: { gte: since } }, select: { total: true, createdAt: true } }) : [],
    can("pos") || can("sales") ? db.order.aggregate({ where: { orgId, status: "PAID", createdAt: { gte: prev, lt: since } }, _sum: { total: true } }) : null,
    can("sales") ? db.invoice.aggregate({ where: { orgId, status: "PAID", payments: { some: { receivedAt: { gte: since } } } }, _sum: { total: true }, _count: true }) : null,
    can("sales") ? db.invoice.aggregate({ where: { orgId, status: { in: ["SENT", "PARTIAL", "OVERDUE"] } }, _sum: { total: true, amountPaid: true } }) : null,
    can("sales") ? db.invoice.count({ where: { orgId, status: { in: ["SENT", "PARTIAL", "OVERDUE"] }, dueDate: { lt: new Date() } } }) : 0,
    can("time") ? db.timeEntry.findMany({ where: { orgId, clockIn: { gte: since }, clockOut: { not: null } }, select: { clockIn: true, clockOut: true, breakMinutes: true, employee: { select: { payRate: true } } } }) : [],
    can("people") ? db.employee.count({ where: { orgId, status: { in: ["ACTIVE", "ONBOARDING", "LEAVE"] } } }) : null,
    can("people") ? db.employee.count({ where: { orgId, createdAt: { gte: since } } }) : null,
    can("crm") ? db.contact.count({ where: { orgId, createdAt: { gte: since } } }) : null,
    can("crm") ? db.deal.aggregate({ where: { orgId, stage: "WON", updatedAt: { gte: since } }, _sum: { value: true }, _count: true }) : null,
    can("crm") ? db.deal.aggregate({ where: { orgId, stage: { notIn: ["WON", "LOST"] } }, _sum: { value: true }, _count: true }) : null,
    can("support") ? db.ticket.groupBy({ by: ["status"], where: { orgId }, _count: true }) : [],
    can("inventory") ? db.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "Product" WHERE "orgId" = ${orgId} AND "trackStock" = true AND "stock" <= "reorderPoint"`.catch(() => [{ n: 0n }]) : [{ n: 0n }],
    can("projects") ? db.project.groupBy({ by: ["health"], where: { orgId, status: { notIn: ["DONE", "CANCELLED"] }, archivedAt: null, isTemplate: false }, _count: true }) : [],
    can("reviews") ? db.review.aggregate({ where: { orgId, postedAt: { gte: since } }, _avg: { rating: true }, _count: true }) : null,
  ]);

  const series: Record<string, { sales: number; hours: number }> = {};
  for (let i = days - 1; i >= 0; i--) series[day(new Date(Date.now() - i * 864e5))] = { sales: 0, hours: 0 };
  let sales = 0;
  for (const o of orders) { const v = Number(o.total); sales += v; const k = day(o.createdAt); if (series[k]) series[k].sales += v; }
  let hours = 0, labour = 0;
  for (const e of entries) {
    const h = Math.max(0, (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600_000 - e.breakMinutes / 60);
    hours += h; labour += h * Number(e.employee?.payRate ?? 0);
    const k = day(e.clockIn); if (series[k]) series[k].hours += h;
  }
  const salesPrev = Number(ordersPrev?._sum.total ?? 0);
  return ok({
    days, currency: ctx.org.currency, asOf: new Date(),
    sales: { total: Math.round(sales * 100) / 100, previous: Math.round(salesPrev * 100) / 100, change: salesPrev ? Math.round(((sales - salesPrev) / salesPrev) * 1000) / 10 : null, invoicesPaid: Number(invPaid?._sum?.total ?? 0) },
    cash: { receivable: Number(ar?._sum.total ?? 0) - Number(ar?._sum.amountPaid ?? 0), overdueInvoices: overdue },
    labour: { hours: Math.round(hours * 10) / 10, cost: Math.round(labour * 100) / 100, percentOfSales: sales ? Math.round((labour / sales) * 1000) / 10 : null },
    people: { headcount, newHires },
    pipeline: { newContacts: leads, won: Number(dealsWon?._sum.value ?? 0), wonCount: dealsWon?._count ?? 0, open: Number(pipeline?._sum.value ?? 0), openCount: pipeline?._count ?? 0 },
    support: Object.fromEntries(tickets.map((t) => [t.status, t._count])),
    inventory: { lowStock: Number(lowStock[0]?.n ?? 0) },
    projects: Object.fromEntries(projects.map((p) => [p.health, p._count])),
    reviews: reviews ? { average: reviews._avg.rating ? Math.round(reviews._avg.rating * 10) / 10 : null, count: reviews._count } : null,
    series: Object.entries(series).map(([date, v]) => ({ date, sales: Math.round(v.sales * 100) / 100, hours: Math.round(v.hours * 10) / 10 })),
  });
});
