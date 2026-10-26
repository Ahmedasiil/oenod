import { getCtx } from "@/lib/auth";
import { gate } from "@/lib/platform";
import { MaintenanceScreen } from "@/components/maintenance-screen";
import { SiteFooter, SiteHeader } from "@/components/site";

export const dynamic = "force-dynamic";

// Public website: home, pricing, Jobs, Academy, company profiles. The super admin can pause it on its own.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx().catch(() => null);
  const g = await gate("marketing");
  if (g.blocked && !(g.allowAdmins && ctx?.user?.isSuperAdmin)) return <MaintenanceScreen title={g.title} message={g.message} endsAt={g.endsAt} mode={g.mode} />;
  const home = !ctx?.user ? "/signin" : ctx.role === "EMPLOYEE" ? "/me" : ctx.org ? "/app" : ctx.user.isSuperAdmin ? "/admin" : "/academy/my";
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <SiteHeader signedIn={Boolean(ctx?.user)} home={home} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
