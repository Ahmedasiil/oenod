import { Suspense } from "react";
import { Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language";

// Sign-in, sign-up and account recovery: form on one side, OENOD on the other.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] xl:grid-cols-[minmax(0,1fr)_640px]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between"><Logo className="h-6 w-auto" /><LanguageSwitcher compact /></div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10"><Suspense>{children}</Suspense></div>
        <p className="text-center text-[11.5px] text-muted">Protected by encryption, two-step sign-in and rate limits. <a href="/legal/privacy" className="underline">Privacy</a> · <a href="/legal/terms" className="underline">Terms</a></p>
      </div>
      <aside className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_10%,rgba(35,66,224,.6),transparent),radial-gradient(50%_50%_at_0_100%,rgba(142,162,255,.25),transparent)]" />
        <div className="blueprint pointer-events-none absolute inset-0 opacity-[.07]" />
        <div className="relative mt-auto">
          <p className="font-mono text-[11px] uppercase tracking-[.16em] text-[#9DB0FF]">One account · every device</p>
          <h2 className="mt-3 text-balance font-display text-[40px] font-semibold leading-[1.05] tracking-tight">Ask once. It gets done.</h2>
          <ul className="mt-8 space-y-3 text-[14.5px] text-[#D8E0FF]">
            {["An AI manager that does the work and asks before anything important", "People, customers, money and operations in one place", "Web, iPhone, Android and desktop on one account", "Your data encrypted and kept separate for every company"].map((x) => <li key={x} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10"><Check className="h-3 w-3" /></span>{x}</li>)}
          </ul>
        </div>
        <div className="relative mt-auto rounded-2xl border border-white/10 bg-white/[.06] p-5 backdrop-blur">
          <p className="font-mono text-[10.5px] uppercase tracking-[.14em] text-[#9DB0FF]">AI briefing · 08:12</p>
          <b className="mt-1 block font-display text-lg">4 decisions need you today. Everything else is handled.</b>
        </div>
      </aside>
    </div>
  );
}
