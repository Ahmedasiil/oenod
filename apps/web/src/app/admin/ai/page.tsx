"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, Sparkles, Trash2, ShieldCheck } from "lucide-react";
import { api, useApi } from "@/lib/client/api";
import { ago } from "@/lib/format";
import { Markdown } from "@/components/markdown";
import { Spinner, cx, useToast } from "@/components/ui";
import { ProposalCard, type Action } from "../proposal";

type Turn = { role: "user" | "assistant"; text: string };

const STARTERS = [
  "How is the business doing this month compared to last?",
  "Which trials end this week, and who looks likely to convert?",
  "Review everything waiting for me: badges, ads and plugins.",
  "Draft a win-back email for companies that cancelled in the last 60 days.",
  "Is anything unhealthy right now? Check messages, incidents and plugins.",
  "Plan a maintenance window for the mobile apps tonight at 11 pm for 30 minutes.",
];

export default function AdminAi() {
  const toast = useToast();
  const { data: convos, reload: reloadConvos } = useApi<{ data: { id: string; title: string; updatedAt: string }[] }>("/api/admin/ai/conversations");
  const { data: queue, reload: reloadQueue } = useApi<{ data: Action[] }>("/api/admin/actions?status=PROPOSED");
  const [id, setId] = useState<string | undefined>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, busy]);

  const open = async (cid: string) => {
    setId(cid); setTurns([]);
    try { const r = await api<{ turns: Turn[] }>(`/api/admin/ai/conversations/${cid}`); setTurns(r.turns); } catch (e: any) { toast(e.message, "err"); }
  };
  const remove = async (cid: string) => {
    await api(`/api/admin/ai/conversations/${cid}`, { method: "DELETE" });
    if (cid === id) { setId(undefined); setTurns([]); }
    reloadConvos();
  };
  const send = async (msg = text) => {
    const m = msg.trim();
    if (!m || busy) return;
    setText(""); setBusy(true); setTurns((t) => [...t, { role: "user", text: m }]);
    try {
      const r = await api<{ conversationId: string; reply: string }>("/api/admin/ai/chat", { body: { message: m, conversationId: id } });
      setId(r.conversationId); setTurns((t) => [...t, { role: "assistant", text: r.reply }]);
      reloadConvos(); reloadQueue();
    } catch (e: any) {
      setTurns((t) => [...t, { role: "assistant", text: `**I couldn't do that.** ${e.message}` }]);
    } finally { setBusy(false); }
  };

  const waiting = queue?.data ?? [];
  return (
    <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)_340px]">
      <aside className="hidden space-y-2 xl:block">
        <button onClick={() => { setId(undefined); setTurns([]); }} className="btn w-full justify-start"><Plus className="h-4 w-4" />New conversation</button>
        <ul className="space-y-0.5">
          {convos?.data.map((c) => (
            <li key={c.id} className="group flex items-center">
              <button onClick={() => open(c.id)} className={cx("min-w-0 flex-1 rounded-lg px-2.5 py-2 text-start", c.id === id ? "bg-sky text-navy" : "hover:bg-bg")}><b className="block truncate text-[13px]">{c.title}</b><small className="text-[11px] text-muted">{ago(c.updatedAt)}</small></button>
              <button onClick={() => remove(c.id)} className="btn-ghost btn-sm opacity-0 group-hover:opacity-100" aria-label="Delete conversation"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="card flex min-h-[calc(100dvh-120px)] min-w-0 flex-col overflow-hidden">
        <header className="navy-panel m-3 flex items-center gap-3 rounded-2xl p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><Sparkles className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1"><b className="font-display text-[17px]">AI operator</b><p className="text-[12.5px] text-[#C9D4FF]">Reads the whole platform. Prepares changes for your approval and never runs them on its own.</p></div>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!turns.length && (
            <div className="mx-auto max-w-2xl py-6 text-center">
              <h2 className="font-display text-[24px] font-semibold tracking-tight">What should we look at?</h2>
              <p className="mt-1 text-[13.5px] text-muted">Ask about revenue, customers, growth or platform health, or tell it what to change.</p>
              <div className="mt-6 grid gap-2 text-start sm:grid-cols-2">
                {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-xl border border-line bg-paper px-3.5 py-3 text-[13px] leading-5 transition hover:border-[#C9D4FF] hover:bg-sky/40">{s}</button>)}
              </div>
            </div>
          )}
          {turns.map((t, i) => t.role === "user"
            ? <div key={i} className="ms-auto max-w-[80%] rounded-2xl rounded-ee-md bg-navy px-4 py-2.5 text-[14px] text-white">{t.text}</div>
            : <div key={i} className="max-w-[90%] rounded-2xl rounded-es-md border border-line bg-paper px-4 py-3 text-[14px]"><Markdown text={t.text} /></div>)}
          {busy && <div className="flex items-center gap-2 text-[13px] text-muted"><Spinner className="h-4 w-4" />Looking across the platform…</div>}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="m-3 flex items-end gap-2 rounded-2xl border border-line bg-bg p-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder="Ask or instruct the AI operator…" className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[14px] outline-none" />
          <button disabled={busy || !text.trim()} className="btn-pri h-11 w-11 shrink-0 px-0" aria-label="Send"><ArrowUp className="h-5 w-5" /></button>
        </form>
      </section>

      <aside className="space-y-3">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue" /><b className="text-[14px]">Waiting for your approval</b><span className="ms-auto rounded-full bg-sky px-2 font-mono text-[11px] text-blue">{waiting.length}</span></div>
        {!waiting.length ? <p className="rounded-2xl border border-dashed border-line p-5 text-center text-[13px] text-muted">Nothing waiting. Proposals the AI prepares show up here.</p>
          : waiting.map((a) => <ProposalCard key={a.id} a={a} onDone={() => reloadQueue()} />)}
      </aside>
    </div>
  );
}
