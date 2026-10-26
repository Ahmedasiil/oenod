import { db } from "./db";
import { sendPush } from "./push";
import type { Ctx } from "./auth";

export async function audit(ctx: Partial<Ctx> & { orgId?: string | null }, action: string, entity?: string, entityId?: string, data?: unknown) {
  try {
    await db.auditLog.create({
      data: {
        orgId: ctx.orgId ?? ctx.org?.id ?? null,
        userId: ctx.user?.id ?? null,
        actor: ctx.actor ?? "system",
        action,
        entity,
        entityId,
        data: data === undefined ? undefined : JSON.parse(JSON.stringify(data)),
      },
    });
  } catch (e) {
    console.error("audit failed", e);
  }
}

export async function notify(orgId: string, title: string, opts: { body?: string; link?: string; level?: string; userId?: string } = {}) {
  const n = await db.notification.create({ data: { orgId, title, body: opts.body, link: opts.link, level: opts.level ?? "info", userId: opts.userId } });
  // Personal notifications also go to the person's phone.
  if (opts.userId) await sendPush(opts.userId, title, opts.body, { link: opts.link, id: n.id }).catch(() => {});
}
