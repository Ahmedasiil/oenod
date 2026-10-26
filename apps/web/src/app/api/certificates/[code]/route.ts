import { HttpError, clientIp, ok, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { findCertificate } from "@/lib/certificate";

// Public check: anyone (an employer, an inspector) can confirm a certificate is genuine.
export const GET = route(async (req: Request, { params }: { params: Promise<{ code: string }> }) => {
  if (!limit(`cert:${clientIp(req)}`, 60)) throw new HttpError(429, "Too many lookups. Try again in a minute.");
  const c = await findCertificate((await params).code);
  if (!c) throw new HttpError(404, "We couldn't find a certificate with that ID.");
  const expired = Boolean(c.expiresAt && c.expiresAt < new Date());
  return ok({
    valid: !c.revoked && !expired, status: c.revoked ? "REVOKED" : expired ? "EXPIRED" : "VALID",
    code: c.code, kind: c.kind, name: c.recipient, title: c.title, hours: c.hours, issuedAt: c.issuedAt, expiresAt: c.expiresAt ?? null,
    issuer: c.source === "academy" ? "OENOD Academy" : c.company?.name, providedBy: c.company ? { name: c.company.name, verified: c.company.verified } : null,
    imageUrl: `/api/certificates/${c.code}/image`,
  });
});
