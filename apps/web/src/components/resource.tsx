"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, Download, ChevronLeft, ChevronRight, X } from "lucide-react";
import { resourceByKey, type Field, type ResourceSpec } from "@/lib/fields";
import { api, useApi } from "@/lib/client/api";
import { useAccess, useSession } from "./session";
import { useT } from "./i18n";
import { Badge, Button, ConfirmButton, Empty, ErrorNote, Field as FieldWrap, Input, Loading, Select, Textarea, Toggle, cx, humanize, useToast } from "./ui";

// Generic, spec-driven screens: every module's records get a searchable table, a form and a detail view.

const refCache = new Map<string, Promise<{ id: string; label: string }[]>>();
function loadRefs(key: string) {
  if (!refCache.has(key)) refCache.set(key, api(`/api/refs/${key}`).catch(() => []));
  return refCache.get(key)!;
}
function useRefLabels(spec: ResourceSpec) {
  const [map, setMap] = useState<Record<string, Record<string, string>>>({});
  useEffect(() => {
    const refs = spec.fields.filter((f) => f.type === "ref" && f.ref && f.list);
    Promise.all(refs.map(async (f) => [f.name, Object.fromEntries((await loadRefs(f.ref!)).map((o) => [o.id, o.label]))] as const)).then((e) => setMap(Object.fromEntries(e)));
  }, [spec]);
  return map;
}

