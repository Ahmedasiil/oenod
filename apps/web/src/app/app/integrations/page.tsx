"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plug, Search, CheckCircle2, RefreshCw, Puzzle, Wrench, Plus, ShieldCheck, Copy, Trash2, Play, FileCode2, BadgeCheck } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { Badge, Button, Callout, Card, ConfirmButton, Empty, Field, Input, Loading, Modal, PageHeader, Select, Tabs, Textarea, copyText, cx, useToast } from "@/components/ui";

type Tab = "apps" | "plugins" | "custom";

export default function Integrations() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>((sp.get("tab") as Tab) || "apps");
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Platform" title="Integrations" sub="Connect Google, Microsoft, payments, accounting, ads and anything with an API. Your keys are encrypted and never shown again after you save them." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "apps", label: "Apps" }, { key: "plugins", label: "Plugin marketplace" }, { key: "custom", label: "Connect any API" }]} />
      {tab === "apps" && <Apps />}
      {tab === "plugins" && <Plugins />}
      {tab === "custom" && <Custom />}
    </div>
  );
}

// ───────────── Built-in apps
function Apps() {
  const t = useT();
  const toast = useToast();
  const { data, loading, reload } = useApi<{ data: any[]; gpsIngestUrl: string }>("/api/integrations");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<any>(null);
  const cats = ["All", "Connected", ...Array.from(new Set((data?.data ?? []).map((c) => c.category)))];
  const list = (data?.data ?? []).filter((c) => (cat === "All" || (cat === "Connected" ? c.status === "CONNECTED" : c.category === cat)) && (!q || `${c.name} ${c.description}`.toLowerCase().includes(q.toLowerCase())));
  if (loading && !data) return <Loading rows={6} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 90+ apps" className="ps-9" /></div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={cx("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold", cat === c ? "bg-ink text-white" : "border border-line bg-paper text-[#353C57]")}>{c}</button>)}</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => (
          <button key={c.key} onClick={() => setOpen(c)} className="card flex flex-col gap-3 p-4 text-start transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-base font-bold text-white" style={{ background: c.color }}>{c.name[0]}</span>
              <span className="min-w-0 flex-1"><b className="block truncate text-[14.5px]">{c.name}</b><small className="text-xs text-muted">{c.category}</small></span>
              {c.status === "CONNECTED" ? <Badge tone="ok">Connected</Badge> : c.status === "ERROR" ? <Badge tone="crit">Needs attention</Badge> : c.auth === "builtin" ? <Badge tone="blue">Built in</Badge> : null}
            </div>
            <p className="line-clamp-2 text-[13px] leading-5 text-muted">{c.description}</p>
            {c.lastSyncAt && <small className="font-mono text-[10.5px] text-muted">Synced {t.ago(c.lastSyncAt)}</small>}
          </button>
        ))}
      </div>
      {open && <AppModal c={open} gps={data!.gpsIngestUrl} onClose={() => { setOpen(null); reload(); }} toast={toast} />}
    </div>
  );
}

