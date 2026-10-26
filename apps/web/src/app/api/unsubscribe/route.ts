import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";
import { readUnsubscribeToken } from "@/lib/messaging";

async function unsub(t: string) {
  let r: { kind: string; id: string };
  try { r = await readUnsubscribeToken(t); } catch { throw new HttpError(400, "This unsubscribe link isn't valid."); }
  const now = new Date();
  if (r.kind === "user") await db.user.update({ where: { id: r.id }, data: { marketingEmailConsent: false, marketingSmsConsent: false, unsubscribedAt: now } });
  else if (r.kind === "lead") await db.lead.update({ where: { id: r.id }, data: { emailConsent: false, smsConsent: false, unsubscribedAt: now } });
  else if (r.kind === "contact") await db.contact.update({ where: { id: r.id }, data: { emailConsent: false, smsConsent: false, unsubscribedAt: now } });
  else if (r.kind === "jobalert") await db.jobAlert.update({ where: { id: r.id }, data: { unsubscribedAt: now } });
  return ok({ ok: true });
}

// One-click (RFC 8058) and form-based unsubscribe.
export const POST = route(async (req: Request) => {
  const t = new URL(req.url).searchParams.get("t") ?? z.object({ t: z.string() }).parse(await req.json().catch(() => ({}))).t;
  return unsub(t);
});