export function formatValue(f: Field, v: any, t: ReturnType<typeof useT>, currency: string, refs?: Record<string, string>) {
  if (v === null || v === undefined || v === "") return <span className="text-muted">–</span>;
  switch (f.type) {
    case "money": return <span className="tabular-nums">{t.money(Number(v), currency)}</span>;
    case "percent": return `${Number(v) <= 1 ? Math.round(Number(v) * 1000) / 10 : v}%`;
    case "number": return <span className="tabular-nums">{t.num(Number(v))}</span>;
    case "date": return t.date(v);
    case "datetime": return t.date(v, { dateStyle: "medium", timeStyle: "short" });
    case "boolean": return v ? "Yes" : "No";
    case "select": return f.name === "status" || f.name === "stage" || f.name === "priority" || f.name === "health" ? <Badge status={String(v)} /> : humanize(String(v));
    case "tags": return <span className="flex flex-wrap gap-1">{(v as string[]).map((x) => <Badge key={x} tone="gray">{x}</Badge>)}</span>;
    case "ref": return refs?.[v] ?? <span className="font-mono text-xs text-muted">{String(v).slice(0, 8)}</span>;
    case "items": return `${(v as any[]).length} item(s)`;
    case "color": return <span className="inline-flex items-center gap-2"><i className="h-3.5 w-3.5 rounded" style={{ background: v }} />{v}</span>;
    case "url": return <a href={v} target="_blank" rel="noopener noreferrer" className="text-blue underline-offset-2 hover:underline">{String(v).replace(/^https?:\/\//, "").slice(0, 40)}</a>;
    default: return String(v).length > 80 ? String(v).slice(0, 80) + "…" : String(v);
  }
}

export function ResourceTable({ resource, filters = {}, compact, hideHeader }: { resource: string; filters?: Record<string, string>; compact?: boolean; hideHeader?: boolean }) {
  const spec = resourceByKey(resource)!;
  const t = useT();
  const s = useSession();
  const access = useAccess(spec.module);
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { const x = setTimeout(() => { setDq(q); setPage(1); }, 250); return () => clearTimeout(x); }, [q]);
  const params = new URLSearchParams({ ...filters, page: String(page), limit: compact ? "10" : "25", ...(dq ? { q: dq } : {}), ...(status ? { status } : {}) });
  const { data, loading, error, reload } = useApi<{ data: any[]; total: number; limit: number }>(`/api/v1/${resource}?${params}`);
  const refs = useRefLabels(spec);
  const person = spec.key === "employees" || spec.key === "contacts";
  const cols = spec.fields.filter((f) => f.list && !(person && (f.name === "firstName" || f.name === "lastName"))).slice(0, compact ? 4 : 7);
  const statusField = spec.fields.find((f) => f.name === spec.statusField);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const titleOf = (r: any) => spec.key === "employees" || spec.key === "contacts" ? [r.firstName, r.lastName].filter(Boolean).join(" ") : r[spec.title] ?? r.id;
  const exportCsv = () => {
    if (!data) return;
    const head = ["id", ...spec.fields.map((f) => f.name)];
    const esc = (v: any) => { let x = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); if (/^[=+\-@]/.test(x)) x = "'" + x; return `"${x.replace(/"/g, '""')}"`; };
    const csv = [head.join(","), ...data.data.map((r) => head.map((h) => esc(r[h])).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `${spec.key}.csv`; a.click();
  };

  return (
    <div className="card min-w-0 overflow-hidden">
      {!hideHeader && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[180px] flex-1"><Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${t("common.search")} ${spec.label.toLowerCase()}…`} className="ps-9" /></div>
          {statusField?.options && <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={statusField.options} placeholder={t("common.all")} className="w-auto min-w-[140px]" />}
          {!compact && <Button size="md" variant="ghost" onClick={exportCsv} title={t("common.export")}><Download className="h-4 w-4" /><span className="hidden sm:inline">{t("common.export")}</span></Button>}
          {access === "edit" && !spec.readOnly && <Link href={`/app/r/${spec.key}/new${Object.keys(filters).length ? `?${new URLSearchParams(filters)}` : ""}`} className="btn-pri"><Plus className="h-4 w-4" />{spec.singular}</Link>}
        </div>
      )}
      <ErrorNote error={error} onRetry={reload} />
      {loading && !data ? <div className="p-3"><Loading rows={5} /></div> : !data?.data.length ? (
        <div className="p-4"><Empty title={dq || status ? t("common.noResults") : `No ${spec.label.toLowerCase()} yet`} body={access === "edit" && !spec.readOnly ? `Add your first ${spec.singular.toLowerCase()} or ask the AI to do it.` : undefined} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>{person ? t("common.name") : spec.fields.find((f) => f.name === spec.title)?.label ?? t("common.name")}</th>{cols.filter((c) => c.name !== spec.title).map((c) => <th key={c.name}>{c.label}</th>)}</tr></thead>
            <tbody>
              {data.data.map((r) => (
                <tr key={r.id} className="cursor-pointer">
                  <td className="max-w-[260px]"><Link href={`/app/r/${spec.key}/${r.id}`} className="block truncate font-semibold text-ink hover:text-blue">{String(titleOf(r))}</Link>{spec.subtitle && r[spec.subtitle] && <small className="block truncate text-xs text-muted">{String(r[spec.subtitle])}</small>}</td>
                  {cols.filter((c) => c.name !== spec.title).map((c) => <td key={c.name} className="whitespace-nowrap">{formatValue(c, r[c.name], t, s.org?.currency ?? "CAD", refs[c.name])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-muted">
          <span>{t.num((page - 1) * data.limit + 1)}–{t.num(Math.min(page * data.limit, data.total))} of {t.num(data.total)}</span>
          <span className="flex gap-1"><Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4 rtl:rotate-180" /></Button><Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4 rtl:rotate-180" /></Button></span>
        </div>
      )}
    </div>
  );
}

// ---------- Form ----------
function RefSelect({ field, value, onChange }: { field: Field; value: string; onChange: (v: string) => void }) {
  const [opts, setOpts] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => { loadRefs(field.ref!).then(setOpts); }, [field.ref]);
  return <Select value={value ?? ""} onChange={(e) => onChange(e.target.value)} options={opts.map((o) => ({ value: o.id, label: o.label }))} placeholder="—" required={field.required} />;
}

function ItemsEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const items = value?.length ? value : [{ name: "", qty: 1, price: 0 }];
  const set = (i: number, k: string, v: any) => onChange(items.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_70px_100px_32px] gap-2">
          <Input value={it.name} onChange={(e) => set(i, "name", e.target.value)} placeholder="Item or service" />
          <Input type="number" min={0} step="any" value={it.qty} onChange={(e) => set(i, "qty", Number(e.target.value))} aria-label="Qty" />
          <Input type="number" min={0} step="0.01" value={it.price} onChange={(e) => set(i, "price", Number(e.target.value))} aria-label="Price" />
          <button type="button" className="btn-ghost btn-sm h-10 px-0" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><X className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" className="text-xs font-bold text-blue" onClick={() => onChange([...items, { name: "", qty: 1, price: 0 }])}>+ Add line</button>
      <div className="text-end font-mono text-xs text-muted">Subtotal {items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.price || 0), 0).toFixed(2)} (tax added automatically)</div>
    </div>
  );
}

export function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  const v = value ?? "";
  switch (field.type) {
    case "textarea": return <Textarea value={v} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case "select": return <Select value={v} onChange={(e) => onChange(e.target.value)} options={field.options ?? []} placeholder={field.required ? undefined : "—"} required={field.required} />;
    case "boolean": return <Toggle checked={!!value} onChange={onChange} />;
    case "ref": return <RefSelect field={field} value={v} onChange={onChange} />;
    case "items": return <ItemsEditor value={value ?? []} onChange={onChange} />;
    case "tags": return <Input value={Array.isArray(value) ? value.join(", ") : v} onChange={(e) => onChange(e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} placeholder="Comma separated" />;
    case "number": case "money": case "percent": return <Input type="number" step="any" value={v} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} required={field.required} />;
    case "date": return <Input type="date" value={v ? String(v).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value || null)} required={field.required} />;
    case "datetime": return <Input type="datetime-local" value={v ? toLocalInput(v) : ""} onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} required={field.required} />;
    case "color": return <Input type="color" value={v || "#000F55"} onChange={(e) => onChange(e.target.value)} className="h-10 w-20 p-1" />;
    case "email": return <Input type="email" value={v} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case "phone": return <Input type="tel" value={v} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case "url": return <Input type="url" value={v} onChange={(e) => onChange(e.target.value)} placeholder="https://" required={field.required} />;
    default: return <Input value={v} onChange={(e) => onChange(e.target.value)} required={field.required} />;
  }
}
const toLocalInput = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };

