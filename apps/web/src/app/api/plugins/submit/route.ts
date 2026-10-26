import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { audit } from "@/lib/audit";
import { Manifest } from "@/lib/plugins";

const Input = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/), name: z.string().min(2).max(60), tagline: z.string().min(5).max(120), description: z.string().min(30).max(8000),
  category: z.string().max(40).default("Productivity"), website: z.string().url().optional(), supportEmail: z.string().email(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#000F55"), iconUrl: z.string().url().startsWith("https://").optional(),
  priceCents: z.number().int().min(0).max(100000).default(0), manifest: Manifest,
});

// Developers build plugins with the public API and submit them. The super admin reviews each one before it is listed.
export const GET = route(async () => {
  const ctx = await requireOrg("developers");
  return ok(await db.plugin.findMany({ where: { publisherOrgId: ctx.org.id }, orderBy: { updatedAt: "desc" } }));
});

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("developers", "edit");
  if (!["OWNER", "ADMIN"].includes(ctx.role)) throw new HttpError(403, "Only owners and admins can publish plugins.");
  const d = await body(req, Input);
  const existing = await db.plugin.findUnique({ where: { slug: d.slug } });
  if (existing && existing.publisherOrgId !== ctx.org.id) throw new HttpError(409, "That name is taken. Try another.");
  const data = { ...d, manifest: d.manifest as object, developer: ctx.org.name, publisherOrgId: ctx.org.id, status: "REVIEW", reviewNote: null };
  const p = existing ? await db.plugin.update({ where: { id: existing.id }, data }) : await db.plugin.create({ data });
  await audit(ctx, "plugin.submitted", "plugin", p.id, { slug: p.slug });
  return ok({ id: p.id, status: p.status, note: "Thanks. Our team reviews new plugins and updates, usually within two business days." }, existing ? 200 : 201);
});
