"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language";
import { cx } from "@/components/ui";

const NAV = [
  { href: "/#platform", label: "Platform" },
  { href: "/jobs", label: "Jobs" },
  { href: "/academy", label: "Academy" },
  { href: "/companies", label: "Companies" },
  { href: "/pricing", label: "Pricing" },
  { href: "/developers", label: "Developers" },
];

export function SiteHeader({ signedIn, home }: { signedIn: boolean; home: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f(); window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className={cx("sticky top-0 z-40 transition", scrolled || open ? "border-b border-line bg-white/85 backdrop-blur-xl" : "bg-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Logo className="h-[22px] w-auto" />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className={cx("rounded-lg px-3 py-2 text-[13.5px] font-semibold transition hover:bg-sky/60", path.startsWith(n.href) && n.href !== "/#platform" ? "text-blue" : "text-[#2B3150]")}>{n.label}</Link>)}
        </nav>
        <div className="ms-auto hidden items-center gap-2 sm:flex">
          <LanguageSwitcher compact />
          {signedIn ? <Link href={home} className="btn-pri">Open OENOD<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link> : <>
            <Link href="/signin" className="btn">Sign in</Link>
            <Link href="/signup" className="btn-pri">Start free</Link>
          </>}
        </div>
        <button className="ms-auto grid h-10 w-10 place-items-center rounded-xl border border-line bg-white sm:ms-0 lg:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <div className="border-t border-line bg-white px-4 pb-5 pt-2 lg:hidden">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="block rounded-lg px-2 py-3 text-[15px] font-semibold">{n.label}</Link>)}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {signedIn ? <Link href={home} className="btn-pri col-span-2">Open OENOD</Link> : <><Link href="/signin" className="btn">Sign in</Link><Link href="/signup" className="btn-pri">Start free</Link></>}
          </div>
          <div className="mt-3"><LanguageSwitcher /></div>
        </div>
      )}
    </header>
  );
}

const FOOT = [
  { title: "Product", links: [["AI Business Manager", "/#ai"], ["Features", "/#platform"], ["Pricing", "/pricing"], ["Download the apps", "/download"], ["Plugins", "/plugins"], ["Developers & API", "/developers"]] },
  { title: "Marketplaces", links: [["Find a job", "/jobs"], ["Post a job", "/signup?next=/app/recruiting"], ["Academy", "/academy"], ["Teach a course", "/signup?next=/app/academy"], ["Business directory", "/companies"]] },
  { title: "Trust", links: [["Security", "/security"], ["Verify a certificate", "/verify"], ["System status", "/status"], ["Privacy", "/legal/privacy"], ["Terms", "/legal/terms"]] },
  { title: "Company", links: [["Partners & resellers", "/partners"], ["Contact", "/contact"], ["Advertise on OENOD", "/signup?next=/app/ads"]] },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div className="space-y-4">
          <Logo className="h-6 w-auto" />
          <p className="max-w-xs text-[13px] leading-6 text-muted">The business platform with an AI manager built in. Web, iPhone, Android and desktop, all on one account.</p>
          <div className="flex flex-wrap gap-2 text-xs"><Link href="/download" className="chip">App Store</Link><Link href="/download" className="chip">Google Play</Link><Link href="/download" className="chip">Mac & Windows</Link></div>
        </div>
        {FOOT.map((c) => (
          <div key={c.title}>
            <b className="eyebrow">{c.title}</b>
            <ul className="mt-3 space-y-2 text-[13.5px]">{c.links.map(([l, h]) => <li key={h}><Link href={h} className="text-[#2B3150] hover:text-blue">{l}</Link></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-5 text-xs text-muted sm:px-6">
          <span>© {new Date().getFullYear()} OENOD. All rights reserved.</span>
          <span className="ms-auto"><LanguageSwitcher compact /></span>
        </div>
      </div>
    </footer>
  );
}

/** Section heading used across the public site. */
export function SectionHead({ eyebrow, title, accent, sub, center }: { eyebrow?: string; title: string; accent?: string; sub?: string; center?: boolean }) {
  return (
    <div className={cx("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && <span className="inline-block rounded-full bg-sky px-3 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[.14em] text-blue">{eyebrow}</span>}
      <h2 className="mt-4 text-balance font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[44px]">{title}{accent && <> <span className="bg-gradient-to-r from-blue to-[#6E86FF] bg-clip-text text-transparent">{accent}</span></>}</h2>
      {sub && <p className="mt-4 text-[16px] leading-7 text-muted">{sub}</p>}
    </div>
  );
}
