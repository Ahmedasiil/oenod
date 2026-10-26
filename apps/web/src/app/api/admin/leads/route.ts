import { db } from "@/lib/db";
import { ok, requireSuperAdmin, route } from "@/lib/http";

const cell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Prefix formula characters so a spreadsheet never runs them.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

// Website leads. ?format=csv downloads them (consent proof included).
export const GET = route(async (req: Request) => {
  await requireSuperAdmin();
  const q = new URL(req.url).searchParams;
  const search = q.get("q")?.trim();
  const where = { ...(search ? { OR: [{ email: { contains: search, mode: "insensitive" as const } }, { name: { contains: search, mode: "insensitive" as const } }, { company: { contains: search, mode: "insensitive" as const } }] } : {}), ...(q.get("consented") ? { emailConsent: true, unsubscribedAt: null } : {}) };
  if (q.get("format") === "csv") {
    const rows = await db.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 50000 });
    const cols = ["email", "name", "phone", "company", "locale", "source", "emailConsent", "smsConsent", "consentAt", "consentText", "unsubscribedAt", "createdAt"] as const;
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="oenod-leads-${new Date().toISOString().slice(0, 10)}.csv"` } });
  }
  const page = Math.max(1, Number(q.get("page") ?? 1));
  const [rows, total] = await Promise.all([db.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50 }), db.lead.count({ where })]);
  return ok({ data: rows, total, page, pages: Math.ceil(total / 50) });
});
