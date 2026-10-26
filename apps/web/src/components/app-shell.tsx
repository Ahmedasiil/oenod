"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronsUpDown, Menu, Search, Sparkles, X, LogOut, ShieldCheck, UserRound, Check, Shield, Megaphone, Award, ArrowRight } from "lucide-react";
import { MODULES, type ModuleGroup } from "@/lib/modules";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "./session";
import { useT } from "./i18n";
import { Icon } from "./icons";
import { Logo, CompanyMark, VerifiedTick } from "./logo";
import { LanguageSwitcher } from "./language";
import { AiChat } from "./ai-chat";
import { Avatar, cx } from "./ui";

const GROUPS: ModuleGroup[] = ["Workspace", "People", "Customers", "Money", "Operations", "Grow", "Platform"];
const EXTRA: Record<string, { href: string; label: string; icon: React.ReactNode; module: string }[]> = {
  Grow: [{ href: "/app/ads", label: "Ads manager", icon: <Megaphone className="h-[17px] w-[17px]" strokeWidth={1.8} />, module: "marketing" }, { href: "/app/certificates", label: "Certificates", icon: <Award className="h-[17px] w-[17px]" strokeWidth={1.8} />, module: "academy" }],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const s = useSession();
  const t = useT();
  const path = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => setNavOpen(false), [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setAiOpen((o) => !o); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const allowed = new Set(s.modules);
  const nav = GROUPS.map((g) => ({
    group: g,
    items: [
      ...MODULES.filter((m) => m.group === g && allowed.has(m.key)).map((m) => ({ href: m.href, label: t(`modules.${m.key}`), icon: <Icon name={m.icon} />, key: m.key })),
      ...(EXTRA[g] ?? []).filter((x) => allowed.has(x.module)).map((x) => ({ href: x.href, label: x.label, icon: x.icon, key: x.href })),
    ],
  })).filter((g) => g.items.length);
  const active = (href: string) => href === "/app" ? path === "/app" : path === href || path.startsWith(href + "/");

  return (
    <div className="blueprint relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_70%_0,rgba(35,66,224,.07),transparent_70%),linear-gradient(180deg,rgba(245,247,252,.45),rgba(245,247,252,.94)_40%)]" />
      <div className="relative lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className={cx("fixed inset-y-0 start-0 z-40 flex w-[272px] flex-col gap-4 border-e border-line bg-paper px-3.5 pb-4 pt-[max(18px,env(safe-area-inset-top))] transition-transform lg:sticky lg:top-0 lg:h-dvh lg:w-auto lg:translate-x-0", navOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full lg:rtl:translate-x-0")}>
          <div className="flex items-center justify-between px-1.5"><Logo href="/app" className="h-[22px] w-auto" /><button className="btn-ghost btn-sm lg:hidden" onClick={() => setNavOpen(false)} aria-label="Close menu"><X className="h-4 w-4" /></button></div>
          <WorkspaceSwitcher />
          <nav className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1" aria-label="Main">
            {s.employee && (
              <NavLink href="/me" on={path.startsWith("/me")} icon={<UserRound className="h-[17px] w-[17px]" strokeWidth={1.8} />}>{t("modules.me")}</NavLink>
            )}
            <NavLink href="/pay" on={false} icon={<img src="/brand/oenodpay-icon.svg" alt="" className="h-[17px] w-[17px] rounded-[5px]" />}>oenodpay</NavLink>
            {nav.map((g) => (
              <div key={g.group} className="flex flex-col gap-px">
                <h6 className="mx-2.5 mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-muted">{g.group}</h6>
                {g.items.map((i) => (
                  <NavLink key={i.key} href={i.href} on={active(i.href)} icon={i.icon} paused={s.pausedModules.includes(i.key)}>{i.label}</NavLink>
                ))}
              </div>
            ))}
            {s.user.isSuperAdmin && (
              <div className="flex flex-col gap-px"><h6 className="mx-2.5 mb-1.5 font-mono text-[10px] uppercase tracking-[.12em] text-muted">OENOD</h6>
                <NavLink href="/admin" on={false} icon={<Shield className="h-[17px] w-[17px]" strokeWidth={1.8} />}>{t("nav.admin")}</NavLink>
              </div>
            )}
          </nav>
          <PlanCard />
        </aside>
        {navOpen && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setNavOpen(false)} />}

        {/* Main */}
        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/85 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-2">
              <button className="btn btn-sm h-10 w-10 px-0 lg:hidden" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
              <button onClick={() => setCmdOpen(true)} className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-paper px-3.5 text-start text-muted shadow-card transition hover:border-[#CBD3E8]">
                <Search className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{t("common.search")}…</span>
                <kbd className="hidden rounded-md border border-line bg-bg px-1.5 font-mono text-[11px] sm:block">⌘K</kbd>
              </button>
              <button onClick={() => setAiOpen(true)} className="btn-pri hidden h-10 sm:inline-flex"><Sparkles className="h-4 w-4" />AI</button>
              <button onClick={() => setAiOpen(true)} className="btn-pri h-10 w-10 px-0 sm:hidden" aria-label="AI"><Sparkles className="h-4 w-4" /></button>
              <Notifications />
              <div className="hidden md:block"><LanguageSwitcher compact /></div>
              <UserMenu />
            </div>
          </header>
          <TrialBanner />
          <main className="relative mx-auto w-full max-w-[1400px] px-4 pb-24 pt-5 sm:px-6" style={{ paddingLeft: "max(16px, env(safe-area-inset-left))", paddingRight: "max(16px, env(safe-area-inset-right))" }}>{children}</main>
        </div>
      </div>

      {/* AI side panel */}
      <div className={cx("fixed inset-y-0 end-0 z-50 flex w-full max-w-[420px] flex-col border-s border-line bg-paper shadow-lift transition-transform", aiOpen ? "translate-x-0" : "translate-x-full rtl:-translate-x-full")} aria-hidden={!aiOpen}>
        <div className="navy-panel m-3 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div><div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[.14em] text-[#C9D4FF]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5BF0A9]" />AI Business Manager</div>
              <div className="mt-1 font-display text-base font-semibold">{s.org?.aiPaused ? t("ai.emergencyStop") : s.org?.aiSimulation ? t("ai.simulation") : "Ready"}</div></div>
            <button onClick={() => setAiOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10" aria-label={t("common.close")}><X className="h-4 w-4" /></button>
          </div>
        </div>
        {aiOpen && <div className="min-h-0 flex-1"><AiChat compact suggestions={["What needs my attention today?", "Who is working tomorrow and are any shifts uncovered?", "Which invoices are overdue?", "How did sales do this week vs last week?"]} /></div>}
      </div>
      {aiOpen && <div className="fixed inset-0 z-40 bg-ink/20" onClick={() => setAiOpen(false)} />}

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} onAskAi={() => { setCmdOpen(false); setAiOpen(true); }} />}
    </div>
  );
}

