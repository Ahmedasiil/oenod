import { db } from "@/lib/db";

// For uptime monitors and load balancers. Doesn't reveal configuration.
export async function GET() {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up", ms: Date.now() - started, time: new Date() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
