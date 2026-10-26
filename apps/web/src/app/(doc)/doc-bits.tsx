"use client";
import { useState } from "react";
import { CreditCard, Check, X } from "lucide-react";
import { api } from "@/lib/client/api";
import { Button, Field, Input, useToast } from "@/components/ui";

export function PayButton({ token, label }: { token: string; label: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return <Button variant="pri" loading={busy} className="h-12 w-full text-[15px]" onClick={async () => { setBusy(true); try { const r = await api(`/api/public/pay/${token}`, { body: {} }); location.href = r.url; } catch (e: any) { toast(e.message, "err"); setBusy(false); } }}><CreditCard className="h-4 w-4" />{label}</Button>;
}

export function QuoteDecision({ token }: { token: string }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const decide = async (decision: "accept" | "decline") => {
    setBusy(decision); setErr(null);
    try {
      const r = await api(`/api/public/quote/${token}`, { body: { decision, name } });
      if (r.invoiceToken) location.href = `/pay/${r.invoiceToken}`; else location.reload();
    } catch (e: any) { setErr(e.message); setBusy(null); }
  };
  return (
    <div className="space-y-3">
      <Field label="Type your full name to sign" help="This counts as your electronic signature."><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-12 font-display text-lg italic" /></Field>
      {err && <p className="rounded-xl bg-[#FFF5F7] px-3 py-2 text-[13px] text-crit">{err}</p>}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button variant="pri" className="h-12" disabled={name.trim().length < 2} loading={busy === "accept"} onClick={() => decide("accept")}><Check className="h-4 w-4" />Accept quote</Button>
        <Button className="h-12" disabled={name.trim().length < 2} loading={busy === "decline"} onClick={() => decide("decline")}><X className="h-4 w-4" />Decline</Button>
      </div>
    </div>
  );
}
