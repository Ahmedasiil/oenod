"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LOCALES } from "@oenod/i18n";
import { api, useApi } from "@/lib/client/api";
import { useT } from "@/components/i18n";
import { ImageInput } from "@/components/upload";
import { Button, Card, Field, Input, Loading, PageHeader, Select, Toggle, useToast } from "@/components/ui";

export default function Account() {
  const t = useT();
  const toast = useToast();
  const { data } = useApi<any>("/api/account");
  const [v, setV] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setV(data); }, [data]);
  if (!v) return <Loading />;
  const save = async (patch?: any) => {
    setBusy(true);
    try { await api("/api/account", { method: "PATCH", body: patch ?? { name: v.name, phone: v.phone || null, avatarUrl: v.avatarUrl } }); toast("Saved"); }
    catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Your account" title="Profile" sub={v.email} actions={<Link href="/app/account/security" className="btn"><ShieldCheck className="h-4 w-4" />Sign-in security</Link>} />
      <Card title="About you">
        <div className="space-y-4">
          <Field label="Photo"><ImageInput value={v.avatarUrl} onChange={(u) => setV({ ...v, avatarUrl: u })} kind="AVATAR" shape="round" label="Photo" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
            <Field label="Mobile number" help="For shift reminders and sign-in alerts."><Input value={v.phone ?? ""} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={v.email} disabled /></Field>
            <Field label="Language"><Select value={t.locale} onChange={async (e) => { await api("/api/account/locale", { method: "PUT", body: { locale: e.target.value } }); location.reload(); }} options={LOCALES.map((l) => ({ value: l.code, label: `${l.native} · ${l.name}` }))} /></Field>
          </div>
          <div className="flex justify-end"><Button variant="pri" loading={busy} onClick={() => save()}>Save</Button></div>
        </div>
      </Card>
      <Card title="News from OENOD">
        <div className="space-y-3">
          <Toggle checked={v.marketingEmailConsent} onChange={(x) => { setV({ ...v, marketingEmailConsent: x }); save({ marketingEmailConsent: x }); }} label="Product news and tips by email" help="About once a month. Unsubscribe from any email in one click." />
          <Toggle checked={v.marketingSmsConsent} onChange={(x) => { setV({ ...v, marketingSmsConsent: x }); save({ marketingSmsConsent: x }); }} label="Offers by text message" help="Reply STOP to any message to opt out." />
          <p className="text-xs text-muted">Account and security messages (like sign-in alerts and payslips) are always sent; they aren't marketing.</p>
        </div>
      </Card>
    </div>
  );
}
