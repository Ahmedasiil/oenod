"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, ExternalLink, ShieldCheck, ShieldAlert, Users, Mail, Plus, X, CreditCard, Check, Upload, Clock } from "lucide-react";
import { LOCALES } from "@oenod/i18n";
import { MODULES } from "@/lib/modules";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { ResourceTable } from "@/components/resource";
import { ImageInput } from "@/components/upload";
import { VerifiedTick } from "@/components/logo";
import { Avatar, Badge, Button, Callout, Card, ConfirmButton, Field, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea, Toggle, cx, useToast } from "@/components/ui";

type Tab = "company" | "profile" | "team" | "locations" | "modules" | "security" | "billing";
const COUNTRIES = ["CA", "US", "GB", "IE", "AU", "NZ", "FR", "DE", "ES", "IT", "PT", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "PL", "AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "MA", "TN", "TR", "IN", "PK", "SG", "MY", "PH", "ID", "JP", "KR", "CN", "HK", "MX", "BR", "AR", "CL", "CO", "ZA", "NG", "KE"];
const CURRENCIES = ["CAD", "USD", "EUR", "GBP", "AUD", "NZD", "CHF", "SEK", "NOK", "DKK", "PLN", "AED", "SAR", "QAR", "KWD", "EGP", "MAD", "TRY", "INR", "PKR", "SGD", "MYR", "PHP", "JPY", "KRW", "CNY", "HKD", "MXN", "BRL", "ZAR", "NGN", "KES"];

export default function Settings() {
  const sp = useSearchParams();
  const s = useSession();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) || "company");
  const admin = ["OWNER", "ADMIN"].includes(s.role ?? "");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Platform" title="Settings" sub="Company details, your public profile, who can do what, security and billing." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { key: "company", label: "Company" }, { key: "profile", label: "Public profile" }, { key: "team", label: "Team & access" }, { key: "locations", label: "Locations & taxes" },
        { key: "modules", label: "Modules" }, { key: "security", label: "Security" }, ...(admin ? [{ key: "billing" as Tab, label: "Billing" }] : []),
      ]} />
      {tab === "company" && <Company />}
      {tab === "profile" && <Profile />}
      {tab === "team" && <Team />}
      {tab === "locations" && <div className="space-y-6"><ResourceTable resource="locations" /><ResourceTable resource="taxrates" /></div>}
      {tab === "modules" && <Modules />}
      {tab === "security" && <Security />}
      {tab === "billing" && <Billing />}
    </div>
  );
}

function useSave() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return { busy, run: async (fn: () => Promise<unknown>, msg = "Saved") => { setBusy(true); try { await fn(); toast(msg); return true; } catch (e: any) { toast(e.message, "err"); return false; } finally { setBusy(false); } } };
}