export function ResourceForm({ resource, initial, id, onSaved }: { resource: string; initial?: Record<string, any>; id?: string; onSaved?: (row: any) => void }) {
  const spec = resourceByKey(resource)!;
  const toast = useToast();
  const router = useRouter();
  const t = useT();
  const fields = spec.fields.filter((f) => !f.readOnly);
  const [vals, setVals] = useState<Record<string, any>>(() => {
    const base: Record<string, any> = {};
    for (const f of fields) base[f.name] = initial?.[f.name] ?? (id ? undefined : f.default);
    return base;
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const payload: Record<string, any> = {};
    for (const f of fields) {
      const v = vals[f.name];
      if (v === undefined || (v === "" && !f.required)) { if (id && v === "") payload[f.name] = null; continue; }
      payload[f.name] = v;
    }
    try {
      const r = await api<{ data: any }>(`/api/v1/${resource}${id ? `/${id}` : ""}`, { method: id ? "PATCH" : "POST", body: payload });
      toast(id ? t("common.saved") : `${spec.singular} created`);
      onSaved ? onSaved(r.data) : router.push(`/app/r/${resource}/${r.data.id}`);
    } catch (e: any) { setErr(e.data?.issues?.map((i: any) => `${i.path?.join(".")}: ${i.message}`).join(" · ") || e.message); }
    finally { setBusy(false); }
  };
  const wide = (f: Field) => ["textarea", "items", "tags"].includes(f.type);
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <FieldWrap key={f.name} label={f.label} help={f.help} required={f.required} className={wide(f) ? "sm:col-span-2" : undefined}>
            <FieldInput field={f} value={vals[f.name]} onChange={(v) => setVals((x) => ({ ...x, [f.name]: v }))} />
          </FieldWrap>
        ))}
      </div>
      {err && <ErrorNote error={{ message: err }} />}
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => router.back()}>{t("common.cancel")}</Button><Button type="submit" variant="pri" loading={busy}>{id ? t("common.save") : t("common.create")}</Button></div>
    </form>
  );
}

