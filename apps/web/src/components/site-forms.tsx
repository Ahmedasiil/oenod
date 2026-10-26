"use client";
import { useState } from "react";
import { Bell, Check, Upload, Send, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { Button, Field, Input, Textarea, useToast } from "@/components/ui";

/** Email me new jobs like this. Requires an explicit opt-in (CASL). */
export function JobAlert({ q, city }: { q?: string; city?: string }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return <div className="card p-5 text-[13.5px]"><Check className="h-5 w-5 text-[#1FAF6B]" /><b className="mt-2 block">You're subscribed</b><p className="text-muted">We'll email you when matching jobs are posted. Every email has an unsubscribe link.</p></div>;
  return (
    <form className="card space-y-3 p-5" onSubmit={async (e) => { e.preventDefault(); try { await api("/api/jobs/alert", { body: { email, keywords: q || undefined, city: city || undefined, consent: true } }); setDone(true); } catch (er: any) { toast(er.message, "err"); } }}>
      <span className="flex items-center gap-2"><Bell className="h-4 w-4 text-blue" /><b className="text-[14px]">Get job alerts</b></span>
      <p className="text-[12.5px] text-muted">{q || city ? `New jobs${q ? ` for “${q}”` : ""}${city ? ` in ${city}` : ""}, straight to your inbox.` : "New jobs straight to your inbox."}</p>
      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      <label className="flex items-start gap-2 text-[12px] leading-5 text-muted"><input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />Yes, email me job alerts from OENOD. I can unsubscribe any time.</label>
      <Button variant="pri" type="submit" disabled={!consent} className="w-full">Create alert</Button>
    </form>
  );
}

/** Apply without an account: name, email, résumé. */
export function ApplyForm({ jobId, title, company, signedIn }: { jobId: string; title: string; company: string; signedIn?: { name: string; email: string } }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  if (done) return (
    <div className="card p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-[#1FAF6B]" />
      <b className="mt-3 block font-display text-xl">Application sent</b>
      <p className="mt-1 text-[13.5px] text-muted">{company} has your application for {title}. We emailed you a confirmation.</p>
      <a href="/jobs" className="btn mt-5">See more jobs</a>
    </div>
  );
  return (
    <form id="apply" className="card scroll-mt-24 space-y-3 p-6" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      const f = new FormData(e.currentTarget); f.set("jobId", jobId);
      if (!file) f.delete("resume");
      try {
        const r = await fetch("/api/jobs/apply", { method: "POST", body: f });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error ?? "Something went wrong. Please try again.");
        setDone(true);
      } catch (er: any) { setErr(er.message); } finally { setBusy(false); }
    }}>
      <b className="font-display text-lg">Apply for this job</b>
      <p className="-mt-2 text-[12.5px] text-muted">No account needed. Takes about a minute.</p>
      <Field label="Full name" required><Input name="name" required minLength={2} defaultValue={signedIn?.name} autoComplete="name" /></Field>
      <Field label="Email" required><Input name="email" type="email" required defaultValue={signedIn?.email} autoComplete="email" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><Input name="phone" type="tel" autoComplete="tel" /></Field>
        <Field label="City"><Input name="city" autoComplete="address-level2" /></Field>
      </div>
      <Field label="Résumé" help="PDF, Word or text, up to 5 MB">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 py-3 text-[13px] hover:border-blue">
          <Upload className="h-4 w-4 text-muted" /><span className="truncate">{file ? file.name : "Choose a file"}</span>
          <input type="file" name="resume" hidden accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </Field>
      <Field label="Why you? (optional)"><Textarea name="coverLetter" rows={4} maxLength={8000} placeholder="A few lines about your experience and when you can start." /></Field>
      <Field label="LinkedIn (optional)"><Input name="linkedinUrl" type="url" placeholder="https://linkedin.com/in/…" /></Field>
      <label className="flex items-start gap-2 text-[12px] leading-5 text-muted"><input type="checkbox" name="marketingConsent" value="true" className="mt-0.5" />Email me job alerts and tips from OENOD. I can unsubscribe any time.</label>
      {err && <p className="rounded-xl bg-[#FFF5F7] px-3 py-2 text-[13px] text-crit">{err}</p>}
      <Button variant="pri" type="submit" loading={busy} className="h-11 w-full"><Send className="h-4 w-4" />Send application</Button>
      <p className="text-[11.5px] leading-5 text-muted">Your details go to {company} only, to consider you for this job. See our <a href="/legal/privacy" className="underline">privacy policy</a>.</p>
    </form>
  );
}

/** Contact sales / demo request. Saved as a lead for the OENOD team. */
export function ContactForm({ topic }: { topic?: string }) {
  const toast = useToast();
  const [v, setV] = useState({ name: "", email: "", company: "", phone: "", message: "", emailConsent: false });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return <div className="card p-8 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-[#1FAF6B]" /><b className="mt-3 block font-display text-xl">Thanks, we got it</b><p className="mt-1 text-[13.5px] text-muted">We read every message and will get back to you by email.</p></div>;
  return (
    <form className="card space-y-3 p-6" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await api("/api/leads", { body: { ...v, source: topic ? `contact:${topic}` : "contact", phone: v.phone || undefined, company: v.company || undefined } }); setDone(true); } catch (er: any) { toast(er.message, "err"); } finally { setBusy(false); } }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name" required><Input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoComplete="name" /></Field>
        <Field label="Work email" required><Input type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} autoComplete="email" /></Field>
        <Field label="Company"><Input value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} autoComplete="organization" /></Field>
        <Field label="Phone"><Input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} autoComplete="tel" /></Field>
      </div>
      <Field label="How can we help?" required><Textarea required rows={5} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} placeholder="Tell us about your business and what you'd like to do with OENOD." /></Field>
      <label className="flex items-start gap-2 text-[12px] leading-5 text-muted"><input type="checkbox" className="mt-0.5" checked={v.emailConsent} onChange={(e) => setV({ ...v, emailConsent: e.target.checked })} />Send me product news, tips and offers from OENOD. I can unsubscribe at any time.</label>
      <Button variant="pri" type="submit" loading={busy} className="h-11">Send message</Button>
    </form>
  );
}

/** Follow a company to see its jobs, courses and news first. */
export function FollowButton({ slug, initial, signedIn, count }: { slug: string; initial: boolean; signedIn: boolean; count: number }) {
  const toast = useToast();
  const [on, setOn] = useState(initial);
  const [n, setN] = useState(count);
  return (
    <Button variant={on ? undefined : "pri"} onClick={async () => {
      if (!signedIn) { location.href = `/signin?next=${encodeURIComponent(location.pathname)}`; return; }
      try { await api(`/api/public/companies/${slug}/follow`, { body: { follow: !on } }); setOn(!on); setN((x) => x + (on ? -1 : 1)); } catch (e: any) { toast(e.message, "err"); }
    }}>{on ? <><Check className="h-4 w-4" />Following</> : "Follow"}<span className="ms-1 text-xs opacity-70">{n.toLocaleString()}</span></Button>
  );
}