function NavLink({ href, on, icon, children, paused }: { href: string; on: boolean; icon: React.ReactNode; children: React.ReactNode; paused?: boolean }) {
  return (
    <Link href={href} aria-current={on ? "page" : undefined}
      className={cx("flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-semibold transition", on ? "bg-sky text-navy" : "text-[#353C57] hover:bg-bg hover:text-ink")}>
      {icon}<span className="min-w-0 flex-1 truncate">{children}</span>
      {paused && <span className="rounded-md bg-[#FFF4DF] px-1.5 font-mono text-[9px] font-semibold text-warn">PAUSED</span>}
    </Link>
  );
}

function WorkspaceSwitcher() {
  const s = useSession();
  const [open, setOpen] = useState(false);
  if (!s.org) return null;
  const sw = async (orgId: string) => { await api("/api/auth/switch-org", { body: { orgId } }); location.href = "/app"; };
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2.5 rounded-xl border border-line p-2 text-start transition hover:bg-bg">
        <CompanyMark name={s.org.name} logoUrl={s.org.logoUrl} size={32} />
        <span className="min-w-0 flex-1"><b className="flex items-center gap-1 truncate text-[13px]">{s.org.name}{s.org.verificationStatus === "VERIFIED" && <VerifiedTick className="h-3.5 w-3.5 shrink-0" />}</b><small className="block truncate text-[11px] text-muted">{s.org.plan.charAt(0) + s.org.plan.slice(1).toLowerCase()} plan · {s.role?.toLowerCase()}</small></span>
        <ChevronsUpDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 z-50 mt-2 rounded-2xl border border-line bg-paper p-1.5 shadow-lift">
            {s.workspaces.map((w) => (
              <button key={w.id} onClick={() => sw(w.id)} className="flex w-full items-center gap-2.5 rounded-xl p-2 text-start hover:bg-bg">
                <CompanyMark name={w.name} logoUrl={w.logoUrl} size={28} /><span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{w.name}</span>
                {w.id === s.org!.id && <Check className="h-4 w-4 text-blue" />}
              </button>
            ))}
            <Link href="/signup?workspace=new" className="mt-1 block rounded-xl p-2 text-[13px] font-bold text-blue hover:bg-bg">+ New company</Link>
          </div>
        </>
      )}
    </div>
  );
}

