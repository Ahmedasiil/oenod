import { Logo } from "./logo";

/** Full-page "under construction" screen the super admin can switch on per surface. */
export function MaintenanceScreen({ title, message, endsAt, mode }: { title?: string; message?: string; endsAt?: Date | string | null; mode?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-navy px-6 text-white" style={{ backgroundImage: "radial-gradient(60% 50% at 50% 0, rgba(35,66,224,.45), transparent 70%)" }}>
      <div className="max-w-md text-center">
        <Logo tone="white" href={null} className="mx-auto h-8 w-auto" />
        <div className="mx-auto mt-10 grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" /></svg>
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">{mode === "UPDATE_REQUIRED" ? "Update required" : title ?? "We'll be right back"}</h1>
        <p className="mt-3 leading-7 text-[#D8E0FF]">{message ?? "OENOD is getting an upgrade. Everything will be back shortly."}</p>
        {endsAt && <p className="mt-4 font-mono text-xs uppercase tracking-[.14em] text-[#C9D4FF]">Expected back around {new Date(endsAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}</p>}
        <a href="/status" className="mt-8 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-navy">System status</a>
      </div>
    </div>
  );
}
