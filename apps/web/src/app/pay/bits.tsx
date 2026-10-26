"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Lock, KeyRound } from "lucide-react";
import { Button, Input, Modal } from "@/components/ui";

export const money = (cents: number | null | undefined, currency = "CAD") =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format((cents ?? 0) / 100);

export const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export type Overview = {
  currency: string; balanceCents: number; availableCents: number;
  profile: { tier: number; kycStatus: string; name: string | null; country: string | null; frozen: boolean; pinSet: boolean; twoStep: boolean };
  limits: { perTransfer: number; daily: number; monthly: number; wallet: number; newDevice: boolean };
  health: { score: number; parts: Record<string, number>; inflowCents: number; outflowCents: number; availableCents: number; bufferMonths: number; currency: string };
  recent: { id: string; kind: string; memo: string | null; at: string; amountCents: number; currency: string }[];
  cards: { id: string; last4: string; status: string; type: string; brand: string; expMonth: number; expYear: number }[];
  familyCount: number;
  transfers: { id: string; status: string; sendCents: number; sendCurrency: string; receiveCents: number; receiveCurrency: string; createdAt: string; recipient: { name: string; country: string; label: string | null } }[];
};

/** What still stands between this person and moving money, in order. */
export function readiness(o: Overview) {
  if (o.profile.frozen) return { title: "Your account is on hold", body: "Contact support to unfreeze it.", href: "/pay/help", cta: "Get help" };
  if (!o.profile.twoStep) return { title: "Turn on two-step sign-in", body: "Required to move money. It keeps your money safe even if your password leaks.", href: "/pay/security", cta: "Turn it on" };
  if (o.profile.kycStatus !== "VERIFIED") return { title: o.profile.kycStatus === "PENDING" ? "Verification in progress" : "Verify your identity", body: "About two minutes with your ID and a selfie. Required by law to send money.", href: "/pay/verify", cta: o.profile.kycStatus === "PENDING" ? "Check status" : "Verify now" };
  if (!o.profile.pinSet) return { title: "Create your 6-digit PIN", body: "You'll use it to confirm every payment.", href: "/pay/security", cta: "Set PIN" };
  return null;
}

/** The confirm step for any money move: PIN always, plus an authenticator code when the server asks for one. */
export function ConfirmMoney({ open, onClose, title, summary, needCode, onConfirm }: { open: boolean; onClose: () => void; title: string; summary: React.ReactNode; needCode?: boolean; onConfirm: (pin: string, code?: string) => Promise<void> }) {
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await onConfirm(pin, code || undefined); setPin(""); setCode(""); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="pri" loading={busy} disabled={pin.length !== 6 || (needCode && code.length < 6)} onClick={go}><Lock className="h-4 w-4" />Confirm</Button></>}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-bg p-4 text-[14px]">{summary}</div>
        <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold"><KeyRound className="h-4 w-4" />Your 6-digit oenodpay PIN</span>
          <Input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className="h-12 text-center font-mono text-xl tracking-[.5em]" autoFocus />
        </label>
        {needCode && <label className="block"><span className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold"><ShieldCheck className="h-4 w-4" />Code from your authenticator app</span>
          <Input inputMode="numeric" autoComplete="one-time-code" maxLength={11} value={code} onChange={(e) => setCode(e.target.value.trim())} className="h-12 text-center font-mono text-xl tracking-[.3em]" />
        </label>}
        {err && <p className="rounded-xl bg-[#FFF5F7] px-3 py-2 text-[13px] text-crit">{err}</p>}
        <p className="flex items-center gap-1.5 text-[12px] text-muted"><Lock className="h-3.5 w-3.5" />oenodpay staff will never ask for your PIN or codes.</p>
      </div>
    </Modal>
  );
}

/** Ask for an authenticator code only (adding a recipient, cards, unfreezing). */
export function CodePrompt({ open, onClose, title, onConfirm }: { open: boolean; onClose: () => void; title: string; onConfirm: (code: string) => Promise<void> }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="pri" loading={busy} disabled={code.length < 6} onClick={async () => { setBusy(true); setErr(null); try { await onConfirm(code); setCode(""); } catch (e: any) { setErr(e.message); } finally { setBusy(false); } }}>Confirm</Button></>}>
      <p className="mb-3 text-[14px] text-muted">For your security, enter the 6-digit code from your authenticator app.</p>
      <Input inputMode="numeric" autoComplete="one-time-code" maxLength={11} value={code} onChange={(e) => setCode(e.target.value.trim())} className="h-12 text-center font-mono text-xl tracking-[.3em]" autoFocus />
      {err && <p className="mt-3 rounded-xl bg-[#FFF5F7] px-3 py-2 text-[13px] text-crit">{err}</p>}
    </Modal>
  );
}

export function SetupBanner({ o }: { o: Overview }) {
  const r = readiness(o);
  if (!r) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue/20 bg-gradient-to-r from-sky to-white p-4">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-blue text-white"><ShieldCheck className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1"><b className="block text-[14.5px]">{r.title}</b><small className="text-muted">{r.body}</small></div>
      <Link href={r.href} className="btn-pri">{r.cta}</Link>
    </div>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="font-display text-[28px] font-semibold tracking-tight text-navy">{title}</h1>{sub && <p className="mt-1 max-w-2xl text-[14px] text-muted">{sub}</p>}</div>
      {action}
    </div>
  );
}