function PlanCard() {
  const s = useSession();
  if (!s.org || s.org.status !== "TRIALING" || !s.org.trialEndsAt) return null;
  const left = Math.max(0, Math.ceil((new Date(s.org.trialEndsAt).getTime() - Date.now()) / 864e5));
  return (
    <div className="rounded-2xl border border-line bg-bg p-3.5">
      <b className="font-display text-[12.5px] font-semibold">Free trial: {left} days left</b>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DDE3F3]"><i className="block h-full rounded-full bg-gradient-to-r from-navy to-blue" style={{ width: `${Math.min(100, ((14 - left) / 14) * 100)}%` }} /></div>
      {["OWNER", "ADMIN"].includes(s.role ?? "") && <Link href="/app/settings/billing" className="mt-2.5 inline-flex text-xs font-bold text-blue">Choose a plan →</Link>}
    </div>
  );
}

function TrialBanner() {
  const s = useSession();
  if (s.org?.status !== "PAST_DUE") return null;
  return <div className="bg-crit px-4 py-2 text-center text-[13px] font-semibold text-white">Your last payment didn&apos;t go through. <Link className="underline" href="/app/settings/billing">Update your card</Link> to keep your team&apos;s access.</div>;
}

function Notifications() {
  const s = useSession();
  const t = useT();
  const [open, setOpen] = useState(false);
  const { data, reload } = useApi<{ items: any[]; unread: number }>(s.org ? "/api/notifications" : null, { refreshMs: 60_000 });
  const unread = data?.unread ?? s.unread;
  const markRead = async () => { await api("/api/notifications", { method: "POST", body: {} }); reload(); };
  return (
    <div className="relative">
      <button onClick={() => { setOpen((o) => !o); if (!open && unread) markRead(); }} className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-paper text-[#353C57] shadow-card" aria-label={t("nav.notifications")}>
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        {unread > 0 && <span className="absolute end-2 top-2 h-2 w-2 rounded-full border-2 border-paper bg-crit" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-auto rounded-2xl border border-line bg-paper p-2 shadow-lift sm:absolute sm:inset-x-auto sm:end-0 sm:top-auto sm:mt-2 sm:w-96">
            <div className="px-2 pb-2 pt-1 font-display text-sm font-semibold">{t("nav.notifications")}</div>
            {!data?.items.length && <p className="px-2 py-6 text-center text-sm text-muted">{t("common.noResults")}</p>}
            {data?.items.map((n) => {
              const body = <div className="flex gap-3 rounded-xl p-2.5 hover:bg-bg"><span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.level === "critical" || n.level === "error" ? "bg-crit" : n.level === "warning" ? "bg-warn" : n.level === "success" ? "bg-ok" : "bg-blue")} /><span className="min-w-0"><b className="block text-[13px] font-semibold">{n.title}</b>{n.body && <small className="block text-xs text-muted">{n.body}</small>}<small className="font-mono text-[10.5px] text-muted">{t.ago(n.createdAt)}</small></span></div>;
              return n.link && n.link.startsWith("/") ? <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>{body}</Link> : <div key={n.id}>{body}</div>;
            })}
          </div>
        </>
      )}
    </div>
  );
}

