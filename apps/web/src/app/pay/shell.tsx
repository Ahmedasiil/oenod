"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Send, CreditCard, Users, LineChart, Sparkles, Plane, ShieldCheck, LifeBuoy, ArrowLeft, Bell, Lock } from "lucide-react";
import { useSession } from "@/components/session";
import { cx } from "@/components/ui";

const GROUPS = [
  { label: "Money", items: [["/pay", "Overview", Home], ["/pay/send", "Send money", Send], ["/pay/cards", "Cards", CreditCard]] },
  { label: "Life", items: [["/pay/family", "Family", Users], ["/pay/travel", "Travel eSIM", Plane]] },
  { label: "Wealth", items: [["/pay/markets", "Markets", LineChart], ["/pay/coach", "Oeno coach", Sparkles]] },
  { label: "Account", items: [["/pay/security", "Security", ShieldCheck], ["/pay/help", "Help", LifeBuoy]] },
] as const;
const MOBILE = [["/pay", "Home", Home], ["/pay/send", "Send", Send], ["/pay/cards", "Cards", CreditCard], ["/pay/markets", "Wealth", LineChart], ["/pay/security", "Security", ShieldCheck]] as const;

const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function PayShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const s = useSession();
  const on = (h: string) => (h === "/pay" ? path === h : path.startsWith(h));
  return (
    <div className="pay-ui min-h-dvh bg-[#F6F7F9] text-[#0B1020] lg:bg-[linear-gradient(to_right,#080B14_264px,#F6F7F9_264px)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[264px] flex-col bg-[#080B14] text-white lg:flex">
        <div className="flex h-[72px] items-center px-6"><Link href="/pay" aria-label="oenodpay home"><img src="/brand/oenodpay-logo-white.svg" alt="oenodpay" className="h-[26px] w-auto" /></Link></div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-2" aria-label="oenodpay">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <div className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[.14em] text-white/35">{g.label}</div>
              {g.items.map(([href, label, I]) => (
                <Link key={href} href={href} aria-current={on(href) ? "page" : undefined}
                  className={cx("group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-medium transition", on(href) ? "bg-white/[.08] text-white" : "text-white/60 hover:bg-white/[.04] hover:text-white")}>
                  {on(href) && <span className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-[#4C6BFF]" />}
                  <I className="h-[18px] w-[18px]" strokeWidth={1.8} />{label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="m-3 rounded-[14px] border border-white/[.08] bg-white/[.03] p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#4C6BFF] to-[#1B2A8A] font-display text-[12px] font-semibold">{initials(s.user.name)}</span>
            <div className="min-w-0 flex-1"><b className="block truncate text-[13px] font-semibold">{s.user.name}</b><span className="flex items-center gap-1 text-[11.5px] text-white/50"><Lock className="h-3 w-3" />Personal account</span></div>
          </div>
          {s.org && <Link href="/app" className="mt-3 flex items-center gap-1.5 rounded-[9px] px-2 py-1.5 text-[12px] text-white/55 hover:bg-white/[.05] hover:text-white"><ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />Back to {s.org.name}</Link>}
        </div>
      </aside>

      <div className="lg:ps-[264px]">
      <header className="sticky top-0 z-20 border-b border-[#E7E9EF] bg-[#F6F7F9]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-3 px-4 lg:h-[72px] lg:px-10">
          <Link href="/pay" className="lg:hidden" aria-label="oenodpay home"><img src="/brand/oenodpay-logo.svg" alt="oenodpay" className="h-6 w-auto" /></Link>
          <span className="flex-1" />
          <span className="hidden items-center gap-1.5 rounded-full border border-[#D7F0E3] bg-[#F1FBF6] px-3 py-1.5 text-[12px] font-semibold text-[#0E7A4F] sm:flex"><ShieldCheck className="h-3.5 w-3.5" />Protected session</span>
          <Link href="/pay/help" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-full border border-[#E2E5EC] bg-white text-[#344054] hover:bg-[#FAFBFC]"><Bell className="h-[18px] w-[18px]" strokeWidth={1.8} /></Link>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0B1020] font-display text-[12.5px] font-semibold text-white lg:hidden" title={s.user.name}>{initials(s.user.name)}</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-6 lg:px-10 lg:pb-14 lg:pt-8">{children}</main>
      </div>

      {/* Phone tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E7E9EF] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="oenodpay">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE.map(([href, label, I]) => (
            <Link key={href} href={href} className={cx("flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold tracking-wide", on(href) ? "text-[#0B1020]" : "text-[#98A2B3]")}>
              <I className="h-[22px] w-[22px]" strokeWidth={on(href) ? 2.1 : 1.7} />{label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
