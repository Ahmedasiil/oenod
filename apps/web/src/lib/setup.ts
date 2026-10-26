import type { User } from "@prisma/client";
import { db } from "./db";
import { DEFAULT_ACCOUNTS } from "./accounting";
import { INDUSTRIES, MODULE_KEYS } from "./modules";
import { DEFAULT_MONITORS, MONITOR_CATALOG } from "./monitors";
import { slugify } from "./format";
import { token } from "./crypto";

// Sales tax by Canadian province (combined rate). Adjust in Settings > Tax rates.
const CA_TAX: Record<string, [string, number]> = {
  ON: ["HST 13%", 0.13], NS: ["HST 15%", 0.15], NB: ["HST 15%", 0.15], NL: ["HST 15%", 0.15], PE: ["HST 15%", 0.15],
  QC: ["GST + QST", 0.14975], BC: ["GST + PST", 0.12], MB: ["GST + PST", 0.12], SK: ["GST + PST", 0.11],
  AB: ["GST 5%", 0.05], NT: ["GST 5%", 0.05], NU: ["GST 5%", 0.05], YT: ["GST 5%", 0.05],
};

export async function createWorkspace(user: User, input: { company: string; industry?: string; country?: string; region?: string; phone?: string; partnerCode?: string; planKey?: string }) {
  const industry = INDUSTRIES.find((i) => i.key === input.industry) ?? INDUSTRIES.at(-1)!;
  const base = slugify(input.company) || "company";
  const slug = (await db.organization.findUnique({ where: { slug: base } })) ? `${base}-${token(3).toLowerCase()}` : base;
  const partner = input.partnerCode ? await db.partner.findUnique({ where: { code: input.partnerCode } }) : null;
  const country = input.country ?? "CA";
  const currency = country === "US" ? "USD" : country === "GB" ? "GBP" : ["FR", "DE", "ES", "IT", "NL", "IE"].includes(country) ? "EUR" : country === "AE" ? "AED" : "CAD";

  const org = await db.organization.create({
    data: {
      name: input.company, slug, industry: industry.key, country, region: input.region, currency, phone: input.phone,
      planKey: input.planKey ?? "GROWTH", subscriptionStatus: "TRIALING", trialEndsAt: new Date(Date.now() + 14 * 864e5),
      modules: MODULE_KEYS, partnerId: partner?.id,
      memberships: { create: { userId: user.id, role: "OWNER", title: "Owner" } },
    },
    include: { memberships: true },
  });
  const ownerM = org.memberships[0]!;
  const [first, ...rest] = user.name.split(" ");
  const location = await db.location.create({ data: { orgId: org.id, name: "Main location" } });
  await db.employee.create({ data: { orgId: org.id, membershipId: ownerM.id, firstName: first ?? user.name, lastName: rest.join(" ") || "-", email: user.email, jobTitle: "Owner", payType: "SALARY", locationId: location.id, region: input.region } });
  await db.account.createMany({ data: DEFAULT_ACCOUNTS.map(([code, name, type]) => ({ orgId: org.id, code, name, type })) });
  const tax = country === "CA" ? CA_TAX[input.region ?? "ON"] ?? CA_TAX.ON : null;
  if (tax) await db.taxRate.create({ data: { orgId: org.id, name: tax[0], rate: tax[1] } });
  await db.payrollRule.createMany({
    data: country === "CA"
      ? [
          { orgId: org.id, name: "CPP (verify current rate)", kind: "PERCENT", rate: 0.0595, employerRate: 0.0595, annualCap: 4034.1 },
          { orgId: org.id, name: "EI (verify current rate)", kind: "PERCENT", rate: 0.0164, employerRate: 0.02296, annualCap: 1077.48 },
          { orgId: org.id, name: "Income tax estimate (set per CRA tables)", kind: "PERCENT", rate: 0.15, employerRate: 0 },
        ]
      : [{ orgId: org.id, name: "Income tax estimate (configure)", kind: "PERCENT", rate: 0.15, employerRate: 0 }],
  });
  await db.monitor.createMany({
    data: MONITOR_CATALOG.filter((m) => DEFAULT_MONITORS.includes(m.kind)).map((m) => ({ orgId: org.id, name: m.name, kind: m.kind, threshold: m.defaultThreshold, channels: ["IN_APP", "EMAIL"] })),
  });
  await db.automationRule.createMany({
    data: [
      { orgId: org.id, name: "Remind customers about overdue invoices", trigger: "INVOICE_OVERDUE", action: "SEND_INVOICE_REMINDERS", autonomy: "APPROVE" },
      { orgId: org.id, name: "Reorder approved supplies when low", trigger: "STOCK_LOW", action: "CREATE_PURCHASE_ORDER", autonomy: "APPROVE", spendLimit: 300 },
      { orgId: org.id, name: "Find a replacement when a shift is missed", trigger: "SHIFT_MISSED", action: "NOTIFY_MANAGER", autonomy: "APPROVE" },
      { orgId: org.id, name: "Draft replies to new reviews", trigger: "NEW_REVIEW", action: "REPLY_TO_REVIEW", autonomy: "ASSIST" },
    ],
  });
  await db.chatChannel.createMany({ data: [{ orgId: org.id, name: "general" }, { orgId: org.id, name: "announcements" }, { orgId: org.id, name: "managers" }] });
  return org;
}
