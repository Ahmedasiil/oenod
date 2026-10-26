import { loadPlatformSettings } from "@/lib/platform-plugins";
import { db } from "@/lib/db";
import { runDueMonitors } from "@/lib/monitors";
import { markOffline } from "@/lib/fleet";
import { retryDue } from "@/lib/webhooks";
import { runLifecycle, sendGrowthCampaign } from "@/lib/growth";
import { safeEqual } from "@/lib/crypto";

export const maxDuration = 300;

/**
 * Background jobs. Call every 5 minutes from your host's scheduler (Vercel Cron,
 * cron + curl, GitHub Actions...) with: Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: Request) {
  await loadPlatformSettings();
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? new URL(req.url).searchParams.get("key") ?? "";
  if (!secret || !safeEqual(got, secret)) return new Response("Unauthorized", { status: 401 });
  const out: Record<string, unknown> = {};
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try { out[name] = await fn(); } catch (e) { out[name] = `error: ${e instanceof Error ? e.message : e}`; }
  };
  await step("monitors", runDueMonitors);
  await step("vehiclesOffline", markOffline);
  await step("webhookRetries", retryDue);
  await step("overdueInvoices", async () => (await db.invoice.updateMany({ where: { status: { in: ["SENT", "PARTIAL"] }, dueDate: { lt: new Date() } }, data: { status: "OVERDUE" } })).count);
  await step("complianceOverdue", async () => (await db.complianceItem.updateMany({ where: { status: "OPEN", dueDate: { lt: new Date() } }, data: { status: "OVERDUE" } })).count);
  await step("scheduledGrowthCampaigns", async () => {
    const due = await db.growthCampaign.findMany({ where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } } });
    for (const c of due) await sendGrowthCampaign(c.id);
    return due.length;
  });
  await step("lifecycle", async () => (new Date().getMinutes() < 5 ? runLifecycle() : "hourly"));
  await step("cleanup", async () => (await db.vehiclePosition.deleteMany({ where: { at: { lt: new Date(Date.now() - 180 * 864e5) } } })).count);
  return Response.json({ ok: true, at: new Date().toISOString(), ...out });
}
