import type { Monitor } from "@prisma/client";
import { safeFetch } from "./integrations/safeurl";
import { db } from "./db";
import { emit } from "./webhooks";
import { emailLayout, sendEmail, sendSms } from "./messaging";
import { APP_URL } from "./env";

type Status = "OK" | "WARN" | "CRIT" | "ERROR";
interface CheckResult { status: Status; value: number | null; message: string; link?: string }

export const MONITOR_CATALOG: { kind: string; name: string; description: string; defaultThreshold?: number }[] = [
  { kind: "LOW_STOCK", name: "Low stock", description: "Products at or below their reorder point.", defaultThreshold: 1 },
  { kind: "OVERDUE_INVOICES", name: "Overdue invoices", description: "Invoices past their due date and not paid.", defaultThreshold: 1 },
  { kind: "UNCOVERED_SHIFTS", name: "Uncovered shifts", description: "Open shifts in the next 48 hours with nobody assigned.", defaultThreshold: 1 },
  { kind: "LATE_WORK_ORDERS", name: "Late work orders", description: "Jobs scheduled in the past that aren't completed.", defaultThreshold: 1 },
  { kind: "EXPIRING_CERTS", name: "Expiring certifications", description: "Employee certifications expiring within the threshold days.", defaultThreshold: 30 },
  { kind: "EXPIRING_DOCUMENTS", name: "Expiring documents", description: "Contracts, permits and insurance expiring within the threshold days.", defaultThreshold: 30 },
  { kind: "UPTIME", name: "Website uptime", description: "Checks a URL responds (set the URL in settings).", defaultThreshold: 3000 },
  { kind: "SALES_DROP", name: "Sales drop", description: "Today's sales below the threshold % of the same weekday average.", defaultThreshold: 60 },
  { kind: "REVIEW_RATING", name: "Bad reviews", description: "New reviews at or below the threshold rating in the last 24 hours.", defaultThreshold: 2 },
  { kind: "INTEGRATION_HEALTH", name: "Integration errors", description: "Connected apps reporting an error.", defaultThreshold: 1 },
  { kind: "OPEN_TICKETS", name: "Support backlog", description: "Open tickets past their response target.", defaultThreshold: 1 },
  { kind: "OVERTIME", name: "Overtime exposure", description: "Employees over the threshold hours this week.", defaultThreshold: 40 },
  { kind: "FLEET_SPEEDING", name: "Speeding events", description: "Speeding events in the last hour.", defaultThreshold: 1 },
  { kind: "VEHICLES_OFFLINE", name: "Vehicles offline", description: "Vehicles that stopped reporting GPS.", defaultThreshold: 1 },
  { kind: "PENDING_APPROVALS", name: "Pending approvals", description: "AI actions, leave and bills waiting for approval.", defaultThreshold: 5 },
  { kind: "CASH_DUE", name: "Bills due soon", description: "Supplier bills due in the next 7 days above the threshold amount.", defaultThreshold: 1 },
];

const count = (n: number, threshold: number | null, sev: Status, msg: string, link?: string): CheckResult =>
  ({ status: n >= (threshold ?? 1) ? sev : "OK", value: n, message: msg, link });

