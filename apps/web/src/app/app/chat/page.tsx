"use client";
import { useEffect, useRef, useState } from "react";
import { Hash, Megaphone, Plus, Send, Check } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { useSession, isManagerRole } from "@/components/session";
import { useT } from "@/components/i18n";
import { ResourceTable } from "@/components/resource";
import { Avatar, Button, Empty, Input, Loading, PageHeader, Tabs, cx, useToast } from "@/components/ui";

type Msg = { id: string; userId: string | null; userName: string; body: string; createdAt: string };

export default function Chat() {
  const s = useSession();
  const [tab, setTab] = useState<"chat" | "announcements">("chat");
  const channels = useApi<{ id: string; name: string }[]>("/api/chat");
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => { if (!active && channels.data?.[0]) setActive(channels.data[0].id); }, [channels.data, active]);
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Workspace" title="Team chat" sub="Channels for every team and location, plus announcements people confirm they've read." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "chat", label: "Channels" }, { key: "announcements", label: "Announcements" }]} />
      {tab === "chat" && (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="card h-fit p-2 lg:h-[66vh]">
            <div className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">
              {channels.data?.map((c) => (
                <button key={c.id} onClick={() => setActive(c.id)} className={cx("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-start text-[13px] font-semibold lg:w-full", active === c.id ? "bg-sky text-navy" : "text-[#353C57] hover:bg-bg")}><Hash className="h-3.5 w-3.5" />{c.name}</button>
              ))}
            </div>
            {isManagerRole(s.role) && <NewChannel onCreated={(id) => { channels.reload(); setActive(id); }} />}
          </div>
          {active ? <Thread key={active} id={active} name={channels.data?.find((c) => c.id === active)?.name ?? ""} /> : channels.loading ? <Loading /> : <Empty icon={<Hash className="h-5 w-5" />} title="No channels yet" body="Create a channel for each team or location." />}
        </div>
      )}
      {tab === "announcements" && <ResourceTable resource="announcements" />}
    </div>
  );
}

function NewChannel({ onCreated }: { onCreated: (id: string) => void }) {
  const [v, setV] = useState("");
  const [open, setOpen] = useState(false);
  const toast = useToast();
  if (!open) return <button onClick={() => setOpen(true)} className="mt-1 flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-muted hover:bg-bg"><Plus className="h-3.5 w-3.5" />New channel</button>;
  return <form className="mt-1 flex gap-1 p-1" onSubmit={async (e) => { e.preventDefault(); try { const c = await api("/api/chat", { body: { name: v } }); setV(""); setOpen(false); onCreated(c.id); } catch (er: any) { toast(er.message, "err"); } }}><Input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="kitchen" className="h-8 text-xs" /><Button size="sm" type="submit"><Check className="h-3.5 w-3.5" /></Button></form>;
}

function Thread({ id, name }: { id: string; name: string }) {
  const t = useT();
  const s = useSession();
  const toast = useToast();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const last = useRef<string | null>(null);
  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const r: Msg[] = await api(`/api/chat/${id}${last.current ? `?after=${encodeURIComponent(last.current)}` : ""}`);
        if (dead) return;
        if (r.length) { last.current = r.at(-1)!.createdAt; setMsgs((m) => [...(m ?? []), ...r.filter((x) => !(m ?? []).some((y) => y.id === x.id))]); }
        else setMsgs((m) => m ?? []);
      } catch { /* retry on next tick */ }
    };
    load();
    const iv = setInterval(() => { if (document.visibilityState === "visible") load(); }, 4000);
    return () => { dead = true; clearInterval(iv); };
  }, [id]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs?.length]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim(); if (!body) return;
    setText("");
    try { const m: Msg = await api(`/api/chat/${id}`, { body: { text: body } }); last.current = m.createdAt; setMsgs((x) => [...(x ?? []), m]); }
    catch (er: any) { setText(body); toast(er.message, "err"); }
  };
  return (
    <div className="card flex h-[66vh] flex-col">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3"><Hash className="h-4 w-4 text-muted" /><b className="font-display">{name}</b></header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {!msgs ? <Loading /> : !msgs.length ? <p className="py-10 text-center text-sm text-muted">Say hello to #{name}.</p> : msgs.map((m, i) => {
          const mine = m.userId === s.user?.id;
          const grouped = i > 0 && msgs[i - 1].userId === m.userId && new Date(m.createdAt).getTime() - new Date(msgs[i - 1].createdAt).getTime() < 5 * 60000;
          return (
            <div key={m.id} className={cx("flex gap-2.5", mine && "flex-row-reverse", grouped && "-mt-2")}>
              {grouped ? <span className="w-8 shrink-0" /> : <Avatar name={m.userName} size={32} />}
              <div className={cx("max-w-[75%]", mine && "text-end")}>
                {!grouped && <div className="mb-0.5 text-xs"><b>{m.userName}</b> <span className="font-mono text-[10.5px] text-muted">{t.time(m.createdAt)}</span></div>}
                <div className={cx("inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-start text-[13.5px]", mine ? "rounded-se-md bg-navy text-white" : "rounded-ss-md bg-bg")}>{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message #${name}`} maxLength={4000} />
        <Button variant="pri" type="submit" aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