function UserMenu() {
  const s = useSession();
  const t = useT();
  const [open, setOpen] = useState(false);
  const out = async () => { await api("/api/auth/signout", { method: "POST", body: {} }).catch(() => null); location.href = "/signin"; };
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-10 items-center gap-2 rounded-xl border border-line bg-paper p-1 pe-1 shadow-card sm:pe-3" aria-label={t("nav.myAccount")}>
        <Avatar name={s.user.name} src={s.user.avatarUrl} size={30} />
        <span className="hidden max-w-[120px] truncate text-[13px] font-semibold sm:block">{s.user.name.split(" ")[0]}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-2 w-64 rounded-2xl border border-line bg-paper p-1.5 shadow-lift">
            <div className="px-3 py-2"><b className="block truncate text-sm">{s.user.name}</b><small className="block truncate text-xs text-muted">{s.user.email}</small></div>
            <Link href="/app/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold hover:bg-bg"><UserRound className="h-4 w-4" />{t("nav.myAccount")}</Link>
            <Link href="/app/account/security" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold hover:bg-bg"><ShieldCheck className="h-4 w-4" />{t("nav.security")}{!s.user.twoFactor && <span className="ms-auto rounded-md bg-[#FFF4DF] px-1.5 text-[10px] font-bold text-warn">2FA off</span>}</Link>
            <div className="px-3 py-1.5 md:hidden"><LanguageSwitcher /></div>
            <button onClick={out} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-semibold text-crit hover:bg-[#FFF5F7]"><LogOut className="h-4 w-4" />{t("common.signOut")}</button>
          </div>
        </>
      )}
    </div>
  );
}

function CommandPalette({ onClose, onAskAi }: { onClose: () => void; onAskAi: () => void }) {
  const t = useT();
  const router = useRouter();
  const s = useSession();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ results: any[]; pages: any[]; directory: any[] } | null>(null);
  const [sel, setSel] = useState(0);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { inp.current?.focus(); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const c = new AbortController();
    const x = setTimeout(() => api(`/api/search?q=${encodeURIComponent(q.trim())}`, { signal: c.signal }).then(setRes).catch(() => null), 180);
    return () => { clearTimeout(x); c.abort(); };
  }, [q]);
  const quick = useMemo(() => MODULES.filter((m) => s.modules.includes(m.key) && (!q || t(`modules.${m.key}`).toLowerCase().includes(q.toLowerCase()))).slice(0, 6).map((m) => ({ title: t(`modules.${m.key}`), subtitle: m.tagline, href: m.href })), [q, s.modules, t]);
  const items = [...(res?.pages ?? quick), ...(res?.results ?? []), ...(res?.directory ?? []).map((d: any) => ({ ...d, href: null }))];
  const go = (i: number) => { const it = items[i]; if (it?.href) { router.push(it.href); onClose(); } };
  return (
    <div className="fixed inset-0 z-[55] grid place-items-start bg-ink/40 px-3 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-paper shadow-lift" role="dialog" aria-label={t("common.search")}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 text-muted" />
          <input ref={inp} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder={`${t("common.search")}…`} className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none"
            onKeyDown={(e) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowDown") { e.preventDefault(); setSel((x) => Math.min(x + 1, items.length)); } if (e.key === "ArrowUp") { e.preventDefault(); setSel((x) => Math.max(x - 1, 0)); } if (e.key === "Enter") { if (sel === items.length) onAskAi(); else go(sel); } }} />
          <kbd className="rounded-md border border-line bg-bg px-1.5 font-mono text-[11px] text-muted">Esc</kbd>
        </div>
        <ul className="max-h-[55vh] overflow-y-auto p-2">
          {items.map((it, i) => (
            <li key={`${it.href ?? it.id}-${i}`}>
              <button onMouseEnter={() => setSel(i)} onClick={() => go(i)} className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start", sel === i && "bg-sky")}>
                <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px] font-semibold">{it.title}</b>{(it.subtitle || it.typeLabel) && <small className="block truncate text-xs text-muted">{[it.typeLabel, it.subtitle].filter(Boolean).join(" · ")}</small>}</span>
                {it.href && <ArrowRight className="h-4 w-4 text-muted rtl:rotate-180" />}
              </button>
            </li>
          ))}
          <li><button onMouseEnter={() => setSel(items.length)} onClick={onAskAi} className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start", sel === items.length && "bg-sky")}><Sparkles className="h-4 w-4 text-blue" /><span className="text-[13.5px] font-semibold">Ask the AI{q ? `: “${q}”` : ""}</span><kbd className="ms-auto font-mono text-[11px] text-muted">⌘J</kbd></button></li>
        </ul>
      </div>
    </div>
  );
}