export async function runCheck(m: Monitor): Promise<CheckResult> {
  const orgId = m.orgId;
  const sev = (m.severity === "CRIT" ? "CRIT" : "WARN") as Status;
  const now = new Date();
  const t = m.threshold;
  switch (m.kind) {
    case "LOW_STOCK": {
      const rows = await db.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n FROM "Product" p
        LEFT JOIN (SELECT "productId", SUM(quantity) q FROM "StockLevel" GROUP BY "productId") s ON s."productId" = p.id
        WHERE p."orgId" = ${orgId} AND p."trackStock" = true AND p.active = true AND COALESCE(s.q, 0) <= p."reorderPoint" AND p."reorderPoint" > 0`;
      const n = Number(rows[0]?.n ?? 0);
      return count(n, t, sev, `${n} product(s) at or below reorder point`, "/app/inventory");
    }
    case "OVERDUE_INVOICES": {
      const n = await db.invoice.count({ where: { orgId, status: { in: ["SENT", "PARTIAL", "OVERDUE"] }, dueDate: { lt: now } } });
      return count(n, t, sev, `${n} invoice(s) overdue`, "/app/sales");
    }
    case "UNCOVERED_SHIFTS": {
      const n = await db.shift.count({ where: { orgId, employeeId: null, start: { gte: now, lte: new Date(now.getTime() + 48 * 36e5) } } });
      return count(n, t, sev, `${n} shift(s) in the next 48h have nobody assigned`, "/app/scheduling");
    }
    case "LATE_WORK_ORDERS": {
      const n = await db.workOrder.count({ where: { orgId, status: { in: ["NEW", "SCHEDULED", "IN_PROGRESS"] }, scheduledAt: { lt: new Date(now.getTime() - 2 * 36e5) } } });
      return count(n, t, sev, `${n} work order(s) running late`, "/app/field-service");
    }
    case "EXPIRING_CERTS": {
      const n = await db.certification.count({ where: { employee: { orgId }, expiresAt: { lte: new Date(now.getTime() + (t ?? 30) * 864e5) } } });
      return count(n, 1, sev, `${n} certification(s) expire within ${t ?? 30} days`, "/app/people");
    }
    case "EXPIRING_DOCUMENTS": {
      const n = await db.document.count({ where: { orgId, expiresAt: { lte: new Date(now.getTime() + (t ?? 30) * 864e5) } } });
      return count(n, 1, sev, `${n} document(s) expire within ${t ?? 30} days`, "/app/documents");
    }
    case "UPTIME": {
      const url = (m.config as { url?: string } | null)?.url;
      if (!url) return { status: "ERROR", value: null, message: "Add the URL to check in this monitor's settings" };
      const start = Date.now();
      try {
        const r = await safeFetch(url, { method: "GET" }, 10000);
        const ms = Date.now() - start;
        if (!r.ok) return { status: "CRIT", value: ms, message: `${url} returned ${r.status}` };
        return { status: ms > (t ?? 3000) ? "WARN" : "OK", value: ms, message: `${url} responded in ${ms} ms` };
      } catch {
        return { status: "CRIT", value: null, message: `${url} is not responding` };
      }
    }
    case "SALES_DROP": {
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
      const today = await db.order.aggregate({ where: { orgId, status: "PAID", createdAt: { gte: dayStart } }, _sum: { total: true } });
      let total = 0;
      for (let w = 1; w <= 4; w++) {
        const s = new Date(dayStart.getTime() - w * 7 * 864e5), e = new Date(now.getTime() - w * 7 * 864e5);
        const a = await db.order.aggregate({ where: { orgId, status: "PAID", createdAt: { gte: s, lte: e } }, _sum: { total: true } });
        total += Number(a._sum.total ?? 0);
      }
      const avg = total / 4;
      if (!avg) return { status: "OK", value: null, message: "Not enough sales history yet" };
      const pct = (Number(today._sum.total ?? 0) / avg) * 100;
      return { status: pct < (t ?? 60) ? sev : "OK", value: Math.round(pct), message: `Sales so far are ${Math.round(pct)}% of the usual for this time`, link: "/app/reports" };
    }
    case "REVIEW_RATING": {
      const n = await db.review.count({ where: { orgId, rating: { lte: t ?? 2 }, postedAt: { gte: new Date(now.getTime() - 864e5) } } });
      return count(n, 1, sev, `${n} review(s) rated ${t ?? 2} stars or lower today`, "/app/reviews");
    }
    case "INTEGRATION_HEALTH": {
      const n = await db.integration.count({ where: { orgId, status: "ERROR" } });
      return count(n, t, sev, `${n} integration(s) need attention`, "/app/integrations");
    }
    case "OPEN_TICKETS": {
      const n = await db.ticket.count({ where: { orgId, status: { in: ["OPEN", "PENDING"] }, slaDueAt: { lt: now } } });
      return count(n, t, sev, `${n} ticket(s) past their response target`, "/app/support");
    }
    case "OVERTIME": {
      const ws = new Date(now); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7)); ws.setHours(0, 0, 0, 0);
      const entries = await db.timeEntry.findMany({ where: { orgId, clockIn: { gte: ws } } });
      const per = new Map<string, number>();
      for (const e of entries) per.set(e.employeeId, (per.get(e.employeeId) ?? 0) + ((e.clockOut ?? now).getTime() - e.clockIn.getTime()) / 36e5);
      const n = [...per.values()].filter((h) => h > (t ?? 40)).length;
      return count(n, 1, sev, `${n} employee(s) over ${t ?? 40}h this week`, "/app/time");
    }
    case "FLEET_SPEEDING": {
      const n = await db.fleetEvent.count({ where: { orgId, kind: "SPEEDING", at: { gte: new Date(now.getTime() - 36e5) } } });
      return count(n, t, sev, `${n} speeding event(s) in the last hour`, "/app/fleet");
    }
    case "VEHICLES_OFFLINE": {
      const n = await db.vehicle.count({ where: { orgId, status: "OFFLINE", lastSeenAt: { not: null } } });
      return count(n, t, sev, `${n} vehicle(s) not reporting GPS`, "/app/fleet");
    }
    case "PENDING_APPROVALS": {
      const [a, l, b] = await Promise.all([
        db.aiAction.count({ where: { orgId, status: "NEEDS_APPROVAL" } }),
        db.leaveRequest.count({ where: { orgId, status: "PENDING" } }),
        db.bill.count({ where: { orgId, status: "AWAITING_APPROVAL" } }),
      ]);
      return count(a + l + b, t ?? 5, sev, `${a + l + b} item(s) waiting for approval`, "/app/ai");
    }
    case "CASH_DUE": {
      const s = await db.bill.aggregate({ where: { orgId, status: { in: ["AWAITING_APPROVAL", "APPROVED"] }, dueDate: { lte: new Date(now.getTime() + 7 * 864e5) } }, _sum: { amount: true } });
      const v = Number(s._sum.amount ?? 0);
      return { status: v >= (t ?? 1) ? sev : "OK", value: v, message: `$${v.toFixed(2)} in bills due within 7 days`, link: "/app/accounting" };
    }
    default:
      return { status: "ERROR", value: null, message: `Unknown monitor type ${m.kind}` };
  }
}

export async function raiseAlert(orgId: string, a: { title: string; message: string; severity: string; link?: string; monitorId?: string; dedupeKey?: string; channels?: string[]; recipients?: string[] }) {
  if (a.monitorId) {
    const open = await db.alert.findFirst({ where: { monitorId: a.monitorId, status: { in: ["OPEN", "ACKNOWLEDGED"] } } });
    if (open) return open;
  }
  const alert = await db.alert.create({ data: { orgId, monitorId: a.monitorId, title: a.title, message: a.message, severity: a.severity, link: a.link } });
  await db.notification.create({ data: { orgId, title: a.title, body: a.message, link: a.link, level: a.severity === "CRIT" ? "critical" : a.severity === "WARN" ? "warning" : "info" } });
  await emit(orgId, "alert.opened", alert);

  const channels = a.channels ?? ["IN_APP", "EMAIL"];
  let recipients = a.recipients ?? [];
  if (!recipients.length) {
    const owners = await db.membership.findMany({ where: { orgId, role: { in: ["OWNER", "ADMIN", "MANAGER"] } }, include: { user: true } });
    recipients = owners.flatMap((o) => [o.user.email, o.user.phone].filter(Boolean) as string[]);
  }
  const url = a.link ? `${APP_URL}${a.link}` : `${APP_URL}/app/monitors`;
  for (const r of recipients) {
    if (r.includes("@") && channels.includes("EMAIL")) {
      await sendEmail({ to: r, subject: `Alert: ${a.title}`, scope: "ORG", orgId, idempotencyKey: `alert:${alert.id}:${r}`, html: emailLayout({ title: a.title, body: a.message, ctaLabel: "Open OENOD", ctaUrl: url }) });
    } else if (/^\+?\d{7,}$/.test(r.replace(/[\s-]/g, "")) && channels.includes("SMS")) {
      await sendSms({ to: r, body: `OENOD alert: ${a.title}. ${a.message} ${url}`, scope: "ORG", orgId, idempotencyKey: `alert:${alert.id}:${r}` });
    }
  }
  return alert;
}

export async function runMonitor(m: Monitor) {
  let r: CheckResult;
  try {
    r = await runCheck(m);
  } catch (e) {
    r = { status: "ERROR", value: null, message: e instanceof Error ? e.message : "Check failed" };
  }
  await db.monitorCheck.create({ data: { monitorId: m.id, status: r.status, value: r.value, message: r.message } });
  await db.monitor.update({ where: { id: m.id }, data: { lastCheckedAt: new Date(), lastStatus: r.status, lastValue: r.value } });
  if (r.status === "WARN" || r.status === "CRIT") {
    await raiseAlert(m.orgId, { title: m.name, message: r.message, severity: r.status, link: r.link, monitorId: m.id, channels: m.channels, recipients: m.recipients });
  } else if (r.status === "OK") {
    const open = await db.alert.findMany({ where: { monitorId: m.id, status: { in: ["OPEN", "ACKNOWLEDGED"] } } });
    for (const a of open) {
      await db.alert.update({ where: { id: a.id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
      await emit(m.orgId, "alert.resolved", a);
    }
  }
  return r;
}

/** Run every monitor that is due. Called by /api/cron/tick. */
export async function runDueMonitors() {
  const monitors = await db.monitor.findMany({ where: { enabled: true, org: { aiPaused: false } } });
  const due = monitors.filter((m) => !m.lastCheckedAt || Date.now() - m.lastCheckedAt.getTime() >= m.intervalMin * 60000);
  for (const m of due) await runMonitor(m);
  return due.length;
}

export const DEFAULT_MONITORS = ["LOW_STOCK", "OVERDUE_INVOICES", "UNCOVERED_SHIFTS", "EXPIRING_CERTS", "REVIEW_RATING", "INTEGRATION_HEALTH", "PENDING_APPROVALS", "FLEET_SPEEDING"];
