"use client";
import { useState } from "react";
import { MoreHorizontal, ShieldCheck } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ago, num } from "@/lib/format";
import { Avatar, Badge, Card, ErrorNote, Loading, PageHeader, useToast } from "@/components/ui";
import { Pager, SearchBox, Table, useDebounced } from "../bits";

type U = { id: string; name: string; email: string; isSuperAdmin: boolean; locale: string; lastSeenAt: string | null; createdAt: string; marketingEmailConsent: boolean; memberships: { role: string; org: { id: string; name: string } }[] };
const ACTIONS = [["signout", "Sign out everywhere"], ["unlock", "Clear sign-in lockout"], ["disable", "Block account"], ["enable", "Unblock account"], ["make_super_admin", "Make super admin"], ["remove_super_admin", "Remove super admin"]] as const;

export default function Users() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const { data, error, reload } = useApi<{ data: U[]; total: number; pages: number }>(`/api/admin/users?page=${page}&q=${encodeURIComponent(dq)}`);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: string; label: string } | null>(null);
  const run = async () => {
    if (!confirm) return;
    try { await api(`/api/admin/users/${confirm.id}`, { method: "PATCH", body: { action: confirm.action } }); toast("Done", "ok"); reload(); } catch (e: any) { toast(e.message, "err"); } finally { setConfirm(null); }
  };
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Customers" title="Users" sub={data ? `${num(data.total)} people with an OENOD account` : undefined} />
      <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name or email" />
      <Card pad={false}>
        {error ? <div className="p-5"><ErrorNote error={error} onRetry={reload} /></div> : !data ? <div className="p-5"><Loading /></div> : (
          <>
            <Table head={["Person", "Companies", "Marketing", "Last seen", ""]} empty={!data.data.length}>
              {data.data.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3"><span className="flex items-center gap-2.5"><Avatar name={u.name} size={30} /><span className="min-w-0"><b className="flex items-center gap-1.5">{u.name}{u.isSuperAdmin && <Badge tone="blue"><ShieldCheck className="h-3 w-3" />Super admin</Badge>}</b><small className="text-muted">{u.email}</small></span></span></td>
                  <td className="px-5 py-3">{u.memberships.length ? u.memberships.map((m) => <div key={m.org.id} className="text-[13px]">{m.org.name} <span className="text-muted">· {m.role.toLowerCase()}</span></div>) : <span className="text-muted">Learner or job seeker</span>}</td>
                  <td className="px-5 py-3">{u.marketingEmailConsent ? <Badge tone="green">Opted in</Badge> : <span className="text-muted">No</span>}</td>
                  <td className="px-5 py-3 text-muted">{ago(u.lastSeenAt)}</td>
                  <td className="relative px-5 py-3 text-end">
                    <button className="btn-ghost btn-sm" onClick={() => setMenu(menu === u.id ? null : u.id)} aria-label="Actions"><MoreHorizontal className="h-4 w-4" /></button>
                    {menu === u.id && (
                      <div className="absolute end-5 top-11 z-10 w-56 rounded-xl border border-line bg-paper p-1 text-start shadow-lift">
                        {ACTIONS.filter(([a]) => (a === "make_super_admin" ? !u.isSuperAdmin : a === "remove_super_admin" ? u.isSuperAdmin : true)).map(([a, l]) => <button key={a} onClick={() => { setMenu(null); setConfirm({ id: u.id, action: a, label: `${l} for ${u.name}?` }); }} className="block w-full rounded-lg px-3 py-2 text-start text-[13px] hover:bg-bg">{l}</button>)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
            <Pager page={page} pages={data.pages} onPage={setPage} />
          </>
        )}
      </Card>
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-6" onMouseDown={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div className="card w-full max-w-sm space-y-4 p-6"><b className="font-display text-lg">{confirm.label}</b><p className="text-[13.5px] text-muted">This is recorded in the audit log.</p><div className="flex justify-end gap-2"><button className="btn" onClick={() => setConfirm(null)}>Cancel</button><button className="btn-pri" onClick={run}>Confirm</button></div></div>
        </div>
      )}
    </div>
  );
}
