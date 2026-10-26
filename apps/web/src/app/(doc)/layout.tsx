import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Pages a company sends to its customers (invoice, quote, project portal). The company leads; OENOD signs off.
export default function DocLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">{children}</main>
      <footer className="flex items-center justify-center gap-2 pb-10 text-[11.5px] text-muted">Powered by <Logo className="h-3.5 w-auto opacity-80" /></footer>
    </div>
  );
}
