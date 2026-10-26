"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUp, Sparkles, CheckCircle2, Clock, Ban, FlaskConical, AlertTriangle } from "lucide-react";
import { api } from "@/lib/client/api";
import { useT } from "./i18n";
import { Markdown } from "./markdown";
import { cx } from "./ui";

type Msg = { role: "user" | "assistant"; text: string; actions?: { tool: string; status: string; actionId?: string; message?: string }[]; error?: boolean };

const STATUS_ICON: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="h-4 w-4 text-ok" />, NEEDS_APPROVAL: <Clock className="h-4 w-4 text-warn" />, BLOCKED: <Ban className="h-4 w-4 text-crit" />,
  SIMULATED: <FlaskConical className="h-4 w-4 text-blue" />, FAILED: <AlertTriangle className="h-4 w-4 text-crit" />,
};

/** Conversation with the AI Business Manager (or, with endpoint="/api/admin/ai/chat", the super admin assistant). */
export function AiChat({ endpoint = "/api/ai/chat", suggestions, compact, initialConversationId, approvalsHref = "/app/ai?tab=approvals", initialPrompt }: { initialPrompt?: string; endpoint?: string; suggestions?: string[]; compact?: boolean; initialConversationId?: string; approvalsHref?: string }) {
  const t = useT();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState(initialPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [convo, setConvo] = useState<string | undefined>(initialConversationId);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  const send = async (q?: string) => {
    const message = (q ?? text).trim();
    if (!message || busy) return;
    setText("");
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const r = await api<{ conversationId: string; reply: string; actions?: Msg["actions"] }>(endpoint, { body: { message, conversationId: convo } });
      setConvo(r.conversationId);
      setMsgs((m) => [...m, { role: "assistant", text: r.reply, actions: r.actions }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", text: e.message, error: true }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cx("min-h-0 flex-1 space-y-4 overflow-y-auto", compact ? "px-4 py-4" : "px-1 py-2")}>
        {!msgs.length && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted"><Sparkles className="h-4 w-4 text-blue" />{t("ai.placeholder")}</div>
            <div className="flex flex-wrap gap-2">
              {(suggestions ?? []).map((s) => <button key={s} onClick={() => send(s)} className="rounded-xl border border-line bg-paper px-3 py-2 text-start text-[13px] font-semibold text-[#353C57] transition hover:border-blue hover:text-navy">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[92%] rounded-2xl px-4 py-3 text-[13.5px] leading-6", m.role === "user" ? "bg-navy text-white" : m.error ? "border border-[#F3C5CD] bg-[#FFF5F7] text-crit" : "border border-line bg-paper")}>
              {m.role === "assistant" && !m.error ? <Markdown text={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
              {!!m.actions?.length && (
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {m.actions.map((a, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs">
                      {STATUS_ICON[a.status] ?? <Clock className="h-4 w-4" />}
                      <span className="min-w-0 flex-1"><b className="font-semibold">{a.tool.replace(/_/g, " ")}</b>{a.message ? ` · ${a.message}` : ""}</span>
                      {a.status === "NEEDS_APPROVAL" && <Link href={approvalsHref} className="font-bold text-blue">{t("common.view")}</Link>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-blue" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue" /></span>{t("ai.thinking")}
          </div>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className={cx("flex items-end gap-2 border-t border-line bg-paper", compact ? "p-3" : "pt-3")}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder={t("ai.placeholder")} maxLength={8000}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          className="input max-h-40 min-h-[44px] flex-1 resize-none py-2.5" />
        <button type="submit" disabled={busy || !text.trim()} aria-label={t("common.send")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy text-white transition disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
      </form>
    </div>
  );
}
