"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, GraduationCap } from "lucide-react";
import { api } from "@/lib/client/api";
import { INDUSTRIES } from "@/lib/modules";
import { safeNext } from "@/lib/public";
import { Button, Field, Input, Select, cx } from "@/components/ui";

const COUNTRIES = ["CA", "US", "GB", "AU", "NZ", "IE", "FR", "DE", "ES", "IT", "NL", "BE", "CH", "SE", "NO", "DK", "PT", "AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB", "MA", "TN", "DZ", "TR", "IN", "PK", "BD", "PH", "SG", "MY", "ID", "JP", "KR", "CN", "HK", "MX", "BR", "AR", "CL", "CO", "PE", "ZA", "NG", "KE", "GH"];

function strength(p: string) {
  let s = 0;
  if (p.length >= 10) s++; if (p.length >= 14) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
}

export default function SignUp() {
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));
  const plan = sp.get("plan") ?? undefined;
  const [kind, setKind] = useState<"business" | "learner">(sp.get("for") === "learner" ? "learner" : "business");
  const [v, setV] = useState({ name: "", email: "", password: "", company: "", industry: "", country: "CA", phone: "", marketingConsent: false });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Country names in the visitor's language. Built after mount so server and browser render the same first.
  const [names, setNames] = useState(() => COUNTRIES.map((c) => ({ value: c, label: c })));
  useEffect(() => { try { const d = new Intl.DisplayNames([navigator.language || "en"], { type: "region" }); setNames(COUNTRIES.map((c) => ({ value: c, label: d.of(c) ?? c })).sort((a, b) => a.label.localeCompare(b.label))); } catch {} }, []);
  useEffect(() => {
    const ask = sp.get("ask"); if (ask) try { sessionStorage.setItem("oenod:ask", ask.slice(0, 500)); } catch {}
    try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz.startsWith("America/") && !/Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal/.test(tz)) setV((x) => ({ ...x, country: "US" })); } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, x: unknown) => setV((s) => ({ ...s, [k]: x }));
  const st = strength(v.password);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await api("/api/auth/signup", { body: { name: v.name, email: v.email, password: v.password, marketingConsent: v.marketingConsent, plan, learnerOnly: kind === "learner", ...(kind === "business" ? { company: v.company, industry: v.industry || undefined, country: v.country, phone: v.phone || undefined } : {}), partner: sp.get("partner") ?? undefined } });
      location.href = r.mustEnable2fa ? "/app/account/security?setup=2fa" : next ?? r.redirect;
    } catch (er: any) { setErr(er.message); setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <div><h1 className="font-display text-[32px] font-semibold tracking-tight">Create your account</h1><p className="mt-1 text-[14px] text-muted">{kind === "business" ? "14 days free. No credit card." : "Free. Take courses and apply to jobs faster."}</p></div>
      <div className="grid grid-cols-2 gap-2">
        {([["business", Building2, "For my business"], ["learner", GraduationCap, "To learn or find a job"]] as const).map(([k, I, l]) => (
          <button type="button" key={k} onClick={() => setKind(k)} className={cx("flex items-center gap-2 rounded-xl border px-3 py-3 text-start text-[13px] font-bold transition", kind === k ? "border-navy bg-navy text-white" : "border-line hover:border-[#C9D4FF]")}><I className="h-4 w-4 shrink-0" />{l}</button>
        ))}
      </div>
      <Field label="Your name" required><Input required minLength={2} value={v.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" className="h-11" /></Field>
      <Field label={kind === "business" ? "Work email" : "Email"} required><Input type="email" required value={v.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" className="h-11" /></Field>
      <Field label="Password" required help="At least 10 characters. A short sentence works well.">
        <Input type="password" required minLength={10} value={v.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" className="h-11" />
        {v.password && <div className="mt-2 flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={cx("h-1 flex-1 rounded-full", i < st ? (st < 2 ? "bg-crit" : st < 3 ? "bg-[#FFB020]" : "bg-[#1FAF6B]") : "bg-line")} />)}</div>}
      </Field>
      {kind === "business" && <>
        <Field label="Company name" required><Input required value={v.company} onChange={(e) => set("company", e.target.value)} autoComplete="organization" className="h-11" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Industry"><Select value={v.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Choose…" options={INDUSTRIES.map((i) => ({ value: i.key, label: i.name }))} /></Field>
          <Field label="Country"><Select value={v.country} onChange={(e) => set("country", e.target.value)} options={names} /></Field>
        </div>
      </>}
      <label className="flex items-start gap-2 text-[12.5px] leading-5 text-muted"><input type="checkbox" className="mt-0.5" checked={v.marketingConsent} onChange={(e) => set("marketingConsent", e.target.checked)} />Send me product news, tips and offers from OENOD. I can unsubscribe at any time.</label>
      {err && <p className="rounded-xl bg-[#FFF5F7] px-3 py-2 text-[13px] text-crit">{err}{/already exists/.test(err) && <> <Link href="/signin" className="font-bold underline">Sign in</Link></>}</p>}
      <Button variant="pri" type="submit" loading={busy} className="h-12 w-full text-[14.5px]">{kind === "business" ? "Start free trial" : "Create free account"}</Button>
      <p className="text-center text-[11.5px] leading-5 text-muted">By continuing you agree to the <a href="/legal/terms" className="underline">Terms</a> and <a href="/legal/privacy" className="underline">Privacy Policy</a>.</p>
      <p className="text-center text-[13.5px] text-muted">Already have an account? <Link href={`/signin${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-blue">Sign in</Link></p>
    </form>
  );
}
