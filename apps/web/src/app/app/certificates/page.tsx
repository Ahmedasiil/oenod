"use client";
import { useState } from "react";
import { Award, Copy, Download, ExternalLink, Plus, Search, Ban, RotateCcw } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useT } from "@/components/i18n";
import { Badge, Button, Callout, ConfirmButton, Empty, Field, Input, Loading, Modal, PageHeader, Select, Textarea, Toggle, copyText, cx, useToast } from "@/components/ui";

const KINDS = [
  { value: "COMPLETION", label: "Completion" }, { value: "ACHIEVEMENT", label: "Achievement" }, { value: "APPRECIATION", label: "Appreciation" },
  { value: "SAFETY", label: "Safety training" }, { value: "PARTICIPATION", label: "Participation" }, { value: "EXCELLENCE", label: "Award of excellence" },
];

export default function Certificates() {
  const t = useT();
  const [q, setQ] = useState("");
  const { data, loading, reload } = useApi<{ data: any[] }>(`/api/certificates/manage${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  const [issue, setIssue] = useState(false);
  const [view, setView] = useState<any>(null);
  const rows = data?.data ?? [];
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Grow" title="Certificates" sub="Issue professional certificates to your team or anyone you train. Each one carries the OENOD seal with your logo, a unique ID and a QR code anyone can scan to confirm it's genuine."
        actions={<Button variant="pri" onClick={() => setIssue(true)}><Plus className="h-4 w-4" />Issue certificates</Button>} />
      <div className="relative max-w-sm"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, title or ID" className="ps-9" /></div>
      {loading && !data ? <Loading rows={4} /> : !rows.length ? (
        <Empty icon={<Award className="h-5 w-5" />} title={q ? "No matches" : "No certificates yet"} body="Certificates are also issued automatically when someone finishes an Academy course." action={!q && <Button variant="pri" onClick={() => setIssue(true)}>Issue your first certificate</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <button key={c.id} onClick={() => setView(c)} className="card group overflow-hidden text-start transition hover:shadow-lift">
              <div className="aspect-[1.414] w-full overflow-hidden bg-navy"><img src={c.imageUrl} alt="" loading="lazy" className={cx("h-full w-full object-cover transition group-hover:scale-[1.02]", c.revokedAt && "opacity-40 grayscale")} /></div>
              <div className="flex items-start gap-2 p-3">
                <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px]">{c.recipientName}</b><small className="block truncate text-xs text-muted">{c.title} · {t.date(c.issuedAt)}</small></span>
                {c.revokedAt ? <Badge tone="crit">Revoked</Badge> : c.expiresAt && new Date(c.expiresAt) < new Date() ? <Badge tone="warn">Expired</Badge> : <span className="font-mono text-[10.5px] text-muted">{c.code}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
      {issue && <Issue onClose={() => { setIssue(false); reload(); }} />}
      {view && <View c={view} onClose={() => { setView(null); reload(); }} />}
    </div>
  );
}

function Issue({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const people = useApi<{ data: any[] }>("/api/v1/employees?status=ACTIVE&limit=500");
  const [v, setV] = useState({ kind: "COMPLETION", title: "", description: "", hours: "", signerName: "", signerTitle: "", expiresAt: "", sendEmail: true });
  const [picked, setPicked] = useState<string[]>([]);
  const [others, setOthers] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any[] | null>(null);
  const set = (k: string, x: any) => setV((s) => ({ ...s, [k]: x }));
  // "Jane Doe, jane@x.com" per line for people outside the team
  const external = others.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const [name, email] = l.split(",").map((x) => x.trim()); return { name, ...(email ? { email } : {}) }; });
  const total = picked.length + external.length;
  const submit = async () => {
    setBusy(true);
    try {
      const r = await api("/api/certificates/manage", { body: { kind: v.kind, title: v.title, description: v.description || undefined, hours: v.hours ? Number(v.hours) : undefined, signerName: v.signerName || undefined, signerTitle: v.signerTitle || undefined, expiresAt: v.expiresAt || undefined, sendEmail: v.sendEmail, recipients: [...picked.map((employeeId) => ({ employeeId })), ...external] } });
      setDone(r.data);
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  if (done) return (
    <Modal open onClose={onClose} wide title={`${done.length} certificate${done.length === 1 ? "" : "s"} issued`} footer={<Button variant="pri" onClick={onClose}>Done</Button>}>
      <div className="grid gap-3 sm:grid-cols-2">{done.slice(0, 4).map((c) => <img key={c.id} src={c.imageUrl} alt={c.name} className="w-full rounded-xl border border-line" />)}</div>
      {done.length > 4 && <p className="mt-3 text-sm text-muted">…and {done.length - 4} more.</p>}
    </Modal>
  );
  return (
    <Modal open onClose={onClose} wide title="Issue certificates" footer={<Button variant="pri" loading={busy} disabled={!total || v.title.trim().length < 3} onClick={submit}><Award className="h-4 w-4" />Issue {total || ""} certificate{total === 1 ? "" : "s"}</Button>}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label="Type"><Select value={v.kind} onChange={(e) => set("kind", e.target.value)} options={KINDS} /></Field>
          <Field label="Title" required help="What it's for, e.g. Food Safety Level 1 or Employee of the Month."><Input value={v.title} maxLength={120} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Short description (optional)"><Textarea value={v.description} maxLength={240} onChange={(e) => set("description", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hours (optional)"><Input type="number" min={0} value={v.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
            <Field label="Expires (optional)"><Input type="date" value={v.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></Field>
            <Field label="Signed by"><Input value={v.signerName} placeholder="Your name" onChange={(e) => set("signerName", e.target.value)} /></Field>
            <Field label="Signer title"><Input value={v.signerTitle} placeholder="General Manager" onChange={(e) => set("signerTitle", e.target.value)} /></Field>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-[13px]"><span><b className="block">Email each person their certificate</b><small className="text-muted">Only people with an email address</small></span><Toggle checked={v.sendEmail} onChange={(x) => set("sendEmail", x)} /></label>
        </div>
        <div className="space-y-3">
          <Field label={`Your team (${picked.length} selected)`}>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-line">
              {!people.data ? <Loading /> : <>
                <label className="flex items-center gap-2 border-b border-line bg-bg px-3 py-2 text-xs font-bold"><input type="checkbox" checked={picked.length === people.data.data.length && picked.length > 0} onChange={(e) => setPicked(e.target.checked ? people.data!.data.map((p) => p.id) : [])} />Select everyone</label>
                {people.data.data.map((p) => <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-bg"><input type="checkbox" checked={picked.includes(p.id)} onChange={() => setPicked((s) => s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id])} /><span className="flex-1">{p.firstName} {p.lastName}</span><small className="text-muted">{p.jobTitle ?? ""}</small></label>)}
              </>}
            </div>
          </Field>
          <Field label="People outside your team" help="One per line: Name, email (email optional)"><Textarea rows={4} value={others} onChange={(e) => setOthers(e.target.value)} placeholder={"Maya Chen, maya@example.com\nOmar Haddad"} /></Field>
          <Callout title="How it looks">Navy certificate with the OENOD seal first and your company logo beside it, the person's name, your signer, a unique ID and a QR code to verify it.</Callout>
        </div>
      </div>
    </Modal>
  );
}

function View({ c, onClose }: { c: any; onClose: () => void }) {
  const t = useT();
  const toast = useToast();
  const [reason, setReason] = useState("");
  const act = async (action: "revoke" | "restore") => { try { await api(`/api/certificates/manage/${c.id}`, { method: "PATCH", body: { action, reason: reason || undefined } }); toast(action === "revoke" ? "Certificate revoked" : "Certificate restored"); onClose(); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <Modal open onClose={onClose} wide title={c.title} footer={<>
      {c.revokedAt ? <Button onClick={() => act("restore")}><RotateCcw className="h-4 w-4" />Restore</Button> : <ConfirmButton confirmLabel="Revoke it" onConfirm={() => act("revoke")}><Ban className="h-4 w-4" />Revoke</ConfirmButton>}
      <a className="btn" href={`${c.imageUrl}?download=1`} download><Download className="h-4 w-4" />Download</a>
      <a className="btn btn-pri" href={c.verifyUrl} target="_blank" rel="noopener"><ExternalLink className="h-4 w-4" />Public page</a>
    </>}>
      <img src={c.imageUrl} alt="" className="w-full rounded-2xl border border-line" />
      <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-3">
        <div><small className="block text-muted">Issued to</small><b>{c.recipientName}</b>{c.recipientEmail && <small className="block text-muted">{c.recipientEmail}</small>}</div>
        <div><small className="block text-muted">Issued</small><b>{t.date(c.issuedAt)}</b>{c.expiresAt && <small className="block text-muted">Expires {t.date(c.expiresAt)}</small>}</div>
        <div><small className="block text-muted">Certificate ID</small><button className="flex items-center gap-1 font-mono font-bold" onClick={async () => { if (await copyText(c.verifyUrl)) toast("Verification link copied"); }}>{c.code}<Copy className="h-3.5 w-3.5 text-muted" /></button></div>
      </div>
      {c.revokedAt ? <Callout tone="warn" title={`Revoked ${t.date(c.revokedAt)}`}>{c.revokeReason ?? "Anyone checking this ID sees that it's no longer valid."}</Callout>
        : <div className="mt-4"><Field label="Reason, if you revoke it (shown on the public check)"><Input value={reason} maxLength={240} onChange={(e) => setReason(e.target.value)} /></Field></div>}
    </Modal>
  );
}
