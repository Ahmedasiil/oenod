import { db } from "./db";
import { HttpError } from "./http";

const PERIODS: Record<string, number> = { WEEKLY: 52, BIWEEKLY: 26, SEMIMONTHLY: 24, MONTHLY: 12 };
const round = (n: number) => Math.round(n * 100) / 100;

/** Week key (Monday) for overtime grouping. */
function weekKey(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

export interface StubDraft {
  employeeId: string;
  name: string;
  regularHours: number;
  overtimeHours: number;
  gross: number;
  deductions: { name: string; amount: number }[];
  totalDeductions: number;
  employerContrib: number;
  net: number;
  exceptions: string[];
}

/**
 * Deterministic payroll calculation. The AI may prepare and check inputs, but
 * amounts always come from this function, and release requires a person's approval.
 * Deduction rates are configured per company (Payroll > Deductions) and must be
 * validated for each jurisdiction before live use.
 */
export async function calculatePayroll(orgId: string, periodStart: Date, periodEnd: Date, overtimeAfterWeekly = 40): Promise<StubDraft[]> {
  const [employees, rules, entries] = await Promise.all([
    db.employee.findMany({ where: { orgId, status: { in: ["ACTIVE", "LEAVE"] } } }),
    db.payrollRule.findMany({ where: { orgId, active: true } }),
    db.timeEntry.findMany({ where: { orgId, clockIn: { gte: periodStart, lte: periodEnd } } }),
  ]);
  const yearStart = new Date(periodStart.getFullYear(), 0, 1);
  const ytdStubs = await db.payStub.findMany({ where: { payRun: { orgId, status: { in: ["APPROVED", "PAID"] }, payDate: { gte: yearStart } } } });

  return employees.map((e) => {
    const exceptions: string[] = [];
    const mine = entries.filter((t) => t.employeeId === e.id);
    const open = mine.filter((t) => !t.clockOut);
    if (open.length) exceptions.push(`${open.length} shift(s) without clock-out`);
    const unapproved = mine.filter((t) => t.clockOut && t.status !== "APPROVED");
    if (unapproved.length) exceptions.push(`${unapproved.length} time entr${unapproved.length === 1 ? "y" : "ies"} not approved (excluded)`);

    let regular = 0, overtime = 0, gross = 0;
    if (e.payType === "SALARY") {
      gross = Number(e.payRate) / (PERIODS[e.payFrequency] ?? 26);
    } else {
      const byWeek = new Map<string, number>();
      for (const t of mine) {
        if (!t.clockOut || t.status !== "APPROVED") continue;
        const h = Math.max(0, (t.clockOut.getTime() - t.clockIn.getTime()) / 36e5 - t.breakMinutes / 60);
        if (h > 16) exceptions.push(`Unusually long shift (${h.toFixed(1)}h) on ${t.clockIn.toISOString().slice(0, 10)}`);
        byWeek.set(weekKey(t.clockIn), (byWeek.get(weekKey(t.clockIn)) ?? 0) + h);
      }
      for (const h of byWeek.values()) {
        regular += Math.min(h, overtimeAfterWeekly);
        overtime += Math.max(0, h - overtimeAfterWeekly);
      }
      const rate = Number(e.payRate);
      if (!rate) exceptions.push("No pay rate set");
      gross = regular * rate + overtime * rate * 1.5;
    }
    gross = round(gross);

    const ytd = ytdStubs.filter((s) => s.employeeId === e.id);
    const deductions: { name: string; amount: number }[] = [];
    let employerContrib = 0;
    for (const r of rules) {
      if (r.region && e.region && r.region !== e.region) continue;
      let amt = r.kind === "PERCENT" ? gross * Number(r.rate) : Number(r.rate);
      if (r.annualCap) {
        const used = ytd.reduce((s, st) => s + ((st.deductions as { name: string; amount: number }[]).find((d) => d.name === r.name)?.amount ?? 0), 0);
        amt = Math.max(0, Math.min(amt, Number(r.annualCap) - used));
      }
      amt = round(amt);
      if (amt > 0) deductions.push({ name: r.name, amount: amt });
      employerContrib += r.kind === "PERCENT" ? amt * (Number(r.employerRate) / Math.max(Number(r.rate), 1e-9)) : Number(r.employerRate);
    }
    const totalDeductions = round(deductions.reduce((s, d) => s + d.amount, 0));
    return {
      employeeId: e.id,
      name: `${e.firstName} ${e.lastName}`,
      regularHours: round(regular),
      overtimeHours: round(overtime),
      gross,
      deductions,
      totalDeductions,
      employerContrib: round(employerContrib),
      net: round(gross - totalDeductions),
      exceptions,
    };
  }).filter((s) => s.gross > 0 || s.exceptions.length);
}

export async function createPayRun(orgId: string, periodStart: Date, periodEnd: Date, payDate: Date) {
  if (periodEnd <= periodStart) throw new HttpError(422, "Period end must be after the start.");
  const stubs = await calculatePayroll(orgId, periodStart, periodEnd);
  const sum = (k: keyof StubDraft) => round(stubs.reduce((s, x) => s + Number(x[k]), 0));
  return db.payRun.create({
    data: {
      orgId, periodStart, periodEnd, payDate,
      gross: sum("gross"), deductions: sum("totalDeductions"), net: sum("net"), employerCost: round(sum("gross") + sum("employerContrib")),
      exceptions: stubs.filter((s) => s.exceptions.length).map((s) => ({ name: s.name, issues: s.exceptions })),
      stubs: { create: stubs.map((s) => ({ employeeId: s.employeeId, regularHours: s.regularHours, overtimeHours: s.overtimeHours, gross: s.gross, deductions: s.deductions, totalDeductions: s.totalDeductions, employerContrib: s.employerContrib, net: s.net })) },
    },
    include: { stubs: true },
  });
}