function AppModal({ c, gps, onClose, toast }: { c: any; gps: string; onClose: () => void; toast: ReturnType<typeof useToast> }) {
  const [v, setV] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const own = useApi<any>(c.auth === "oauth" && !c.available ? `/api/integrations/${c.key}/app` : null);
  const connected = c.status === "CONNECTED";
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); try { await fn(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(null); } };
  return (
    <Modal open onClose={onClose} title={<span className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white" style={{ background: c.color }}>{c.name[0]}</span>{c.name}</span>}
      footer={connected && c.auth !== "builtin" && <>
        <ConfirmButton onConfirm={() => run("dis", async () => { await api(`/api/integrations/${c.key}/disconnect`, { body: {} }); toast("Disconnected"); onClose(); })}>Disconnect</ConfirmButton>
        {c.syncs?.length > 0 && <Button variant="pri" loading={busy === "sync"} onClick={() => run("sync", async () => { await api(`/api/integrations/${c.key}/sync`, { body: {} }); toast("Sync started"); })}><RefreshCw className="h-4 w-4" />Sync now</Button>}
      </>}>
      <div className="space-y-4">
        <p className="text-[14px] text-muted">{c.description}</p>
        {c.syncs?.length > 0 && <div className="flex flex-wrap gap-1.5">{c.syncs.map((x: string) => <span key={x} className="chip bg-bg">{x}</span>)}</div>}
        {c.lastError && <Callout tone="warn" title="Last sync failed">{c.lastError}</Callout>}
        {connected ? <Callout tone="ok" title="Connected">{c.accountName ? `Signed in as ${c.accountName}. ` : ""}The AI can use this app for you. Anything that sends money or messages still asks first.</Callout>
          : c.auth === "builtin" ? <Callout tone="ok" title="Ready to use">{c.key.includes("gps") || c.key.includes("traccar") ? <>Point your trackers at <code className="font-mono text-xs">{gps}</code>.</> : "This works out of the box. No setup needed."}</Callout>
          : c.auth === "oauth" ? (c.available ? (
            <a href={`/api/integrations/${c.key}/connect`} className="btn btn-pri w-full"><Plug className="h-4 w-4" />Sign in with {c.name.split(" ")[0]}</a>
          ) : (
            <div className="space-y-3">
              <Callout title="Use your own app credentials">Your OENOD provider hasn't set up a shared {c.name} app yet. You can connect your own: {own.data?.help}</Callout>
              {own.data && <Field label="Redirect URI"><div className="flex gap-2"><Input readOnly value={own.data.redirectUri} className="font-mono text-xs" /><Button onClick={async () => { if (await copyText(own.data.redirectUri)) toast("Copied"); }}><Copy className="h-4 w-4" /></Button></div></Field>}
              {own.data?.scopes?.length > 0 && <p className="text-xs text-muted">Permissions: {own.data.scopes.join(", ")}</p>}
              <Field label="Client ID"><Input value={v.clientId ?? ""} onChange={(e) => setV({ ...v, clientId: e.target.value })} /></Field>
              <Field label="Client secret"><Input type="password" autoComplete="off" value={v.clientSecret ?? ""} onChange={(e) => setV({ ...v, clientSecret: e.target.value })} /></Field>
              {c.key.startsWith("microsoft") || c.key.startsWith("outlook") || c.key.startsWith("teams") ? <Field label="Tenant (optional)" help="Leave empty for any Microsoft account."><Input value={v.tenant ?? ""} onChange={(e) => setV({ ...v, tenant: e.target.value })} /></Field> : null}
              <Button variant="pri" className="w-full" loading={busy === "own"} onClick={() => run("own", async () => { const r = await api(`/api/integrations/${c.key}/app`, { body: v }); location.href = r.next; })}>Save and sign in</Button>
            </div>
          )) : (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run("key", async () => { await api(`/api/integrations/${c.key}/connect`, { body: v }); toast(`${c.name} connected`); onClose(); }); }}>
              {(c.fields ?? []).map((f: any) => <Field key={f.name} label={f.label}><Input type={f.secret ? "password" : "text"} autoComplete="off" placeholder={f.placeholder} value={v[f.name] ?? ""} onChange={(e) => setV({ ...v, [f.name]: e.target.value })} required /></Field>)}
              <p className="flex items-center gap-1.5 text-xs text-muted"><ShieldCheck className="h-3.5 w-3.5 text-ok" />Encrypted with AES-256. Only used to talk to {c.name} for your company.</p>
              <Button variant="pri" type="submit" className="w-full" loading={busy === "key"}>Connect</Button>
            </form>
          )}
      </div>
    </Modal>
  );
}

