// Small formatting helpers shared by the public pages (server and client).

export const WORKPLACE: Record<string, string> = { ONSITE: "On site", HYBRID: "Hybrid", REMOTE: "Remote" };
export const EMPLOYMENT: Record<string, string> = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract", TEMPORARY: "Temporary", INTERNSHIP: "Internship", SEASONAL: "Seasonal" };
const PERIOD: Record<string, string> = { HOUR: "/hr", DAY: "/day", WEEK: "/wk", MONTH: "/mo", YEAR: "/yr" };

export function salary(j: { salaryMin: number | null; salaryMax: number | null; salaryPeriod: string; currency: string }) {
  if (!j.salaryMin && !j.salaryMax) return null;
  const big = j.salaryPeriod === "YEAR";
  const f = (n: number) => big && n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n.toLocaleString("en-CA", { maximumFractionDigits: 2 })}`;
  const range = j.salaryMin && j.salaryMax && j.salaryMin !== j.salaryMax ? `${f(j.salaryMin)}–${f(j.salaryMax)}` : f((j.salaryMin ?? j.salaryMax)!);
  return `${range}${PERIOD[j.salaryPeriod] ?? ""}${j.currency !== "CAD" ? ` ${j.currency}` : ""}`;
}

export function ago(d: Date | string | null | undefined) {
  if (!d) return "";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 3600) return "just now";
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function money(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
}

/** Only same-site paths are allowed after sign-in (no open redirects). */
export function safeNext(n: string | null | undefined) {
  return n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null;
}
