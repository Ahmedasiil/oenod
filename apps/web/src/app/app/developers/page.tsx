"use client";
import { useState } from "react";
import { KeyRound, Plus, Copy, Eye, RotateCw, BookOpen, Webhook, Terminal } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession } from "@/components/session";
import { useT } from "@/components/i18n";
import { ResourceTable } from "@/components/resource";
import { Badge, Button, Callout, Card, ConfirmButton, Empty, Field, Input, Loading, Modal, PageHeader, Tabs, copyText, useToast } from "@/components/ui";

export default function Developers() {
  const t = useT();
  const s = useSession();
  const toast = useToast();
  const admin = ["OWNER", "ADMIN"].includes(s.role ?? "");
  const { data, loading, reload } = useApi<{ keys: any[]; deliveries: any[] }>("/api/developers/keys");
  const hooks = useApi<{ data: any[] }>("/api/v1/webhooks?limit=100");
  const [tab, setTab] = useState<"keys" | "webhooks" | "quickstart">("keys");
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ url: string; secret: string } | null>(null);
  const origin = typeof window !== "undefined" ? location.origin : "";
  const create = async (e: React.FormEvent) => { e.preventDefault(); try { const r = await api("/api/developers/keys", { body: { name } }); setNewKey(r.key); setName(""); reload(); } catch (er: any) { toast(er.message, "err"); } };
  const reveal = async (w: any, rotate = false) => { try { const r = await api(`/api/developers/webhooks/${w.id}/secret`, rotate ? { body: {} } : {}); setSecret({ url: w.url, secret: r.secret }); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Platform" title="Developers & API" sub="A REST API for every module, signed webhooks and an OpenAPI spec. Build your own tools or connect anything."
        actions={<><a className="btn" href="/developers" target="_blank"><BookOpen className="h-4 w-4" />API docs</a><a className="btn" href="/api/v1/openapi.json" target="_blank">OpenAPI</a></>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "keys", label: "API keys", count: data?.keys.length }, { key: "webhooks", label: "Webhooks" }, { key: "quickstart", label: "Quick start" }]} />
      {tab === "keys" && (
        <div className="space-y-4">
          {admin && <form onSubmit={create} className="card flex flex-wrap items-end gap-2 p-4"><Field label="New key name" className="min-w-[220px] flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website contact form" required minLength={2} /></Field><Button variant="pri" type="submit"><Plus className="h-4 w-4" />Create key</Button></form>}
          {loading && !data ? <Loading /> : !data?.keys.length ? <Empty icon={<KeyRound className="h-5 w-5" />} title="No API keys" body="Create a key to call the OENOD API from your own systems." /> : (
            <div className="card overflow-x-auto"><table className="table"><thead><tr><th>Name</th><th>Key</th><th>Created</th><th>Last used</th><th /></tr></thead>
              <tbody>{data.keys.map((k) => <tr key={k.id}><td className="font-semibold">{k.name}</td><td className="font-mono text-xs">{k.prefix}…</td><td>{t.date(k.createdAt)}</td><td>{k.lastUsedAt ? t.ago(k.lastUsedAt) : "never"}</td><td className="text-end">{admin && <ConfirmButton confirmLabel="Revoke now" onConfirm={async () => { await api(`/api/developers/keys/${k.id}`, { method: "DELETE" }); toast("Key revoked"); reload(); }}>Revoke</ConfirmButton>}</td></tr>)}</tbody>
            </table></div>
          )}
        </div>
      )}
      {tab === "webhooks" && (
        <div className="space-y-4">
          <Callout title="Verify every delivery">Each request carries <code className="font-mono text-xs">X-Oenod-Signature: sha256=HMAC(secret, timestamp + "." + body)</code> and <code className="font-mono text-xs">X-Oenod-Timestamp</code>. Reject anything older than 5 minutes. Failed deliveries retry with backoff.</Callout>
          <ResourceTable resource="webhooks" />
          {admin && hooks.data && hooks.data.data.length > 0 && (
            <Card title="Signing secrets" pad={false}>
              <ul className="divide-y divide-line">{hooks.data.data.map((w) => <li key={w.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5"><Webhook className="h-4 w-4 text-muted" /><span className="min-w-0 flex-1 truncate font-mono text-xs">{w.url}</span><Button size="sm" variant="ghost" onClick={() => reveal(w)}><Eye className="h-3.5 w-3.5" />Show</Button><ConfirmButton variant="ghost" confirmLabel="Rotate secret" onConfirm={() => reveal(w, true)}><RotateCw className="h-3.5 w-3.5" />Rotate</ConfirmButton></li>)}</ul>
            </Card>
          )}
          <Card title="Recent deliveries" pad={false}>
            {!data?.deliveries.length ? <p className="p-4 text-sm text-muted">No deliveries yet.</p> : (
              <div className="overflow-x-auto"><table className="table"><thead><tr><th>Event</th><th>Status</th><th>Response</th><th>Attempts</th><th>When</th></tr></thead>
                <tbody>{data.deliveries.map((d) => <tr key={d.id}><td className="font-mono text-xs">{d.event}</td><td><Badge status={d.status} /></td><td className="tabular-nums">{d.responseCode ?? "–"}</td><td className="tabular-nums">{d.attempts}</td><td>{t.ago(d.createdAt)}</td></tr>)}</tbody>
              </table></div>
            )}
          </Card>
        </div>
      )}
      {tab === "quickstart" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={<span className="flex items-center gap-2"><Terminal className="h-4 w-4" />List contacts</span>}>
            <Code text={`curl ${origin}/api/v1/contacts?limit=20 \\\n  -H "Authorization: Bearer oen_live_YOUR_KEY"`} />
          </Card>
          <Card title={<span className="flex items-center gap-2"><Terminal className="h-4 w-4" />Create a contact</span>}>
            <Code text={`curl -X POST ${origin}/api/v1/contacts \\\n  -H "Authorization: Bearer oen_live_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"firstName":"Ana","lastName":"Silva","email":"ana@example.com"}'`} />
          </Card>
          <Card title="Verify a webhook (Node.js)" className="lg:col-span-2">
            <Code text={`import crypto from "node:crypto";\n\nexport function verify(req, rawBody, secret) {\n  const ts = req.headers["x-oenod-timestamp"];\n  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;\n  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(ts + "." + rawBody).digest("hex");\n  const got = req.headers["x-oenod-signature"] ?? "";\n  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));\n}`} />
          </Card>
        </div>
      )}
      <Modal open={!!newKey} onClose={() => setNewKey(null)} title="Your new API key" footer={<Button variant="pri" onClick={() => setNewKey(null)}>I've saved it</Button>}>
        <Callout tone="warn">Copy this key now. For your security it won't be shown again. Store it in your server's environment settings, never in website code.</Callout>
        <div className="mt-3 flex gap-2"><Input readOnly value={newKey ?? ""} className="font-mono text-xs" /><Button onClick={async () => { if (newKey && (await copyText(newKey))) toast("Copied"); }}><Copy className="h-4 w-4" /></Button></div>
      </Modal>
      <Modal open={!!secret} onClose={() => setSecret(null)} title="Webhook signing secret">
        <p className="mb-2 truncate font-mono text-xs text-muted">{secret?.url}</p>
        <div className="flex gap-2"><Input readOnly value={secret?.secret ?? ""} className="font-mono text-xs" /><Button onClick={async () => { if (secret && (await copyText(secret.secret))) toast("Copied"); }}><Copy className="h-4 w-4" /></Button></div>
      </Modal>
    </div>
  );
}

function Code({ text }: { text: string }) {
  const toast = useToast();
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-navy p-4 font-mono text-[11.5px] leading-5 text-white/90">{text}</pre>
      <button onClick={async () => { if (await copyText(text)) toast("Copied"); }} className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20" aria-label="Copy"><Copy className="h-3.5 w-3.5" /></button>
    </div>
  );
}
