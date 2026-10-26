"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, CheckSquare, Building2, Users, Power, Plug, Rocket, BadgeCheck, Megaphone, Puzzle, GraduationCap, CreditCard, ScrollText, Menu, X, ArrowLeft, Wallet, Headphones, ShieldAlert } from "lucide-react";
import { useApi } from "@/lib/client/api";
import { Logo } from "@/components/logo";
import { Avatar, cx } from "@/components/ui";

const NAV = [
  { group: "Run", items: [["/admin", "Overview", LayoutDashboard], ["/admin/ai", "AI operator", Sparkles], ["/admin/approvals", "Approvals", CheckSquare]] },
  { group: "Customers", items: [["/admin/companies", "Companies", Building2], ["/admin/users", "Users", Users], ["/admin/verifications", "Verifications", BadgeCheck], ["/admin/support", "Call center & support", Headphones]] },
  { group: "oenodpay", items: [["/admin/pay", "Pay overview", Wallet], ["/admin/compliance", "Compliance (AML)", ShieldAlert]] },
  { group: "Platform", items: [["/admin/controls", "Controls & status", Power], ["/admin/plugins", "Plugin centre", Plug], ["/admin/plans", "Plans & pricing", CreditCard]] },
  { group: "Grow", items: [["/admin/growth", "Growth & marketing", Rocket], ["/admin/ads", "Ads review", Megaphone], ["/admin/marketplace", "Plugin marketplace", Puzzle], ["/admin/academy", "Academy", GraduationCap]] },
  { group: "Trust", items: [["/admin/audit", "Audit log", ScrollText]] },
] as const;

export function AdminShell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const { data: queue } = useApi<{ counts: Record<string, number> }>("/api/admin/actions", { refreshMs: 30_000 });
  const waiting = queue?.counts?.PROPOSED ?? 0;
  const on = (h: string) => (h === "/admin" ? path === h : path.startsWith(h));
  return (
    <div className="blueprint relative min-h-dvh">
      <div className="relative lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className={cx("fixed inset-y-0 start-0 z-40 flex w-[272px] flex-col gap-4 border-e border-line bg-paper px-3.5 pb-4 pt-[max(18px,env(safe-area-inset-top))] transition-transform lg:sticky lg:top-0 lg:h-dvh lg:w-auto lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0")}>
          <div className="flex items-center justify-between px-1.5">
            <span className="flex items-center gap-2"><Logo href="/admin" className="h-[20px] w-auto" /><span className="rounded-md bg-navy px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-white">Admin</span></span>
            <button className="btn-ghost btn-sm lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-4 w-4" /></button>
          </div>
          <nav className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1" aria-label="Admin">
            {NAV.map((g) => (
              <div key={g.group} className="flex flex-col gap-px">
                <h6 className="mx-2.5 mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-muted">{g.group}</h6>
                {g.items.map(([href, label, I]) => (
                  <Link key={href} href={href} aria-current={on(href) ? "page" : undefined} className={cx("flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-semibold transition", on(href) ? "bg-sky text-navy" : "text-[#353C57] hover:bg-bg hover:text-ink")}>
                    <I className="h-[17px] w-[17px]" strokeWidth={1.8} /><span className="flex-1">{label}</span>
                    {href === "/admin/approvals" && waiting > 0 && <span className="rounded-full bg-blue px-1.5 text-[11px] font-bold text-white">{waiting}</span>}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <Link href="/app" className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-[13px] font-semibold text-muted hover:bg-bg"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />Back to my workspace</Link>
          <div className="flex items-center gap-2.5 px-1"><Avatar name={user.name} size={30} /><span className="min-w-0"><b className="block truncate text-[12.5px]">{user.name}</b><small className="block truncate text-[11px] text-muted">{user.email}</small></span></div>
        </aside>
        {open && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}
        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line/70 bg-bg/85 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-md sm:px-6 lg:hidden">
            <button className="btn btn-sm h-10 w-10 px-0" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
            <b className="font-display">Super admin</b>
          </header>
          <main className="relative mx-auto w-full max-w-[1400px] px-4 pb-24 pt-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