export function ResourceDetail({ resource, id, extra }: { resource: string; id: string; extra?: (row: any, reload: () => void) => React.ReactNode }) {
  const spec = resourceByKey(resource)!;
  const t = useT();
  const s = useSession();
  const router = useRouter();
  const toast = useToast();
  const access = useAccess(spec.module);
  const { data, error, loading, reload } = useApi<{ data: any }>(`/api/v1/${resource}/${id}`);
  const [editing, setEditing] = useState(false);
  const refs = useRefLabels({ ...spec, fields: spec.fields.map((f) => ({ ...f, list: true })) });
  const row = data?.data;
  const title = useMemo(() => row ? (spec.key === "employees" || spec.key === "contacts" ? [row.firstName, row.lastName].filter(Boolean).join(" ") : row[spec.title] ?? spec.singular) : "", [row, spec]);
  if (loading && !row) return <Loading rows={6} />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!row) return null;
  const canEdit = access === "edit" && (!spec.readOnly || !!spec.statusField);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/app/r/${resource}`} className="eyebrow hover:text-ink">← {spec.label}</Link>
          <h1 className="h1 mt-1 flex flex-wrap items-center gap-3">{String(title)}{spec.statusField && row[spec.statusField] && <Badge status={row[spec.statusField]} />}</h1>
          {spec.subtitle && row[spec.subtitle] && <p className="mt-1 text-muted">{String(row[spec.subtitle])}</p>}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {!spec.readOnly && <Button onClick={() => setEditing((e) => !e)}>{editing ? t("common.cancel") : t("common.edit")}</Button>}
            {["OWNER", "ADMIN", "MANAGER", "FINANCE"].includes(s.role ?? "") && <ConfirmButton onConfirm={async () => { try { await api(`/api/v1/${resource}/${id}`, { method: "DELETE" }); toast("Deleted"); router.push(`/app/r/${resource}`); } catch (e: any) { toast(e.message, "err"); } }}><Trash2 className="h-4 w-4" />{t("common.delete")}</ConfirmButton>}
          </div>
        )}
      </div>
      {spec.statusField && canEdit && !editing && (
        <StatusBar spec={spec} row={row} onChange={async (v) => { try { await api(`/api/v1/${resource}/${id}`, { method: "PATCH", body: { [spec.statusField!]: v } }); toast(t("common.saved")); reload(); } catch (e: any) { toast(e.message, "err"); } }} />
      )}
      {editing ? <div className="card p-5"><ResourceForm resource={resource} id={id} initial={row} onSaved={() => { setEditing(false); reload(); }} /></div> : (
        <div className="card p-5">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {spec.fields.filter((f) => f.type !== "items").map((f) => (
              <div key={f.name} className={cx("min-w-0", f.type === "textarea" && "sm:col-span-2 lg:col-span-3")}>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{f.label}</dt>
                <dd className={cx("mt-1 text-[14px]", f.type === "textarea" && "whitespace-pre-wrap leading-6")}>{f.type === "textarea" ? (row[f.name] || <span className="text-muted">–</span>) : formatValue(f, row[f.name], t, s.org?.currency ?? "CAD", refs[f.name])}</dd>
              </div>
            ))}
          </dl>
          {spec.fields.filter((f) => f.type === "items").map((f) => <ItemsTable key={f.name} items={row[f.name] ?? []} row={row} currency={s.org?.currency ?? "CAD"} />)}
          <p className="mt-6 font-mono text-[11px] text-muted">ID {row.id}{row.createdAt ? ` · created ${t.date(row.createdAt, { dateStyle: "medium", timeStyle: "short" })}` : ""}</p>
        </div>
      )}
      {extra?.(row, reload)}
    </div>
  );
}

function StatusBar({ spec, row, onChange }: { spec: ResourceSpec; row: any; onChange: (v: string) => void }) {
  const f = spec.fields.find((x) => x.name === spec.statusField);
  if (!f?.options) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {f.options.map((o) => (
        <button key={o} onClick={() => o !== row[f.name] && onChange(o)} className={cx("rounded-full border px-3 py-1 text-xs font-bold transition", o === row[f.name] ? "border-navy bg-navy text-white" : "border-line bg-paper text-muted hover:text-ink")}>{humanize(o)}</button>
      ))}
    </div>
  );
}

function ItemsTable({ items, row, currency }: { items: any[]; row: any; currency: string }) {
  const t = useT();
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-line">
      <table className="table">
        <thead><tr><th>Item</th><th className="text-end">Qty</th><th className="text-end">Price</th><th className="text-end">Amount</th></tr></thead>
        <tbody>{items.map((i, k) => <tr key={k}><td>{i.name}</td><td className="text-end tabular-nums">{i.qty}</td><td className="text-end tabular-nums">{t.money(Number(i.price), currency)}</td><td className="text-end tabular-nums">{t.money(Number(i.qty) * Number(i.price), currency)}</td></tr>)}</tbody>
      </table>
      {row.total != null && (
        <div className="space-y-1 border-t border-line p-3 text-end text-sm">
          {row.subtotal != null && <div className="text-muted">Subtotal {t.money(Number(row.subtotal), currency)}</div>}
          {row.tax != null && <div className="text-muted">Tax {t.money(Number(row.tax), currency)}</div>}
          <div className="font-display text-base font-semibold">Total {t.money(Number(row.total), currency)}</div>
          {row.amountPaid != null && Number(row.amountPaid) > 0 && <div className="text-ok">Paid {t.money(Number(row.amountPaid), currency)}</div>}
        </div>
      )}
    </div>
  );
}