// ───────────── Plugins
function Plugins() {
  const t = useT();
  const s = useSession();
  const { data, loading, reload } = useApi<{ plugins: any[]; categories: { name: string; count: number }[] }>("/api/plugins");
  const installed = useApi<any[]>("/api/plugins/installed");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [submit, setSubmit] = useState(false);
  const list = (data?.plugins ?? []).filter((p) => !q || `${p.name} ${p.tagline} ${p.category}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-5">
      {installed.data && installed.data.length > 0 && (
        <Card title="Installed" pad={false}>
          <ul className="divide-y divide-line">{installed.data.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-[10px] text-sm font-bold text-white" style={{ background: i.plugin.color }}>{i.plugin.name[0]}</span>
              <span className="min-w-0 flex-1"><b className="text-[14px]">{i.plugin.name}</b> {i.plugin.verified && <BadgeCheck className="inline h-4 w-4 text-blue" />}<small className="block text-xs text-muted">{i.permissions.join(" · ")}</small></span>
              <small className="font-mono text-[11px] text-muted">{i.lastActivity ? `active ${t.ago(i.lastActivity)}` : "no activity yet"}</small>
              <Badge status={i.status} />
              <Button size="sm" variant="ghost" onClick={() => setOpen(i.plugin.slug)}>Manage</Button>
            </li>
          ))}</ul>
        </Card>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plugins" className="ps-9" /></div>
        {["OWNER", "ADMIN"].includes(s.role ?? "") && <Button onClick={() => setSubmit(true)}><FileCode2 className="h-4 w-4" />Publish a plugin</Button>}
      </div>
      {loading && !data ? <Loading /> : !list.length ? <Empty icon={<Puzzle className="h-5 w-5" />} title="No plugins yet" body="Plugins from OENOD and verified developers appear here. Developers can publish one with the button above." /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <button key={p.id} onClick={() => setOpen(p.slug)} className="card flex flex-col gap-3 p-4 text-start transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl text-base font-bold text-white" style={{ background: p.color }}>{p.name[0]}</span>
                <span className="min-w-0 flex-1"><b className="flex items-center gap-1 truncate text-[14.5px]">{p.name}{p.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-blue" />}</b><small className="text-xs text-muted">{p.developer}</small></span>
                {p.installed ? <Badge tone="ok">Installed</Badge> : <span className="text-xs font-bold text-navy">{p.priceCents ? `${t.money(p.priceCents / 100, "USD")}/mo` : "Free"}</span>}
              </div>
              <p className="line-clamp-2 text-[13px] leading-5 text-muted">{p.tagline}</p>
              <small className="font-mono text-[10.5px] text-muted">{p.category} · {t.num(p.installs)} installs</small>
            </button>
          ))}
        </div>
      )}
      {open && <PluginModal slug={open} onClose={() => { setOpen(null); reload(); installed.reload(); }} />}
      {submit && <SubmitPlugin onClose={() => setSubmit(false)} />}
    </div>
  );
}

function PluginModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const toast = useToast();
  const s = useSession();
  const { data, reload } = useApi<any>(`/api/plugins/${slug}`);
  const [accept, setAccept] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [keys, setKeys] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const admin = ["OWNER", "ADMIN"].includes(s.role ?? "");
  const p = data?.plugin;
  const act = async (fn: () => Promise<any>) => { setBusy(true); try { await fn(); reload(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); } };
  return (
    <Modal open onClose={onClose} title={p?.name ?? "Plugin"} wide
      footer={p && admin && (data.install ? <>
        <ConfirmButton onConfirm={() => act(async () => { const r = await api(`/api/plugins/${slug}`, { method: "DELETE" }); toast(r.note ?? "Removed"); onClose(); })}><Trash2 className="h-3.5 w-3.5" />Remove</ConfirmButton>
        <Button loading={busy} onClick={() => act(() => api(`/api/plugins/${slug}`, { method: "PATCH", body: { status: data.install.status === "ACTIVE" ? "DISABLED" : "ACTIVE" } }))}>{data.install.status === "ACTIVE" ? "Pause" : "Turn back on"}</Button>
      </> : <Button variant="pri" disabled={!accept} loading={busy} onClick={() => act(async () => { const r = await api(`/api/plugins/${slug}`, { body: { accept: true, settings } }); if (r.apiKey) setKeys(r); else { toast("Installed"); onClose(); } })}>Install</Button>)}>
      {!p ? <Loading /> : keys ? (
        <div className="space-y-3">
          <Callout tone="ok" title="Installed">{keys.note}</Callout>
          {[["API key", keys.apiKey], ["Webhook signing secret", keys.webhookSecret]].filter(([, v]) => v).map(([k, v]) => <Field key={k} label={k}><div className="flex gap-2"><Input readOnly value={v} className="font-mono text-xs" /><Button onClick={async () => { if (await copyText(v)) toast("Copied"); }}><Copy className="h-4 w-4" /></Button></div></Field>)}
          <Button variant="pri" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: p.color }}>{p.name[0]}</span><div><b className="flex items-center gap-1 font-display text-lg">{p.name}{p.verified && <BadgeCheck className="h-5 w-5 text-blue" />}</b><small className="text-muted">by {p.developer}{p.website && <> · <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-blue">website</a></>}</small></div></div>
          <p className="whitespace-pre-wrap text-[14px] leading-6">{p.description}</p>
          <div className="rounded-xl border border-line p-4">
            <b className="flex items-center gap-2 text-[13px]"><ShieldCheck className="h-4 w-4 text-navy" />This plugin will be able to</b>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-[13px] text-muted">{data.permissions.map((x: string) => <li key={x}>{x}</li>)}</ul>
            <p className="mt-2 text-xs text-muted">You can pause or remove it at any time. Removing it revokes its access immediately.</p>
          </div>
          {!data.install && data.settings.length > 0 && data.settings.map((f: any) => <Field key={f.name} label={f.label} required={f.required}><Input type={f.secret ? "password" : "text"} autoComplete="off" value={settings[f.name] ?? ""} onChange={(e) => setSettings({ ...settings, [f.name]: e.target.value })} /></Field>)}
          {!data.install && admin && <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5" checked={accept} onChange={(e) => setAccept(e.target.checked)} />I've reviewed these permissions and want to install {p.name} for my company.</label>}
          {!admin && <p className="text-xs text-muted">Ask an owner or admin to install plugins.</p>}
        </div>
      )}
    </Modal>
  );
}

function SubmitPlugin({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const mine = useApi<any[]>("/api/plugins/submit");
  const [v, setV] = useState({ name: "", tagline: "", description: "", category: "Productivity", website: "", supportEmail: "", manifest: JSON.stringify({ scopes: ["crm:read"], events: ["contact.created"], webhookUrl: "https://example.com/oenod/webhook", installUrl: "https://example.com/oenod/install", settings: [] }, null, 2) });
  const [busy, setBusy] = useState(false);
  return (
    <Modal open onClose={onClose} wide title="Publish a plugin" footer={<Button variant="pri" loading={busy} onClick={async () => { setBusy(true); try { const r = await api("/api/plugins/submit", { body: { ...v, slug: v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40), website: v.website || undefined, manifest: JSON.parse(v.manifest) } }); toast(r.note); mine.reload(); } catch (e: any) { toast(e instanceof SyntaxError ? "The manifest isn't valid JSON." : e.message, "err"); } finally { setBusy(false); } }}>Submit for review</Button>}>
      <div className="space-y-3">
        <Callout>Plugins use the OENOD API with a scoped key that's created when a company installs them. Every plugin is reviewed by the OENOD team before it's listed. See the API docs at <a className="text-blue" href="/developers" target="_blank">/developers</a>.</Callout>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="Category"><Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} options={["Productivity", "Sales", "Marketing", "Finance", "HR", "Operations", "Communication", "Analytics", "AI"]} /></Field>
          <Field label="Tagline" className="sm:col-span-2"><Input value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field>
          <Field label="Website"><Input value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} /></Field>
          <Field label="Support email"><Input type="email" value={v.supportEmail} onChange={(e) => setV({ ...v, supportEmail: e.target.value })} /></Field>
          <Field label="Manifest (JSON)" className="sm:col-span-2"><Textarea value={v.manifest} onChange={(e) => setV({ ...v, manifest: e.target.value })} className="min-h-[180px] font-mono text-xs" /></Field>
        </div>
        {mine.data && mine.data.length > 0 && <div className="text-[13px]"><b>Your plugins</b><ul className="mt-1 space-y-1">{mine.data.map((p) => <li key={p.id}>{p.name} <Badge status={p.status} />{p.reviewNote && <small className="block text-muted">{p.reviewNote}</small>}</li>)}</ul></div>}
      </div>
    </Modal>
  );
}

// ───────────── Custom connectors ("connect any API")
const blank = { name: "", description: "", baseUrl: "https://", authType: "bearer", authConfig: {} as Record<string, string>, actions: [] as any[], inboundResource: null as string | null, inboundMapping: {} as Record<string, string>, authorizeUrl: "", tokenUrl: "", clientId: "", clientSecret: "", scopes: [] as string[] };

function Custom() {
  const t = useT();
  const { data, loading, reload } = useApi<{ data: any[]; inboundResources: string[] }>("/api/connectors");
  const [edit, setEdit] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  return (
    <div className="space-y-4">
      <Callout title="Works with any app that has an API">Paste an OpenAPI (Swagger) file or add endpoints by hand. The AI can then call them for you, with your approval for anything that changes data. Apps can also send data in through a private inbound URL.</Callout>
      <div className="flex justify-end"><Button variant="pri" onClick={() => setEdit({ ...blank })}><Plus className="h-4 w-4" />New connector</Button></div>
      {loading && !data ? <Loading /> : !data?.data.length ? <Empty icon={<Wrench className="h-5 w-5" />} title="No custom connectors yet" body="Connect your POS, a supplier portal, a niche CRM, anything." /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.data.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl font-bold text-white" style={{ background: c.color }}>{c.name[0]}</span><span className="min-w-0 flex-1"><b className="block truncate">{c.name}</b><small className="block truncate font-mono text-[11px] text-muted">{c.baseUrl}</small></span><Badge status={c.status} /></div>
              <p className="mt-2 text-xs text-muted">{c.actions.length} actions · {t.num(c.callCount)} calls{c.lastUsedAt ? ` · last ${t.ago(c.lastUsedAt)}` : ""}{c.inboundResource ? ` · receives ${c.inboundResource}` : ""}</p>
              {c.lastError && <p className="mt-1 text-xs text-crit">{c.lastError}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setEdit({ ...blank, ...c, authConfig: {}, clientSecret: "" })}>Edit</Button>
                <Button size="sm" onClick={() => setTest(c)}><Play className="h-3.5 w-3.5" />Test</Button>
                {c.authType === "oauth2" && <a className="btn btn-sm" href={`/api/connectors/${c.id}/oauth`}>{c.oauthConnected ? "Reconnect" : "Sign in"}</a>}
              </div>
            </div>
          ))}
        </div>
      )}
      {edit && <ConnectorEditor initial={edit} inbound={data?.inboundResources ?? []} onClose={() => { setEdit(null); reload(); }} />}
      {test && <TestConnector c={test} onClose={() => { setTest(null); reload(); }} />}
    </div>
  );
}

function ConnectorEditor({ initial, inbound, onClose }: { initial: any; inbound: string[]; onClose: () => void }) {
  const toast = useToast();
  const [v, setV] = useState<any>(initial);
  const [spec, setSpec] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, val: any) => setV((x: any) => ({ ...x, [k]: val }));
  const auth = (k: string, val: string) => setV((x: any) => ({ ...x, authConfig: { ...x.authConfig, [k]: val } }));
  const importSpec = async () => { try { const r = await api("/api/connectors/import", { body: { spec } }); const d = r.data; setV((x: any) => ({ ...x, name: x.name || d.name, description: d.description ?? x.description, baseUrl: d.baseUrl ?? x.baseUrl, actions: d.actions, authType: d.authType, authConfig: d.authHint ? { name: d.authHint.name } : x.authConfig, ...(d.oauth ?? {}) })); setSpec(""); toast(`Imported ${d.actions.length} actions`); } catch (e: any) { toast(e.message, "err"); } };
  const save = async () => {
    setBusy(true);
    const payload = { ...v, authConfig: Object.fromEntries(Object.entries(v.authConfig).filter(([, x]) => x)), authorizeUrl: v.authorizeUrl || undefined, tokenUrl: v.tokenUrl || undefined, clientId: v.clientId || undefined, clientSecret: v.clientSecret || undefined, description: v.description || undefined };
    for (const k of ["id", "status", "lastError", "lastUsedAt", "callCount", "createdAt", "oauthConnected", "inboundUrl"]) delete payload[k];
    try { await api(v.id ? `/api/connectors/${v.id}` : "/api/connectors", { method: v.id ? "PATCH" : "POST", body: payload }); toast("Saved"); onClose(); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} wide title={v.id ? `Edit ${v.name}` : "New connector"}
      footer={<>{v.id && <ConfirmButton onConfirm={async () => { await api(`/api/connectors/${v.id}`, { method: "DELETE" }); onClose(); }}>Delete</ConfirmButton>}<Button variant="pri" loading={busy} onClick={save}>Save</Button></>}>
      <div className="space-y-4">
        {!v.id && <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer text-[13px] font-bold">Import from an OpenAPI / Swagger file</summary><Textarea value={spec} onChange={(e) => setSpec(e.target.value)} placeholder="Paste JSON or YAML" className="mt-2 min-h-[120px] font-mono text-xs" /><Button size="sm" className="mt-2" onClick={importSpec} disabled={spec.length < 10}>Import</Button></details>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name"><Input value={v.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Base URL" help="Must be a public https address."><Input value={v.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} /></Field>
          <Field label="Authentication"><Select value={v.authType} onChange={(e) => set("authType", e.target.value)} options={[{ value: "none", label: "None" }, { value: "bearer", label: "Bearer token" }, { value: "header", label: "API key in header" }, { value: "query", label: "API key in query" }, { value: "basic", label: "Username and password" }, { value: "oauth2", label: "OAuth 2.0" }]} /></Field>
          {v.authType === "bearer" && <Field label="Token"><Input type="password" autoComplete="off" value={v.authConfig.token ?? ""} onChange={(e) => auth("token", e.target.value)} placeholder={v.id ? "Leave empty to keep" : ""} /></Field>}
          {(v.authType === "header" || v.authType === "query") && <><Field label="Key name"><Input value={v.authConfig.name ?? ""} onChange={(e) => auth("name", e.target.value)} placeholder="X-API-Key" /></Field><Field label="Key value"><Input type="password" autoComplete="off" value={v.authConfig.value ?? ""} onChange={(e) => auth("value", e.target.value)} placeholder={v.id ? "Leave empty to keep" : ""} /></Field></>}
          {v.authType === "basic" && <><Field label="Username"><Input value={v.authConfig.username ?? ""} onChange={(e) => auth("username", e.target.value)} /></Field><Field label="Password"><Input type="password" autoComplete="off" value={v.authConfig.password ?? ""} onChange={(e) => auth("password", e.target.value)} /></Field></>}
          {v.authType === "oauth2" && <><Field label="Authorize URL"><Input value={v.authorizeUrl ?? ""} onChange={(e) => set("authorizeUrl", e.target.value)} /></Field><Field label="Token URL"><Input value={v.tokenUrl ?? ""} onChange={(e) => set("tokenUrl", e.target.value)} /></Field><Field label="Client ID"><Input value={v.clientId ?? ""} onChange={(e) => set("clientId", e.target.value)} /></Field><Field label="Client secret"><Input type="password" autoComplete="off" value={v.clientSecret ?? ""} onChange={(e) => set("clientSecret", e.target.value)} /></Field><Field label="Scopes" className="sm:col-span-2"><Input value={(v.scopes ?? []).join(" ")} onChange={(e) => set("scopes", e.target.value.split(/\s+/).filter(Boolean))} /></Field></>}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between"><b className="text-[13px]">Actions</b><Button size="sm" onClick={() => set("actions", [...v.actions, { key: `action_${v.actions.length + 1}`, name: "", method: "GET", path: "/" }])}><Plus className="h-3.5 w-3.5" />Add</Button></div>
          <div className="max-h-[260px] space-y-2 overflow-y-auto">
            {v.actions.map((a: any, i: number) => (
              <div key={i} className="grid grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)_32px] gap-2">
                <Select value={a.method} onChange={(e) => set("actions", v.actions.map((x: any, j: number) => j === i ? { ...x, method: e.target.value } : x))} options={["GET", "POST", "PUT", "PATCH", "DELETE"]} className="h-9 py-0 text-xs" />
                <Input value={a.name} placeholder="Name" onChange={(e) => set("actions", v.actions.map((x: any, j: number) => j === i ? { ...x, name: e.target.value, key: x.key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_") } : x))} className="h-9 text-xs" />
                <Input value={a.path} placeholder="/orders/{id}" onChange={(e) => set("actions", v.actions.map((x: any, j: number) => j === i ? { ...x, path: e.target.value } : x))} className="h-9 font-mono text-xs" />
                <button onClick={() => set("actions", v.actions.filter((_: any, j: number) => j !== i))} className="grid place-items-center text-muted hover:text-crit" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Receive data from this app into" help="Gives you a private URL the app can post to."><Select value={v.inboundResource ?? ""} onChange={(e) => set("inboundResource", e.target.value || null)} options={inbound} placeholder="Don't receive data" /></Field>
          {v.inboundResource && <Field label="Field mapping (JSON)" help='e.g. {"firstName": "customer.first_name", "source": "=Shopify"}'><Textarea value={JSON.stringify(v.inboundMapping ?? {}, null, 1)} onChange={(e) => { try { set("inboundMapping", JSON.parse(e.target.value)); } catch { /* keep typing */ } }} className="font-mono text-xs" /></Field>}
        </div>
        {v.inboundUrl && <Field label="Inbound URL"><Input readOnly value={v.inboundUrl} className="font-mono text-xs" /></Field>}
      </div>
    </Modal>
  );
}

function TestConnector({ c, onClose }: { c: any; onClose: () => void }) {
  const [action, setAction] = useState(c.actions[0]?.key ?? "");
  const [input, setInput] = useState("{}");
  const [out, setOut] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const a = useMemo(() => c.actions.find((x: any) => x.key === action), [c, action]);
  return (
    <Modal open onClose={onClose} wide title={`Test ${c.name}`} footer={<Button variant="pri" loading={busy} disabled={!action} onClick={async () => { setBusy(true); try { setOut(await api(`/api/connectors/${c.id}/run`, { body: { action, input: JSON.parse(input || "{}") } })); } catch (e: any) { toast(e instanceof SyntaxError ? "Input must be JSON" : e.message, "err"); } finally { setBusy(false); } }}><Play className="h-4 w-4" />Run</Button>}>
      <div className="space-y-3">
        <Field label="Action"><Select value={action} onChange={(e) => setAction(e.target.value)} options={c.actions.map((x: any) => ({ value: x.key, label: `${x.method} ${x.path} · ${x.name}` }))} /></Field>
        {a?.method !== "GET" && <Callout tone="warn">This action can change data in {c.name}.</Callout>}
        <Field label="Input (JSON)" help="Values for {placeholders} in the path and body."><Textarea value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-xs" /></Field>
        {out && <div><Badge tone={out.ok ? "ok" : "crit"}>HTTP {out.status}</Badge><pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-bg p-3 font-mono text-[11px]">{JSON.stringify(out.data, null, 2)}</pre></div>}
        {out?.ok && <p className="flex items-center gap-1.5 text-xs text-ok"><CheckCircle2 className="h-3.5 w-3.5" />Working. The AI can now use this action.</p>}
      </div>
    </Modal>
  );
}
