import { AlertTriangle } from "lucide-react";

/** Shell for policy pages. The text is a starting template: have a lawyer review it before launch. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <span className="eyebrow">Legal</span>
      <h1 className="mt-2 font-display text-[38px] font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-[13px] text-muted">Last updated {updated}</p>
      {process.env.NEXT_PUBLIC_LEGAL_REVIEWED !== "1" && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-[#FFD98A] bg-[#FFF8E6] p-4 text-[13.5px] text-[#6B4A00]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p><b>Template.</b> This is a starting draft, not legal advice. Have a lawyer review it for your business and the places you operate, fill in the bracketed details, then set NEXT_PUBLIC_LEGAL_REVIEWED=1 to hide this notice.</p>
        </div>
      )}
      <div className="legal mt-8 space-y-4 text-[15px] leading-7 text-[#353C57] [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-[21px] [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ms-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
    </div>
  );
}
