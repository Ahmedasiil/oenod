import { loadPlatformSettings } from "@/lib/platform-plugins";
import { db } from "@/lib/db";
import { clientIp, fail, HttpError, ok } from "@/lib/http";
import { decrypt, hmac, safeEqual } from "@/lib/crypto";
import { limit } from "@/lib/ratelimit";
import { handleInbound } from "@/lib/integrations/custom";
import { serialize } from "@/lib/resources";

/**
 * Inbound webhook: any outside app (Zapier, forms, e-commerce, IoT...) can POST JSON
 * here and OENOD creates a record. Optional HMAC: X-Signature: sha256=hex(hmac(secret, body)).
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  await loadPlatformSettings();
  try {
    const t = (await params).token;
    if (!limit(`hook:${t}`, 300, 60_000) || !limit(`hookip:${clientIp(req)}`, 600, 60_000)) throw new HttpError(429, "Slow down.");
    const c = await db.customConnector.findUnique({ where: { inboundToken: t } });
    if (!c || c.status === "PAUSED") throw new HttpError(404, "Unknown hook.");
    const raw = await req.text();
    if (raw.length > 1_000_000) throw new HttpError(413, "Payload too large.");
    const secret = decrypt(((c.authConfig ?? {}) as Record<string, string>).inboundSecretEnc) ?? ((c.authConfig ?? {}) as Record<string, string>).inboundSecret;
    if (secret) {
      const sig = (req.headers.get("x-signature") ?? req.headers.get("x-hub-signature-256") ?? "").replace(/^sha256=/, "");
      if (!sig || !safeEqual(sig, hmac(secret, raw))) throw new HttpError(401, "Bad signature.");
    }
    let payload: unknown;
    try { payload = JSON.parse(raw); } catch { payload = Object.fromEntries(new URLSearchParams(raw)); }
    const items = Array.isArray(payload) ? payload.slice(0, 100) : [payload];
    const created = [];
    for (const item of items) created.push(serialize(await handleInbound(c, item)));
    return ok({ ok: true, created: created.map((r: any) => r.id) }, 201);
  } catch (e) {
    return fail(e);
  }
}
