"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Smartphone, Monitor, KeyRound, Copy, Download, LogOut } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useT } from "@/components/i18n";
import { Badge, Button, Callout, Card, ConfirmButton, Field, Input, Loading, Modal, PageHeader, copyText, useToast } from "@/components/ui";

export default function AccountSecurity() {
  const t = useT();
  const toast = useToast();
  const { data, reload } = useApi<any>("/api/account/security");
  const [setup, setSetup] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [disable, setDisable] = useState(false);
  const [pw, setPw] = useState({ current: "", password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  if (!data) return <Loading />;
  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.password !== pw.confirm) return toast("The new passwords don't match.", "err");
    setBusy(true);
    try { await api("/api/account/security/password", { body: { current: pw.current || undefined, password: pw.password, signOutOthers: true } }); toast("Password changed. Other devices were signed out."); setPw({ current: "", password: "", confirm: "" }); reload(); }
    catch (er: any) { toast(er.message, "err"); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader eyebrow="Your account" title="Sign-in security" sub="Protect your account with two-step sign-in and keep an eye on where you're signed in." />
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <span className={`grid h-12 w-12 place-items-center rounded-xl ${data.twoFactor.enabled ? "bg-[#E7F7EF] text-ok" : "bg-[#FFF4DF] text-warn"}`}>{data.twoFactor.enabled ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}</span>
          <div className="min-w-0 flex-1">
            <b className="font-display text-lg">Two-step sign-in is {data.twoFactor.enabled ? "on" : "off"}</b>
            <p className="text-sm text-muted">{data.twoFactor.enabled ? `Since ${t.date(data.twoFactor.since)} · ${data.twoFactor.recoveryCodesLeft} recovery codes left` : "Use an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…) so a stolen password isn't enough."}</p>
          </div>
          {data.twoFactor.enabled ? <div className="flex gap-2"><RegenCodes onCodes={setCodes} /><Button variant="ghost" onClick={() => setDisable(true)}>Turn off</Button></div> : <Button variant="pri" onClick={() => setSetup(true)}>Turn on</Button>}
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Change password">
          <form onSubmit={changePw} className="space-y-3">
            <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="New password" help="At least 10 characters. A short sentence works well."><Input type="password" autoComplete="new-password" minLength={10} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required /></Field>
            <Field label="Repeat new password"><Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></Field>
            <Button variant="pri" type="submit" loading={busy}><KeyRound className="h-4 w-4" />Change password</Button>
            {data.passwordChangedAt && <p className="text-xs text-muted">Last changed {t.ago(data.passwordChangedAt)}</p>}
          </form>
        </Card>
        <Card title="Where you're signed in" action={data.sessions.length > 1 && <ConfirmButton variant="ghost" confirmLabel="Sign out everywhere else" onConfirm={async () => { const r = await api("/api/account/security/sessions", { method: "DELETE" }); toast(`Signed out ${r.signedOut} other session(s)`); reload(); }}><LogOut className="h-3.5 w-3.5" />Others</ConfirmButton>} pad={false}>
          <ul className="divide-y divide-line">{data.sessions.map((x: any) => (
            <li key={x.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-bg text-navy">{/ios|android|mobile/i.test(`${x.client} ${x.device}`) ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}</span>
              <span className="min-w-0 flex-1"><b className="block truncate text-[13px]">{x.device ?? x.client ?? "Browser"}{x.current && <Badge tone="ok" className="ms-2">This device</Badge>}</b><small className="font-mono text-[11px] text-muted">{x.ip ?? "unknown IP"} · {t.ago(x.lastSeenAt ?? x.createdAt)}{x.mfa ? " · 2-step" : ""}</small></span>
              {!x.current && <Button size="sm" variant="ghost" onClick={async () => { await api(`/api/account/security/sessions/${x.id}`, { method: "DELETE" }); reload(); }}>Sign out</Button>}
            </li>
          ))}</ul>
        </Card>
      </div>
      <Card title="Recent sign-in activity">
        <ul className="space-y-1.5 text-[13px]">{data.activity.map((a: any, i: number) => <li key={i} className="flex justify-between gap-3"><span>{a.action.replace("auth.", "").replace(/_/g, " ")}{a.data?.ip ? <span className="font-mono text-[11px] text-muted"> · {a.data.ip}</span> : null}</span><small className="font-mono text-[11px] text-muted">{t.ago(a.createdAt)}</small></li>)}</ul>
      </Card>
      {setup && <Setup onDone={(c) => { setSetup(false); setCodes(c); reload(); }} onClose={() => setSetup(false)} />}
      {disable && <Disable onClose={() => { setDisable(false); reload(); }} />}
      {codes && <Codes codes={codes} onClose={() => setCodes(null)} />}
    </div>
  );
}

function Setup({ onDone, onClose }: { onDone: (codes: string[]) => void; onClose: () => void }) {
  const toast = useToast();
  const [s, setS] = useState<{ secret: string; qrSvg: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { api("/api/account/security/2fa/setup", { body: {} }).then(setS).catch((e) => toast(e.message, "err")); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open onClose={onClose} title="Turn on two-step sign-in" footer={<Button variant="pri" loading={busy} disabled={code.length < 6} onClick={async () => { setBusy(true); try { const r = await api("/api/account/security/2fa/enable", { body: { code } }); onDone(r.recoveryCodes); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}>Confirm</Button>}>
      {!s ? <Loading /> : (
        <div className="space-y-4">
          <ol className="list-decimal space-y-1 ps-5 text-[13px]"><li>Open your authenticator app and add an account.</li><li>Scan this code, or type the key below.</li><li>Enter the 6-digit code the app shows.</li></ol>
          {/* QR is generated server-side by the qrcode library from our own otpauth URI */}
          <div className="mx-auto w-48 rounded-2xl border border-line bg-white p-3" dangerouslySetInnerHTML={{ __html: s.qrSvg }} />
          <div className="flex gap-2"><Input readOnly value={s.secret} className="font-mono text-xs" /><Button onClick={async () => { if (await copyText(s.secret)) toast("Copied"); }}><Copy className="h-4 w-4" /></Button></div>
          <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="text-center font-mono text-2xl tracking-[0.4em]" />
        </div>
      )}
    </Modal>
  );
}

function Disable({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [v, setV] = useState({ password: "", code: "" });
  return (
    <Modal open onClose={onClose} title="Turn off two-step sign-in" footer={<Button variant="danger" onClick={async () => { try { await api("/api/account/security/2fa/disable", { body: v }); toast("Two-step sign-in is off"); onClose(); } catch (e: any) { toast(e.message, "err"); } }}>Turn off</Button>}>
      <div className="space-y-3">
        <Callout tone="warn">Your account will only be protected by your password.</Callout>
        <Field label="Password"><Input type="password" autoComplete="current-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /></Field>
        <Field label="Code from your app, or a recovery code"><Input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.trim() })} className="font-mono" /></Field>
      </div>
    </Modal>
  );
}

function RegenCodes({ onCodes }: { onCodes: (c: string[]) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  return (<>
    <Button variant="ghost" onClick={() => setOpen(true)}>New recovery codes</Button>
    <Modal open={open} onClose={() => setOpen(false)} title="New recovery codes" footer={<Button variant="pri" onClick={async () => { try { const r = await api("/api/account/security/2fa/recovery", { body: { code } }); setOpen(false); onCodes(r.recoveryCodes); } catch (e: any) { toast(e.message, "err"); } }}>Create new codes</Button>}>
      <p className="mb-3 text-[13px] text-muted">Your old codes will stop working. Enter a code from your authenticator app to continue.</p>
      <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" className="text-center font-mono text-xl tracking-[0.3em]" />
    </Modal>
  </>);
}

function Codes({ codes, onClose }: { codes: string[]; onClose: () => void }) {
  const toast = useToast();
  const text = `OENOD recovery codes\nEach code works once. Keep them somewhere safe.\n\n${codes.join("\n")}\n`;
  return (
    <Modal open onClose={onClose} title="Save your recovery codes" footer={<Button variant="pri" onClick={onClose}>I've saved them</Button>}>
      <Callout tone="warn">If you lose your phone, these codes are the only way into your account. Each one works once. They won't be shown again.</Callout>
      <div className="my-4 grid grid-cols-2 gap-2 rounded-2xl bg-bg p-4 font-mono text-sm">{codes.map((c) => <span key={c}>{c}</span>)}</div>
      <div className="flex gap-2">
        <Button onClick={async () => { if (await copyText(codes.join("\n"))) toast("Copied"); }}><Copy className="h-4 w-4" />Copy</Button>
        <Button onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = "oenod-recovery-codes.txt"; a.click(); }}><Download className="h-4 w-4" />Download</Button>
      </div>
    </Modal>
  );
}
