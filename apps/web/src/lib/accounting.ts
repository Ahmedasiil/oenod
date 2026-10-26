import { db } from "./db";

export const DEFAULT_ACCOUNTS: [string, string, string][] = [
  ["1000", "Cash and bank", "ASSET"], ["1100", "Accounts receivable", "ASSET"], ["1200", "Inventory", "ASSET"], ["1500", "Equipment", "ASSET"],
  ["2000", "Accounts payable", "LIABILITY"], ["2100", "Sales tax payable", "LIABILITY"], ["2200", "Payroll liabilities", "LIABILITY"],
  ["3000", "Owner's equity", "EQUITY"], ["3100", "Retained earnings", "EQUITY"],
  ["4000", "Sales revenue", "INCOME"], ["4100", "Service revenue", "INCOME"], ["4200", "Tips collected", "INCOME"],
  ["5000", "Cost of goods sold", "EXPENSE"], ["6000", "Wages and salaries", "EXPENSE"], ["6100", "Employer payroll taxes", "EXPENSE"],
  ["6200", "Rent", "EXPENSE"], ["6300", "Utilities", "EXPENSE"], ["6400", "Marketing", "EXPENSE"], ["6500", "Fuel and vehicles", "EXPENSE"],
  ["6600", "Software", "EXPENSE"], ["6700", "Supplies", "EXPENSE"], ["6900", "General expenses", "EXPENSE"],
];

export async function ensureAccounts(orgId: string) {
  const n = await db.account.count({ where: { orgId } });
  if (n) return;
  await db.account.createMany({ data: DEFAULT_ACCOUNTS.map(([code, name, type]) => ({ orgId, code, name, type })) });
}

async function acct(orgId: string, code: string) {
  await ensureAccounts(orgId);
  const a = await db.account.findUnique({ where: { orgId_code: { orgId, code } } });
  if (!a) throw new Error(`Account ${code} missing`);
  return a.id;
}

/**
 * Post a balanced journal entry once per source record (unique on org+source+sourceId),
 * so retries never double-post.
 */
export async function post(orgId: string, source: string, sourceId: string, memo: string, lines: { code: string; debit?: number; credit?: number }[]) {
  const d = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const c = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.abs(d - c) > 0.005) throw new Error(`Unbalanced entry for ${source} ${sourceId}`);
  const exists = await db.journalEntry.findUnique({ where: { orgId_source_sourceId: { orgId, source, sourceId } } });
  if (exists) return exists;
  const resolved = await Promise.all(lines.map(async (l) => ({ accountId: await acct(orgId, l.code), debit: l.debit ?? 0, credit: l.credit ?? 0 })));
  return db.journalEntry.create({ data: { orgId, source, sourceId, memo, lines: { create: resolved } } });
}

export async function postInvoice(inv: { id: string; orgId: string; number: string; subtotal: unknown; tax: unknown; total: unknown }) {
  return post(inv.orgId, "INVOICE", inv.id, `Invoice ${inv.number}`, [
    { code: "1100", debit: Number(inv.total) },
    { code: "4100", credit: Number(inv.subtotal) },
    { code: "2100", credit: Number(inv.tax) },
  ].filter((l) => (l.debit ?? l.credit ?? 0) > 0));
}

export async function postPayment(p: { id: string; orgId: string; amount: unknown }) {
  return post(p.orgId, "PAYMENT", p.id, "Customer payment", [{ code: "1000", debit: Number(p.amount) }, { code: "1100", credit: Number(p.amount) }]);
}

export async function postOrder(o: { id: string; orgId: string; number: string; subtotal: unknown; discount: unknown; tax: unknown; tip: unknown; total: unknown }) {
  const net = Number(o.subtotal) - Number(o.discount);
  return post(o.orgId, "ORDER", o.id, `Sale ${o.number}`, [
    { code: "1000", debit: Number(o.total) },
    { code: "4000", credit: round(net) },
    { code: "2100", credit: Number(o.tax) },
    { code: "4200", credit: Number(o.tip) },
  ].filter((l) => (l.debit ?? l.credit ?? 0) > 0));
}

export async function postExpense(e: { id: string; orgId: string; vendor: string; amount: unknown; category: string }) {
  const map: Record<string, string> = { Rent: "6200", Utilities: "6300", Marketing: "6400", Fuel: "6500", Mileage: "6500", Software: "6600", Supplies: "6700" };
  return post(e.orgId, "EXPENSE", e.id, `Expense ${e.vendor}`, [{ code: map[e.category] ?? "6900", debit: Number(e.amount) }, { code: "1000", credit: Number(e.amount) }]);
}

export async function postPayRun(r: { id: string; orgId: string; gross: unknown; deductions: unknown; net: unknown; employerCost: unknown }) {
  const employer = Number(r.employerCost) - Number(r.gross);
  return post(r.orgId, "PAYROLL", r.id, "Payroll", [
    { code: "6000", debit: Number(r.gross) },
    { code: "6100", debit: round(employer) },
    { code: "1000", credit: Number(r.net) },
    { code: "2200", credit: round(Number(r.deductions) + employer) },
  ].filter((l) => (l.debit ?? l.credit ?? 0) > 0));
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Trial balance style summary used by P&L and balance sheet. */
export async function balances(orgId: string, from?: Date, to?: Date) {
  await ensureAccounts(orgId);
  const accounts = await db.account.findMany({ where: { orgId }, orderBy: { code: "asc" } });
  const sums = await db.journalLine.groupBy({
    by: ["accountId"],
    where: { account: { orgId }, entry: { date: { gte: from, lte: to } } },
    _sum: { debit: true, credit: true },
  });
  return accounts.map((a) => {
    const s = sums.find((x) => x.accountId === a.id);
    const debit = Number(s?._sum.debit ?? 0), credit = Number(s?._sum.credit ?? 0);
    const balance = ["ASSET", "EXPENSE"].includes(a.type) ? debit - credit : credit - debit;
    return { ...a, debit, credit, balance: round(balance) };
  });
}
