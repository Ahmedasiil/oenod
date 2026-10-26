import { z } from "zod";
import { db } from "@/lib/db";
import { body, ok, requireSuperAdmin, route } from "@/lib/http";
import { notify } from "@/lib/audit";
import { adminAudit } from "@/lib/admin";

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireSuperAdmin();
  const id = (await params).id;
  const d = await body(req, z.object({ decision: z.enum(["publish", "reject", "unpublish"]), note: z.string().max(600).optional(), verified: z.boolean().optional(), featured: z.boolean().optional() }));
  const p = await db.plugin.update({ where: { id }, data: { status: d.decision === "publish" ? "PUBLISHED" : d.decision === "reject" ? "REJECTED" : "DRAFT", reviewNote: d.note ?? null, ...(d.verified !== undefined ? { verified: d.verified } : {}), ...(d.featured !== undefined ? { featured: d.featured } : {}) } });
  if (p.publisherOrgId) await notify(p.publisherOrgId, `Your plugin ${p.name} was ${d.decision === "publish" ? "published" : d.decision === "reject" ? "not approved" : "unpublished"}`, { body: d.note, link: "/app/developers", level: d.decision === "publish" ? "success" : "warning" });
  await adminAudit(ctx.user.id, `plugin_review.${d.decision}`, "plugin", id, d);
  return ok(p);
});
