import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { loadSession } from "@/lib/session";
import { gate, surfaceOf } from "@/lib/platform";
import { SessionProvider } from "@/components/session";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { PayShell } from "./shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "oenodpay", icons: { icon: "/brand/oenodpay-icon.svg", apple: "/brand/oenodpay-icon-1024.png" } };

// oenodpay is personal: it needs a signed-in person, not a company workspace.
export default async function PayLayout({ children }: { children: React.ReactNode }) {
  const s = await loadSession();
  const h = await headers();
  const path = h.get("x-pathname") ?? "/pay";
  if (!s) redirect(`/signin?next=${encodeURIComponent(path)}`);
  const client = surfaceOf(h);
  const g = await gate(client.surface === "desktop" || client.surface === "mobile" ? client.surface : "app", { version: client.version, locale: s.user.locale ?? undefined });
  if (g.blocked && !(g.allowAdmins && s.user.isSuperAdmin)) return <MaintenanceScreen title={g.title} message={g.message} endsAt={g.endsAt} mode={g.mode} />;
  return (
    <SessionProvider value={s}>
      <PayShell>{children}</PayShell>
    </SessionProvider>
  );
}
