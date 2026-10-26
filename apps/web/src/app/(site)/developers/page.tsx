import Link from "next/link";
import { KeyRound, Webhook, Puzzle, Gauge, FileJson, ArrowRight } from "lucide-react";
import { RESOURCES } from "@/lib/fields";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import { APP_URL as base } from "@/lib/env";

export const metadata = { title: "Developers", description: "The OENOD REST API, signed webhooks and plugin platform. Build on the same data your business runs on." };


function Code({ children, label }: { children: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#1B2A6B] bg-[#000A3D]">
      {label && <div className="border-b border-white/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[.12em] text-[#9DB0FF]">{label}</div>}
      <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-6 text-[#E6EBFF]"><code>{children}</code></pre>
    </div>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-28 font-display text-[28px] font-semibold tracking-tight">{children}</h2>;
}

const NAV = [["start", "Quick start"], ["auth", "Authentication"], ["requests", "Requests and paging"], ["errors", "Errors and limits"], ["resources", "Resources"], ["webhooks", "Webhooks"], ["plugins", "Plugins"]] as const;

export default function Developers() {
  const sample = RESOURCES.find((r) => r.key === "contacts") ?? RESOURCES[0];
  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-sky/60 to-white">
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6">
          <span className="eyebrow">Developers</span>
          <h1 className="mt-2 max-w-3xl font-display text-[38px] font-semibold leading-tight tracking-tight sm:text-[52px]">Build on the data your business already runs on.</h1>
          <p className="mt-3 max-w-2xl text-[15.5px] text-muted">A clean REST API over {RESOURCES.length} resources, signed webhooks for {WEBHOOK_EVENTS.length} events, and a plugin platform that puts your app inside OENOD for every company that installs it.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/app/developers" className="btn-pri h-11 px-5">Get an API key<ArrowRight className="h-4 w-4 rtl:rotate-180" /></Link>
            <a href="/api/v1/openapi.json" className="btn h-11 bg-white px-5"><FileJson className="h-4 w-4" />OpenAPI spec</a>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([[KeyRound, "Scoped keys", "Keys carry only the modules you allow, and can be revoked at any time."], [Webhook, "Signed webhooks", "HMAC-SHA256 signatures with timestamps, plus automatic retries."], [Puzzle, "Plugins", "Ship one app and reach every OENOD company, with clear consent screens."], [Gauge, "Fair limits", "120 requests a minute per key, with clear 429 responses."]] as const).map(([I, t, d]) => (
              <div key={t} className="card p-5"><I className="h-5 w-5 text-blue" /><b className="mt-3 block text-[14.5px]">{t}</b><p className="mt-1 text-[13px] text-muted">{d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="hidden lg:block"><ul className="sticky top-28 space-y-1 text-[13.5px]">{NAV.map(([id, l]) => <li key={id}><a href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-muted hover:bg-sky hover:text-blue">{l}</a></li>)}</ul></nav>
        <div className="min-w-0 space-y-16 text-[14.5px] leading-7">
          <section className="space-y-4">
            <H2 id="start">Quick start</H2>
            <p className="text-muted">Create a key in <b className="text-ink">OENOD → Developers</b>. Choose which modules it can read or change. The key is shown once, so store it in your server's secret settings, never in a browser or mobile app.</p>
            <Code label="List your contacts">{`curl ${base}/api/v1/${sample.key}?limit=20 \\
  -H "Authorization: Bearer oen_YOUR_KEY"`}</Code>
            <Code label="Create a record">{`curl -X POST ${base}/api/v1/${sample.key} \\
  -H "Authorization: Bearer oen_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ ${sample.fields.filter((f) => f.required).slice(0, 3).map((f) => `"${f.name}": "…"`).join(", ") || `"${sample.title}": "…"`} }'`}</Code>
          </section>

          <section className="space-y-4">
            <H2 id="auth">Authentication</H2>
            <p className="text-muted">Send your key as a Bearer token on every request. Keys start with <code className="rounded bg-sky px-1.5 font-mono text-[13px] text-blue">oen_</code>. We store only a hash of each key, so a lost key can't be recovered: revoke it and make a new one. A key acts on behalf of its company and can only reach the modules it was given.</p>
          </section>

          <section className="space-y-4">
            <H2 id="requests">Requests and paging</H2>
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[560px] text-[13.5px]">
                <thead className="bg-bg text-start text-[12px] uppercase tracking-wide text-muted"><tr><th className="px-4 py-2.5 text-start">Method and path</th><th className="px-4 py-2.5 text-start">What it does</th></tr></thead>
                <tbody className="divide-y divide-line font-mono text-[12.5px]">
                  {[["GET /api/v1/{resource}", "List records. Query: q, status, page, limit (max 500), from, to, and any field name."], ["POST /api/v1/{resource}", "Create a record. Body is JSON with the resource's fields."], ["GET /api/v1/{resource}/{id}", "Get one record."], ["PATCH /api/v1/{resource}/{id}", "Change some fields of a record."], ["DELETE /api/v1/{resource}/{id}", "Delete a record (where the resource allows it)."]].map(([a, b]) => <tr key={a}><td className="whitespace-nowrap px-4 py-2.5 text-navy">{a}</td><td className="px-4 py-2.5 font-sans text-muted">{b}</td></tr>)}
                </tbody>
              </table>
            </div>
            <p className="text-muted">Money is in cents (an integer), dates are ISO 8601 in UTC, and every list returns <code className="font-mono text-[13px]">{"{ data, page, limit, total }"}</code>.</p>
          </section>

          <section className="space-y-4">
            <H2 id="errors">Errors and limits</H2>
            <p className="text-muted">Errors return a JSON body with a plain-language <code className="font-mono text-[13px]">error</code> message you can show to people.</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[["422", "Something in the body isn't valid. details lists each field."], ["401", "The key is missing, wrong or revoked."], ["403", "The key doesn't have access to this module."], ["404", "The record doesn't exist, or belongs to another company."], ["429", "More than 120 requests in a minute for this key. Wait and retry."], ["503", "This area is paused for maintenance. Check the status page."]].map(([c, d]) => <li key={c} className="flex gap-3 rounded-xl border border-line p-3"><b className="font-mono text-blue">{c}</b><span className="text-[13.5px] text-muted">{d}</span></li>)}
            </ul>
          </section>

          <section className="space-y-5">
            <H2 id="resources">Resources</H2>
            <p className="text-muted">Each resource lives at <code className="font-mono text-[13px]">/api/v1/{"{key}"}</code>. Fields marked * are required when creating.</p>
            <div className="grid gap-3">
              {RESOURCES.map((r) => (
                <details key={r.key} id={`r-${r.key}`} className="group rounded-2xl border border-line bg-paper open:shadow-card">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5">
                    <b className="text-[14.5px]">{r.label}</b>
                    <code className="rounded-md bg-sky px-2 py-0.5 font-mono text-[12px] text-blue">/api/v1/{r.key}</code>
                    {r.readOnly && <span className="chip">Read only</span>}
                    <span className="ms-auto text-[12px] text-muted">{r.fields.length} fields</span>
                  </summary>
                  <div className="overflow-x-auto border-t border-line">
                    <table className="w-full min-w-[520px] text-[13px]">
                      <tbody className="divide-y divide-line">
                        {r.fields.map((f) => <tr key={f.name}><td className="whitespace-nowrap px-5 py-2 font-mono text-[12.5px] text-navy">{f.name}{f.required && <span className="text-crit">*</span>}</td><td className="px-3 py-2 text-muted">{f.label}</td><td className="px-5 py-2 text-end font-mono text-[11.5px] text-muted">{f.type}{"options" in f && Array.isArray(f.options) ? `: ${f.options.join(" | ")}` : ""}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  {r.event && <p className="border-t border-line px-5 py-2.5 text-[12.5px] text-muted">Webhooks: <code className="font-mono">{r.event}.*</code></p>}
                </details>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <H2 id="webhooks">Webhooks</H2>
            <p className="text-muted">Add an HTTPS endpoint in <b className="text-ink">OENOD → Developers → Webhooks</b> and pick the events you want. Each delivery is a POST with a JSON body and these headers:</p>
            <ul className="grid gap-2 font-mono text-[12.5px] sm:grid-cols-2">
              {[["X-Oenod-Event", "the event name"], ["X-Oenod-Delivery", "a unique delivery id"], ["X-Oenod-Timestamp", "Unix time in seconds"], ["X-Oenod-Signature", "sha256=HMAC(secret, timestamp + \".\" + body)"]].map(([h, d]) => <li key={h} className="rounded-xl border border-line px-3 py-2"><b className="text-navy">{h}</b> <span className="font-sans text-muted">{d}</span></li>)}
            </ul>
            <Code label="Verify a delivery (Node.js)">{`import crypto from "node:crypto";

export function verify(req, rawBody, secret) {
  const ts = req.headers["x-oenod-timestamp"];
  const sig = req.headers["x-oenod-signature"] || "";
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // older than 5 minutes
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(ts + "." + rawBody).digest("hex");
  return sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}`}</Code>
            <p className="text-muted">Reply with any 2xx within 8 seconds. A failed delivery is retried up to 5 more times, waiting longer each time (2, 4, 8, 16 and 32 minutes). Use the delivery id to ignore duplicates.</p>
            <div className="flex flex-wrap gap-1.5">{WEBHOOK_EVENTS.map((e) => <code key={e} className="rounded-md border border-line bg-paper px-2 py-0.5 font-mono text-[11.5px]">{e}</code>)}</div>
          </section>

          <section className="space-y-4">
            <H2 id="plugins">Plugins</H2>
            <p className="text-muted">A plugin is an app any OENOD company can install from the marketplace. You describe what it needs in a manifest. When a company installs it, OENOD shows them exactly what it can see and do, then creates a key limited to those scopes and a signed webhook for your events.</p>
            <Code label="manifest.json">{`{
  "scopes": ["customers:read", "money:write"],
  "events": ["invoice.paid", "contact.created"],
  "webhookUrl": "https://your-app.example/oenod/events",
  "installUrl": "https://your-app.example/oenod/installed",
  "embed": { "url": "https://your-app.example/oenod/panel", "placement": "dashboard", "title": "Your app" },
  "settings": [{ "name": "accountId", "label": "Your account ID", "required": true }]
}`}</Code>
            <ul className="space-y-2 text-muted">
              <li><b className="text-ink">Scopes</b> are module names, with <code className="font-mono text-[13px]">:read</code> or <code className="font-mono text-[13px]">:write</code>.</li>
              <li><b className="text-ink">Embeds</b> load in a sandboxed frame inside OENOD on the dashboard, sidebar, a record or settings. They receive a short-lived signed token so you know which company is viewing.</li>
              <li><b className="text-ink">Review.</b> Every plugin is checked by our team before it appears in the marketplace. Plugins that pass a deeper check get the verified badge.</li>
            </ul>
            <div className="navy-panel flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center">
              <span className="flex-1"><b className="font-display text-xl">Publish your plugin</b><p className="mt-1 text-[13.5px] text-[#C9D4FF]">Submit it from OENOD → Developers. Free plugins and paid plugins are both welcome.</p></span>
              <Link href="/app/developers" className="btn border-transparent bg-white text-navy">Open Developers</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
