import { db } from "@/lib/db";
import { HttpError, requireSuperAdmin, route } from "@/lib/http";
import { adminAudit } from "@/lib/admin";

// A document attached to a verification request, for the reviewer only. Served sandboxed so it can't run scripts.
export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) => {
  const ctx = await requireSuperAdmin();
  const { id, docId } = await params;
  const v = await db.verificationRequest.findUnique({ where: { id }, select: { orgId: true, documentIds: true } });
  if (!v || !v.documentIds.includes(docId)) throw new HttpError(404, "Document not found.");
  const doc = await db.document.findFirst({ where: { id: docId, orgId: v.orgId }, select: { name: true, mime: true, data: true } });
  if (!doc?.data) throw new HttpError(404, "Document not found.");
  await adminAudit(ctx.user.id, "verification.document_viewed", "verification_request", id, { docId });
  const safe = doc.name.replace(/[^\w.\- ]/g, "_");
  return new Response(Buffer.from(doc.data), {
    headers: { "Content-Type": doc.mime ?? "application/octet-stream", "Content-Disposition": `inline; filename="${safe}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" },
  });
});
