"use client";
import { Fragment, useState } from "react";
import { useApi } from "@/lib/client/api";
import { dateTime, num } from "@/lib/format";
import { Card, ErrorNote, Loading, PageHeader, Tabs, cx } from "@/components/ui";
import { Pager, SearchBox, Table, useDebounced } from "../bits";

type Row = { id: string; action: string; actor: string | null; entity: string | null; entityId: string | null; data: unknown; ip: string | null; createdAt: string; org: { name: string } | null };
const ACTORS = [["", "Everyone"], ["super-admin", "Super admins"], ["user", "People"], ["ai", "AI"], ["api", "API keys"], ["system", "System"]] as const;

export default function Audit() {
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const da = useDebounced(action);
  const { data, error, reload } = useApi<{ data: Row[]; total: number; pages: number }>(`/api/admin/audit?page=${page}${actor ? `&actor=${actor}` : ""}${da ? `&action=${encodeURIComponent(da)}` : ""}`);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Trust" title="Audit log" sub={data ? `${num(data.total)} recorded events. Every change by a super admin, the AI, an API key or a person is kept here.` : undefined} />
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={actor} onChange={(a) => { setActor(a); setPage(1); }} tabs={ACTORS.map(([k, l]) => ({ key: k, label: l }))} />
        <SearchBox value={action} onChange={(v) => { setAction(v); setPage(1); }} placeholder="Action starts with, e.g. user. or platform." />
      </div>
      <Card pad={false}>
        {error ? <div className="p-5"><ErrorNote error={error} onRetry={reload} /></div> : !data ? <div className="p-5"><Loading /></div> : <>
          <Table head={["When", "Action", "Who", "Company", "Address"]} empty={!data.data.length}>
            {data.data.map((r) => (
              <Fragment key={r.id}>
                <tr onClick={() => setOpen(open === r.id ? null : r.id)} className={cx("cursor-pointer hover:bg-bg/60", open === r.id && "bg-bg/60")}>
                  <td className="whitespace-nowrap px-5 py-2.5 text-muted">{dateTime(r.createdAt)}</td>
                  <td className="px-5 py-2.5 font-mono text-[12.5px]">{r.action}</td>
                  <td className="px-5 py-2.5">{r.actor ?? "—"}</td>
                  <td className="px-5 py-2.5">{r.org?.name ?? "OENOD"}</td>
                  <td className="px-5 py-2.5 font-mono text-[12px] text-muted">{r.ip ?? ""}</td>
                </tr>
                {open === r.id && <tr><td colSpan={5} className="bg-bg/60 px-5 pb-3"><pre className="overflow-x-auto rounded-xl bg-paper p-3 font-mono text-[12px]">{JSON.stringify({ entity: r.entity, entityId: r.entityId, data: r.data }, null, 2)}</pre></td></tr>}
              </Fragment>
            ))}
          </Table>
          <Pager page={page} pages={data.pages} onPage={setPage} />
        </>}
      </Card>
    </div>
  );
}
