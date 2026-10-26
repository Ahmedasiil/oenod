import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { isManager } from "@/lib/rbac";
import { audit } from "@/lib/audit";

type P = { params: Promise<{ id: string }> };

async function load(orgId: string, id: string) {
  const c = await db.issuedCertificate.findFirst({ where: { id, orgId } });
  if (!c) throw new HttpError(404, "Certificate not found.");
  return c;
}

export const GET = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg("academy");
  return ok(await load(ctx.org.id, (await params).id));
});

// Correct the details, or revoke / restore a certificate. Revoked certificates show as revoked on the public check.
export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("academy", "edit");
  if (!isManager(ctx.role)) throw new HttpError(403, "Only owners and managers can change certificates.");
  const c = await load(ctx.org.id, (await params).id);
  const d = await body(req, z.object({
    action: z.enum(["update", "revoke", "restore"]).default("update"),
    reason: z.string().trim().max(240).optional(),
    title: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(240).nullable().optional(),
    recipientName: z.string().trim().min(2).max(120).optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    signerName: z.string().trim().max(80).optional(),
    signerTitle: z.string().trim().max(80).optional(),
  }));
  const data =
    d.action === "revoke" ? { revokedAt: new Date(), revokeReason: d.reason ?? null }
    : d.action === "restore" ? { revokedAt: null, revokeReason: null }
    : { title: d.title, description: d.description, recipientName: d.recipientName, expiresAt: d.expiresAt, signerName: d.signerName, signerTitle: d.signerTitle };
  const r = await db.issuedCertificate.update({ where: { id: c.id }, data });
  await audit(ctx, `certificate.${d.action}`, "issued_certificate", c.id, d);
  return ok(r);
});
