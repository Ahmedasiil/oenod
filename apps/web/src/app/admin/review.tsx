"use client";
import { useState } from "react";
import { Button, Textarea } from "@/components/ui";

/** Decision buttons with an optional note, shared by the review queues. */
export function Decide({ options, onDecide }: { options: { key: string; label: string; primary?: boolean; needsNote?: boolean }[]; onDecide: (key: string, note?: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note to the company (required when asking for changes)" />
      <div className="flex flex-wrap justify-end gap-2">
        {options.map((o) => (
          <Button key={o.key} size="sm" variant={o.primary ? "pri" : "default"} loading={busy === o.key} disabled={!!busy || (o.needsNote && !note.trim())}
            onClick={async () => { setBusy(o.key); try { await onDecide(o.key, note.trim() || undefined); setNote(""); } finally { setBusy(null); } }}>{o.label}</Button>
        ))}
      </div>
    </div>
  );
}
