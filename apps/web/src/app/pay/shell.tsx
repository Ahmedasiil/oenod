"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Send, CreditCard, Users, LineChart, Sparkles, Plane, ShieldCheck, LifeBuoy, ArrowLeft } from "lucide-react";
import { useSession } from "@/components/session";
import { cx } from "@/components/ui";

const NAV = [
  ["/pay", "Home", Home], ["/pay/send", "Send", Send], ["/pay/cards", "Cards", CreditCard], ["/pay/family", "Family", Users],
  ["/pay/markets", "Markets", LineChart], ["/pay/coach", "Coach", Sparkles], ["/pay/travel", "Travel eSIM", Plane],
  ["/pay/security", "Security", ShieldCheck], ["/pay/help", "Help", LifeBuoy],
] as const;
const MOBILE = ["/pay", "/pay/send", "/pay/cards", "/pay/coach", "/pay/security"];

export function PayShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const s = useSession();
  const on = (h: string) => (h === "/pay" ? path === h : path.startsWith(h));
  return (
    <div className="min-h-dvh bg-[#F4F6FB]">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/pay" aria-label="oenodpay home"><img src="/brand/oenodpay-logo.svg" alt="oenodpay" className="h-7 w-auto" /></Link>
          <nav className="ms-4 hidden flex-1 items-center gap-0.5 lg:flex" aria-label="oenodpay">
            {NAV.map(([href, label]) => <Link key={href} href={href} aria-current={on(href) ? "page" : undefined} className={cx("rounded-full px-3 py-1.5 text-[13.5px] font-semibold transition", on(href) ? "bg-navy text-white" : "text-[#353C57] hover:bg-sky")}>{label}</Link>)}
          </nav>
          <span className="flex-1 lg:hidden" />
          {s.org && <Link href="/app" className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:bg-bg sm:flex"><ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />{s.org.name}</Link>}
          <span className="grid h-9 w-9 place-items-center rounded-full bg-navy font-display text-[13px] font-semibold text-white" title={s.user.name}>{s.user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-12">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="oenodpay">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {NAV.filter(([h]) => MOBILE.includes(h)).map(([href, label, I]) => (
            <Link key={href} href={href} className={cx("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold", on(href) ? "text-blue" : "text-muted")}><I className="h-5 w-5" strokeWidth={on(href) ? 2.2 : 1.8} />{label}</Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
