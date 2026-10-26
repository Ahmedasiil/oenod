import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { loadSession } from "@/lib/session";
import { gate, surfaceOf } from "@/lib/platform";
import { SessionProvider } from "@/components/session";
import { AppShell } from "@/components/app-shell";
import { MaintenanceScreen } from "@/components/maintenance-screen";

export const dynamic = "force-dynamic";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const s = await loadSession();
  const h = await headers();
  const path = h.get("x-pathname") ?? "/me";
  if (!s) redirect(`/signin?next=${encodeURIComponent(path)}`);
  if (!s.org) redirect("/signup?step=company");
  // The desktop app follows its own switch in super admin; browsers follow the web app's.
  const client = surfaceOf(h);
  const g = await gate(client.surface === "desktop" || client.surface === "mobile" ? client.surface : "app", { version: client.version, locale: s.user.locale ?? undefined });
  const bypass = (g.allowAdmins && s.user.isSuperAdmin) || g.allowOrgIds?.includes(s.org.id);
  if (g.blocked && !bypass) return <MaintenanceScreen title={g.title} message={g.message} endsAt={g.endsAt} mode={g.mode} />;
  return (
    <SessionProvider value={s}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
