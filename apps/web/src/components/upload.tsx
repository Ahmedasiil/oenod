"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useToast, cx } from "@/components/ui";

/** Upload a public image (logo, cover, avatar) and get back its URL. */
export async function uploadImage(file: File, kind = "GALLERY"): Promise<string> {
  const f = new FormData();
  f.append("file", file);
  f.append("kind", kind);
  const r = await fetch("/api/uploads", { method: "POST", body: f, credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Upload failed");
  return j.url;
}

export function ImageInput({ value, onChange, kind = "LOGO", shape = "square", label = "Upload" }: { value?: string | null; onChange: (url: string | null) => void; kind?: string; shape?: "square" | "wide" | "round"; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const box = shape === "wide" ? "h-28 w-full max-w-md" : shape === "round" ? "h-20 w-20 rounded-full" : "h-20 w-20";
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => ref.current?.click()} className={cx("relative grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-line bg-bg text-muted transition hover:border-blue hover:text-blue", box)}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1 text-[11px] font-bold"><ImagePlus className="h-5 w-5" />{label}</span>}
      </button>
      {value && <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-crit"><X className="h-3.5 w-3.5" />Remove</button>}
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = "";
        if (!f) return;
        setBusy(true);
        try { onChange(await uploadImage(f, kind)); } catch (er: any) { toast(er.message, "err"); } finally { setBusy(false); }
      }} />
    </div>
  );
}