// ───────────── Company
function Company() {
  const { data } = useApi<any>("/api/settings/org");
  const [v, setV] = useState<any>(null);
  const { busy, run } = useSave();
  useEffect(() => { if (data) setV(data); }, [data]);
  if (!v) return <Loading />;
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [v.timezone];
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => api("/api/settings/org", { method: "PATCH", body: { name: v.name, industry: v.industry, country: v.country, region: v.region || null, currency: v.currency, timezone: v.timezone, locale: v.locale, brandColor: v.brandColor, phone: v.phone || null, aiDefaultAutonomy: v.aiDefaultAutonomy } })).then((ok) => ok && setTimeout(() => location.reload(), 400)); }} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card title="Company details">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="Industry"><Input value={v.industry ?? ""} onChange={(e) => setV({ ...v, industry: e.target.value })} /></Field>
          <Field label="Country"><Select value={v.country} onChange={(e) => setV({ ...v, country: e.target.value })} options={COUNTRIES.map((c) => ({ value: c, label: names.of(c) ?? c }))} /></Field>
          <Field label="Province or state" help="Used for payroll and tax rules, e.g. ON or CA."><Input value={v.region ?? ""} onChange={(e) => setV({ ...v, region: e.target.value.toUpperCase() })} maxLength={10} /></Field>
          <Field label="Currency"><Select value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })} options={CURRENCIES} /></Field>
          <Field label="Time zone"><Select value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })} options={zones} /></Field>
          <Field label="Default language" help="For new employees, emails and documents."><Select value={v.locale} onChange={(e) => setV({ ...v, locale: e.target.value })} options={LOCALES.map((l) => ({ value: l.code, label: l.native }))} /></Field>
          <Field label="Phone"><Input value={v.phone ?? ""} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
        </div>
      </Card>
      <div className="space-y-4">
        <Card title="Brand">
          <Field label="Brand colour" help="Used on your documents, invoices and public page. OENOD's logo always appears too."><div className="flex items-center gap-2"><input type="color" value={v.brandColor} onChange={(e) => setV({ ...v, brandColor: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-line" /><Input value={v.brandColor} onChange={(e) => setV({ ...v, brandColor: e.target.value })} className="font-mono" /></div></Field>
          <p className="mt-2 text-xs text-muted">Upload your logo on the <b>Public profile</b> tab.</p>
        </Card>
        <Card title="AI default">
          <Select value={v.aiDefaultAutonomy} onChange={(e) => setV({ ...v, aiDefaultAutonomy: e.target.value })} options={[{ value: "ASSIST", label: "Suggest only" }, { value: "APPROVE", label: "Ask me first (recommended)" }, { value: "AUTO", label: "Do it automatically" }]} />
          <p className="mt-2 text-xs text-muted">Payroll, payments, marketing sends and access changes always need a person, whatever you choose.</p>
        </Card>
        <Button variant="pri" type="submit" loading={busy} className="w-full">Save changes</Button>
      </div>
    </form>
  );
}

// ───────────── Public profile + verification
function Profile() {
  const s = useSession();
  const { data, reload } = useApi<{ data: any }>("/api/company/profile");
  const verif = useApi<any>("/api/verification");
  const [v, setV] = useState<any>(null);
  const [verify, setVerify] = useState(false);
  const { busy, run } = useSave();
  useEffect(() => { if (data) setV({ ...data.data, servicesText: (data.data.services ?? []).join(", ") }); }, [data]);
  if (!v) return <Loading />;
  const set = (k: string, val: any) => setV((x: any) => ({ ...x, [k]: val }));
  const status = verif.data?.status ?? s.org?.verificationStatus;
  const save = () => run(async () => {
    const { servicesText, verificationStatus: _v, followers: _f, ...rest } = v;
    const allowed = ["name", "slug", "industry", "tagline", "about", "email", "phone", "website", "logoUrl", "coverUrl", "brandColor", "address", "hours", "services", "gallery", "social", "foundedYear", "teamSize", "publicProfile"];
    const payload = Object.fromEntries(Object.entries({ ...rest, services: servicesText.split(",").map((x: string) => x.trim()).filter(Boolean) }).filter(([k]) => allowed.includes(k)));
    await api("/api/company/profile", { method: "PATCH", body: payload });
    reload();
  });
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <Card title="How customers and job seekers see you" action={v.publicProfile && <a href={`/c/${v.slug}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-blue">View page <ExternalLink className="h-3.5 w-3.5" /></a>}>
          <div className="space-y-4">
            <Field label="Cover image"><ImageInput value={v.coverUrl} onChange={(u) => set("coverUrl", u)} kind="COVER" shape="wide" label="Cover" /></Field>
            <Field label="Logo"><ImageInput value={v.logoUrl} onChange={(u) => set("logoUrl", u)} kind="LOGO" label="Logo" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Public name"><Input value={v.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Profile address" help={`oenod.com/c/${v.slug}`}><Input value={v.slug} onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} /></Field>
              <Field label="Tagline" className="sm:col-span-2"><Input value={v.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} maxLength={160} /></Field>
              <Field label="About" className="sm:col-span-2"><Textarea value={v.about ?? ""} onChange={(e) => set("about", e.target.value)} className="min-h-[120px]" /></Field>
              <Field label="Services" help="Separate with commas" className="sm:col-span-2"><Input value={v.servicesText} onChange={(e) => set("servicesText", e.target.value)} /></Field>
              <Field label="Public email"><Input type="email" value={v.email ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Phone"><Input value={v.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Website"><Input value={v.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
              <Field label="Team size"><Select value={v.teamSize ?? ""} onChange={(e) => set("teamSize", e.target.value || null)} options={["1-10", "11-50", "51-200", "201-500", "500+"]} placeholder="—" /></Field>
              <Field label="Street address"><Input value={v.address?.line1 ?? ""} onChange={(e) => set("address", { ...(v.address ?? {}), line1: e.target.value })} /></Field>
              <Field label="City"><Input value={v.address?.city ?? ""} onChange={(e) => set("address", { ...(v.address ?? {}), city: e.target.value })} /></Field>
            </div>
          </div>
        </Card>
        <div className="flex items-center justify-between gap-3">
          <Toggle checked={v.publicProfile} onChange={(x) => set("publicProfile", x)} label="Show my company in the OENOD directory" help="Your jobs are always public. This lists your page in search." />
          <Button variant="pri" loading={busy} onClick={save}>Save profile</Button>
        </div>
      </div>
      <div className="space-y-4">
        <div className={cx("overflow-hidden rounded-2xl border p-5", status === "VERIFIED" ? "border-[#BFD0FF] bg-sky" : "navy-panel border-transparent text-white")}>
          <div className="flex items-center gap-2"><VerifiedTick className="h-[22px] w-[22px]" /><b className="font-display text-lg">{status === "VERIFIED" ? "Verified business" : "Get the blue badge"}</b></div>
          <p className={cx("mt-2 text-[13px] leading-5", status === "VERIFIED" ? "text-navy" : "text-white/80")}>
            {status === "VERIFIED" ? "Your badge shows on your profile, jobs, ads and certificates." : status === "PENDING" ? "We're checking your details. This usually takes less than a day." : status === "NEEDS_INFO" ? "We need a little more information. Open the request to see what's missing." : status === "REJECTED" ? "We couldn't verify your company. You can try again with updated documents." : "Verified companies get more applicants and more trust from customers. We check your registration, address and contact details."}
          </p>
          {status !== "VERIFIED" && status !== "PENDING" && ["OWNER", "ADMIN"].includes(s.role ?? "") && <Button className="mt-3" onClick={() => setVerify(true)}><BadgeCheck className="h-4 w-4" />{status === "NEEDS_INFO" || status === "REJECTED" ? "Update request" : "Verify my company"}</Button>}
          {verif.data?.request?.aiReport?.summary && (status === "NEEDS_INFO" || status === "REJECTED") && <p className="mt-3 rounded-xl bg-white/10 p-3 text-xs">{verif.data.request.aiReport.summary}</p>}
        </div>
        <Card title="Preview">
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="h-20 bg-gradient-to-br from-navy to-blue" style={v.coverUrl ? { backgroundImage: `url(${v.coverUrl})`, backgroundSize: "cover" } : {}} />
            <div className="-mt-7 px-4 pb-4">
              {v.logoUrl ? <img src={v.logoUrl} alt="" className="h-14 w-14 rounded-xl border-2 border-white bg-white object-contain" /> : <span className="grid h-14 w-14 place-items-center rounded-xl border-2 border-white bg-navy font-display text-lg font-bold text-white">{v.name[0]}</span>}
              <b className="mt-2 flex items-center gap-1 font-display">{v.name}{status === "VERIFIED" && <VerifiedTick />}</b>
              <p className="text-xs text-muted">{v.tagline || v.industry}</p>
            </div>
          </div>
        </Card>
      </div>
      {verify && <VerifyModal onClose={() => { setVerify(false); verif.reload(); }} />}
    </div>
  );
}

function VerifyModal({ onClose }: { onClose: () => void }) {
  const s = useSession();
  const toast = useToast();
  const [v, setV] = useState<any>({ legalName: s.org?.name ?? "", businessNumber: "", registry: "", country: "CA", address: { line1: "", city: "", region: "", postalCode: "", country: "CA" }, website: "", phone: "", contactName: s.user.name, contactTitle: "", domainEmail: "", documentIds: [] as string[], attest: false });
  const [docs, setDocs] = useState<{ id: string; name: string }[]>([]);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((x: any) => ({ ...x, [k]: val }));
  const addr = (k: string, val: string) => setV((x: any) => ({ ...x, address: { ...x.address, [k]: val } }));
  const upload = async (f: File) => { const fd = new FormData(); fd.append("file", f); fd.append("kind", "CERTIFICATE"); const r = await fetch("/api/verification/documents", { method: "POST", body: fd }); const j = await r.json(); if (!r.ok) return toast(j.error, "err"); setDocs((d) => [...d, j]); set("documentIds", [...v.documentIds, j.id]); };
  const submit = async () => { setBusy(true); try { const r = await api("/api/verification", { body: { ...v, address: { ...v.address, country: v.country } } }); if (r.needsEmailCode) setCode(""); else { toast("Submitted. We'll email you when it's done."); onClose(); } } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  const confirm = async () => { setBusy(true); try { await api("/api/verification/email", { body: { code } }); toast("Email confirmed. We're checking your details now."); onClose(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} wide title="Verify your company" footer={code !== null ? <Button variant="pri" loading={busy} onClick={confirm} disabled={(code ?? "").length !== 6}>Confirm code</Button> : <Button variant="pri" loading={busy} disabled={!v.attest} onClick={submit}>Submit for verification</Button>}>
      {code !== null ? (
        <div className="space-y-3"><Callout>We sent a 6-digit code to <b>{v.domainEmail}</b>. Enter it to prove you own the company's email domain.</Callout><Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" className="text-center font-mono text-2xl tracking-[0.4em]" /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Legal company name"><Input value={v.legalName} onChange={(e) => set("legalName", e.target.value)} /></Field>
            <Field label="Business or registration number" help="e.g. CRA BN, EIN, Companies House number"><Input value={v.businessNumber} onChange={(e) => set("businessNumber", e.target.value)} /></Field>
            <Field label="Country"><Select value={v.country} onChange={(e) => set("country", e.target.value)} options={COUNTRIES} /></Field>
            <Field label="Registry (optional)"><Input value={v.registry} onChange={(e) => set("registry", e.target.value)} placeholder="e.g. Ontario Business Registry" /></Field>
            <Field label="Street address"><Input value={v.address.line1} onChange={(e) => addr("line1", e.target.value)} /></Field>
            <Field label="City"><Input value={v.address.city} onChange={(e) => addr("city", e.target.value)} /></Field>
            <Field label="Province / state"><Input value={v.address.region} onChange={(e) => addr("region", e.target.value)} /></Field>
            <Field label="Postal code"><Input value={v.address.postalCode} onChange={(e) => addr("postalCode", e.target.value)} /></Field>
            <Field label="Business phone"><Input value={v.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Website"><Input value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
            <Field label="Your name"><Input value={v.contactName} onChange={(e) => set("contactName", e.target.value)} /></Field>
            <Field label="Your title"><Input value={v.contactTitle} onChange={(e) => set("contactTitle", e.target.value)} /></Field>
            <Field label="Email at your company domain (recommended)" help="We'll send a code to confirm it." className="sm:col-span-2"><Input type="email" value={v.domainEmail} onChange={(e) => set("domainEmail", e.target.value)} placeholder="you@yourcompany.com" /></Field>
          </div>
          <div>
            <b className="text-[13px]">Supporting documents</b>
            <p className="text-xs text-muted">Articles of incorporation, business licence or a recent utility bill. PDF or image, up to 10 MB.</p>
            <ul className="mt-2 space-y-1 text-[13px]">{docs.map((d) => <li key={d.id} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-ok" />{d.name}</li>)}</ul>
            <label className="btn btn-sm mt-2 cursor-pointer"><Upload className="h-3.5 w-3.5" />Add document<input type="file" hidden accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} /></label>
          </div>
          <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5" checked={v.attest} onChange={(e) => set("attest", e.target.checked)} />I confirm I'm authorised to act for this company and the information is accurate.</label>
        </div>
      )}
    </Modal>
  );
}

// ───────────── Team & access
const ROLE_HELP: Record<string, string> = { OWNER: "Everything, including billing and ownership", ADMIN: "Everything except handing over ownership", MANAGER: "Runs teams and operations, no payroll or accounting", FINANCE: "Money, payroll and reports", ACCOUNTANT: "Books and reports only", EMPLOYEE: "Their own schedule, time, pay and training" };

function Team() {
  const t = useT();
  const s = useSession();
  const { data, loading, reload } = useApi<any>("/api/settings/team");
  const [invite, setInvite] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  if (loading && !data) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted"><Users className="me-1 inline h-4 w-4" />{data.seats.used}{data.seats.included ? ` of ${data.seats.included}` : ""} seats used</p>
        <Button variant="pri" onClick={() => setInvite(true)}><Plus className="h-4 w-4" />Invite people</Button>
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Person</th><th>Role</th><th>Two-step sign-in</th><th>Last seen</th><th /></tr></thead>
          <tbody>{data.members.map((m: any) => (
            <tr key={m.id}>
              <td><span className="flex items-center gap-2.5"><Avatar name={m.user.name} src={m.user.avatarUrl} size={32} /><span><b className="block">{m.user.name}{m.user.id === s.user.id && <span className="ms-1 text-xs font-normal text-muted">(you)</span>}</b><small className="text-xs text-muted">{m.user.email}</small></span></span></td>
              <td><Badge tone={m.role === "OWNER" ? "navy" : "blue"}>{m.role[0] + m.role.slice(1).toLowerCase()}</Badge>{m.title && <small className="ms-2 text-xs text-muted">{m.title}</small>}</td>
              <td>{m.user.twoFactor ? <span className="inline-flex items-center gap-1 text-xs font-bold text-ok"><ShieldCheck className="h-3.5 w-3.5" />On</span> : <span className="inline-flex items-center gap-1 text-xs font-bold text-warn"><ShieldAlert className="h-3.5 w-3.5" />Off</span>}</td>
              <td className="text-muted">{m.user.lastSeenAt ? t.ago(m.user.lastSeenAt) : "never"}</td>
              <td className="text-end"><Button size="sm" variant="ghost" onClick={() => setEdit(m)}>Access</Button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {data.invites.length > 0 && (
        <Card title="Pending invitations" pad={false}>
          <ul className="divide-y divide-line">{data.invites.map((i: any) => <li key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]"><Mail className="h-4 w-4 text-muted" /><span className="flex-1">{i.email}</span><Badge>{i.role}</Badge><small className="text-xs text-muted">expires {t.ago(i.expiresAt)}</small></li>)}</ul>
        </Card>
      )}
      {invite && <InviteModal onClose={() => { setInvite(false); reload(); }} />}
      {edit && <AccessModal m={edit} onClose={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [rows, setRows] = useState([{ email: "", role: "EMPLOYEE" }]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} title="Invite people" footer={<Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { const r = await api("/api/settings/team", { body: { invites: rows.filter((x) => x.email.trim()), message: msg || undefined } }); toast(`${r.invited.length ?? r.invited} invitation(s) sent`); onClose(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}>Send invitations</Button>}>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <Input type="email" placeholder="name@company.com" value={r.email} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
            <Select value={r.role} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} options={Object.keys(ROLE_HELP).filter((k) => k !== "OWNER").map((k) => ({ value: k, label: k[0] + k.slice(1).toLowerCase() }))} className="w-40" />
            {rows.length > 1 && <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="px-1 text-muted" aria-label="Remove"><X className="h-4 w-4" /></button>}
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setRows([...rows, { email: "", role: "EMPLOYEE" }])}><Plus className="h-3.5 w-3.5" />Add another</Button>
        <Field label="Personal note (optional)"><Textarea value={msg} onChange={(e) => setMsg(e.target.value)} /></Field>
        <p className="text-xs text-muted">They get a link to join. Nobody is ever sent a password by email.</p>
      </div>
    </Modal>
  );
}

function AccessModal({ m, onClose }: { m: any; onClose: () => void }) {
  const s = useSession();
  const toast = useToast();
  const [role, setRole] = useState(m.role);
  const [title, setTitle] = useState(m.title ?? "");
  const [grants, setGrants] = useState<Record<string, string>>(m.grants ?? {});
  const [busy, setBusy] = useState(false);
  const level = (k: string) => grants[k] ?? m.access[k] ?? "none";
  const canRole = ["OWNER", "ADMIN"].includes(s.role ?? "") && m.user.id !== s.user.id;
  return (
    <Modal open onClose={onClose} wide title={`Access for ${m.user.name}`}
      footer={<>
        {m.user.id !== s.user.id && m.role !== "OWNER" && <ConfirmButton confirmLabel="Remove from company" onConfirm={async () => { try { await api(`/api/settings/team/${m.id}`, { method: "DELETE" }); toast("Removed"); onClose(); } catch (e: any) { toast(e.message, "err"); } }}>Remove</ConfirmButton>}
        <Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { await api(`/api/settings/team/${m.id}`, { method: "PATCH", body: { ...(canRole && role !== m.role ? { role } : {}), title: title || null, grants } }); toast("Access updated"); onClose(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } }}>Save</Button>
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Role" help={ROLE_HELP[role]}><Select value={role} disabled={!canRole} onChange={(e) => { setRole(e.target.value); setGrants({}); }} options={Object.keys(ROLE_HELP).map((k) => ({ value: k, label: k[0] + k.slice(1).toLowerCase() }))} /></Field>
          <Field label="Job title"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        </div>
        <div>
          <b className="text-[13px]">Module access</b>
          <p className="text-xs text-muted">Start from the role, then give or take away access per module. This also controls what they see in the mobile app.</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {MODULES.filter((x) => x.key !== "overview").map((x) => (
              <div key={x.key} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                <span className="text-[13px] font-semibold">{x.name}</span>
                <div className="flex rounded-lg bg-bg p-0.5">{(["none", "view", "edit"] as const).map((l) => <button key={l} type="button" onClick={() => setGrants({ ...grants, [x.key]: l })} className={cx("rounded-md px-2 py-1 text-[11px] font-bold", level(x.key) === l ? (l === "none" ? "bg-white text-crit shadow-sm" : "bg-navy text-white") : "text-muted")}>{l === "none" ? "Off" : l === "view" ? "View" : "Edit"}</button>)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ───────────── Modules on/off
function Modules() {
  const { data } = useApi<any>("/api/settings/org");
  const [on, setOn] = useState<string[] | null>(null);
  const { busy, run } = useSave();
  useEffect(() => { if (data) setOn(data.modules); }, [data]);
  if (!on) return <Loading />;
  const groups = Array.from(new Set(MODULES.map((m) => m.group)));
  return (
    <div className="space-y-4">
      <Callout>Turn off what you don't use to keep things simple. Nothing is deleted: turn a module back on and everything is still there.</Callout>
      {groups.map((g) => (
        <Card key={g} title={g}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.filter((m) => m.group === g).map((m) => {
              const locked = ["overview", "settings"].includes(m.key);
              return <label key={m.key} className={cx("flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition", on.includes(m.key) ? "border-[#BFD0FF] bg-sky/50" : "border-line")}>
                <input type="checkbox" className="mt-1" disabled={locked} checked={on.includes(m.key)} onChange={(e) => setOn(e.target.checked ? [...on, m.key] : on.filter((k) => k !== m.key))} />
                <span><b className="block text-[13.5px]">{m.name}</b><small className="text-xs text-muted">{m.tagline}</small></span>
              </label>;
            })}
          </div>
        </Card>
      ))}
      <div className="flex justify-end"><Button variant="pri" loading={busy} onClick={() => run(() => api("/api/settings/org", { method: "PATCH", body: { modules: on } })).then((ok) => ok && setTimeout(() => location.reload(), 400))}>Save modules</Button></div>
    </div>
  );
}

// ───────────── Security
function Security() {
  const t = useT();
  const s = useSession();
  const { data, reload } = useApi<any>("/api/security/overview");
  const [p, setP] = useState<any>(null);
  const { busy, run } = useSave();
  useEffect(() => { if (data) setP({ ...data.policy, ipText: (data.policy.ipAllowlist ?? []).join("\n") }); }, [data]);
  if (!data || !p) return <Loading />;
  const admin = ["OWNER", "ADMIN"].includes(s.role ?? "");
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="navy-panel flex flex-wrap items-center gap-5 rounded-2xl p-6 text-white">
          <div className="relative grid h-24 w-24 place-items-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="3" /><circle cx="18" cy="18" r="15.5" fill="none" stroke="#7EA2FF" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${data.score * 0.974} 100`} /></svg>
            <b className="font-display text-3xl">{data.score}</b>
          </div>
          <div className="min-w-0 flex-1"><small className="font-mono text-[11px] uppercase tracking-widest text-white/60">Security score</small><b className="block font-display text-2xl">{data.grade}</b><p className="text-[13px] text-white/75">{data.stats.failedSignins30d} failed sign-ins in 30 days · {data.stats.activeSessions} active sessions · {data.stats.apiKeys} API keys</p></div>
        </div>
        {data.recommendations.length > 0 && <Card title="Recommended"><ul className="space-y-2">{data.recommendations.map((r: any, i: number) => <li key={i} className="flex gap-2 text-[13px]"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" /><span>{typeof r === "string" ? r : <><b>{r.title}</b> {r.detail && <span className="text-muted">{r.detail}</span>}</>}</span></li>)}</ul></Card>}
        <Card title="People" pad={false}>
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>Name</th><th>Role</th><th>Two-step</th><th>Last seen</th></tr></thead>
            <tbody>{data.people.map((x: any) => <tr key={x.userId}><td><b>{x.name}</b>{x.locked && <Badge tone="crit" className="ms-2">Locked</Badge>}<small className="block text-xs text-muted">{x.email}</small></td><td>{x.role}</td><td>{x.twoFactor ? <Check className="h-4 w-4 text-ok" /> : <X className="h-4 w-4 text-warn" />}</td><td className="text-muted">{x.lastSeenAt ? t.ago(x.lastSeenAt) : "never"}</td></tr>)}</tbody>
          </table></div>
        </Card>
        {data.recentSensitiveChanges?.length > 0 && <Card title="Sensitive changes"><ul className="space-y-1.5 text-[13px]">{data.recentSensitiveChanges.map((c: any, i: number) => <li key={i} className="flex gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" /><span><b>{c.action}</b> <small className="text-muted">{t.ago(c.createdAt)}</small></span></li>)}</ul></Card>}
      </div>
      <div className="space-y-4">
        <Card title="Company policy">
          <div className="space-y-3">
            <Toggle disabled={!admin} checked={!!p.require2fa} onChange={(x) => setP({ ...p, require2fa: x })} label="Require two-step sign-in for everyone" help={!s.user.twoFactor ? "Turn it on for your own account first." : undefined} />
            <Toggle disabled={!admin} checked={!!p.alertOnNewDevice} onChange={(x) => setP({ ...p, alertOnNewDevice: x })} label="Email people when they sign in on a new device" />
            <Field label="Stay signed in for (days)"><Input type="number" min={1} max={30} disabled={!admin} value={p.sessionDays} onChange={(e) => setP({ ...p, sessionDays: Number(e.target.value) })} /></Field>
            <Field label="Minimum password length"><Input type="number" min={10} max={64} disabled={!admin} value={p.passwordMinLength} onChange={(e) => setP({ ...p, passwordMinLength: Number(e.target.value) })} /></Field>
            <Field label="Only allow these networks" help="One IP or range per line, e.g. 203.0.113.0/24. Leave empty to allow anywhere."><Textarea disabled={!admin} value={p.ipText} onChange={(e) => setP({ ...p, ipText: e.target.value })} className="font-mono text-xs" /></Field>
            {admin && <Button variant="pri" className="w-full" loading={busy} onClick={() => run(() => api("/api/settings/security", { method: "PUT", body: { require2fa: !!p.require2fa, alertOnNewDevice: !!p.alertOnNewDevice, sessionDays: p.sessionDays, passwordMinLength: p.passwordMinLength, ipAllowlist: p.ipText.split(/\s+/).filter(Boolean) } }).then(reload))}>Save policy</Button>}
          </div>
        </Card>
        <Card title="Always on">
          <ul className="space-y-2">{data.protections.map((x: any) => <li key={x.name} className="flex gap-2 text-[13px]">{x.on ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ok" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}<span className={x.on ? "" : "text-muted"}>{x.name}</span></li>)}</ul>
        </Card>
        <Link href="/app/account/security" className="btn w-full">Your own sign-in security →</Link>
      </div>
    </div>
  );
}

// ───────────── Billing
function Billing() {
  const t = useT();
  const s = useSession();
  const toast = useToast();
  const plans = useApi<any[]>("/api/plans");
  const [yearly, setYearly] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const go = async (path: string, body: any, key: string) => { setBusy(key); try { const r = await api(path, { body }); location.href = r.url; } catch (e: any) { toast(e.message, "err"); setBusy(null); } };
  const trialDays = s.org?.trialEndsAt ? Math.max(0, Math.ceil((new Date(s.org.trialEndsAt).getTime() - Date.now()) / 864e5)) : null;
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-sky text-navy"><CreditCard className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><b className="font-display text-lg">{s.org?.plan ? `${s.org.plan[0]}${s.org.plan.slice(1).toLowerCase()} plan` : "No plan yet"}</b><p className="text-sm text-muted">{s.org?.status === "TRIALING" && trialDays != null ? `Free trial: ${trialDays} days left` : s.org?.status === "PAST_DUE" ? "Your last payment didn't go through." : s.org?.status === "ACTIVE" ? "Active" : s.org?.status}</p></div>
        <Button loading={busy === "portal"} onClick={() => go("/api/billing/portal", {}, "portal")}>Invoices and payment method</Button>
      </div>
      <div className="flex items-center justify-center gap-3 text-sm font-semibold"><span className={!yearly ? "text-ink" : "text-muted"}>Monthly</span><Toggle checked={yearly} onChange={setYearly} /><span className={yearly ? "text-ink" : "text-muted"}>Yearly <Badge tone="ok">2 months free</Badge></span></div>
      {!plans.data ? <Loading /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {plans.data.map((p) => {
            const current = p.key === s.org?.plan;
            return (
              <div key={p.key} className={cx("card flex flex-col p-5", p.key === "GROWTH" && "ring-2 ring-blue")}>
                <b className="font-display text-lg">{p.name}</b>
                <p className="min-h-[40px] text-xs text-muted">{p.tagline}</p>
                <div className="my-3"><b className="font-display text-3xl">{t.money((yearly ? p.priceYearly / 12 : p.priceMonthly) / 100, "USD")}</b><span className="text-sm text-muted"> /month</span></div>
                <ul className="mb-4 flex-1 space-y-1.5 text-[13px]">{[`${p.seats} people included`, `${t.num(p.aiCredits)} AI actions a month`, ...p.features.slice(0, 6)].map((f: string) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />{f}</li>)}</ul>
                <Button variant={current ? "default" : "pri"} disabled={current} loading={busy === p.key} onClick={() => go("/api/billing/checkout", { plan: p.key, interval: yearly ? "year" : "month" }, p.key)}>{current ? "Current plan" : "Choose " + p.name}</Button>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-center text-xs text-muted">Prices in USD, before tax. Payments are handled securely by Stripe. Cancel any time.</p>
    </div>
  );
}
