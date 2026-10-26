import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/format";

export const GET = route(async () => {
  const ctx = await requireOrg("settings");
  const o = ctx.org;
  return ok({ data: { name: o.name, slug: o.slug, industry: o.industry, tagline: o.tagline, about: o.about, email: o.email, phone: o.phone, website: o.website, address: o.address, lat: o.lat, lng: o.lng, logoUrl: o.logoUrl, coverUrl: o.coverUrl, brandColor: o.brandColor, hours: o.hours, services: o.services, gallery: o.gallery, social: o.social, foundedYear: o.foundedYear, teamSize: o.teamSize, publicProfile: o.publicProfile, verificationStatus: o.verificationStatus, locale: o.locale, timezone: o.timezone, currency: o.currency } });
});

const url = z.string().url().max(500).or(z.literal("")).nullable();
const Schema = z.object({
  name: z.string().trim().min(2).max(120), slug: z.string().trim().min(3).max(60).regex(/^[a-z0-9-]+$/), industry: z.string().max(40), tagline: z.string().max(160).nullable(), about: z.string().max(5000).nullable(),
  email: z.string().email().or(z.literal("")).nullable(), phone: z.string().max(30).nullable(), website: url, logoUrl: url, coverUrl: url, brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  address: z.object({ line1: z.string().optional(), line2: z.string().optional(), city: z.string().optional(), region: z.string().optional(), postalCode: z.string().optional(), country: z.string().optional() }).nullable(),
  lat: z.number().min(-90).max(90).nullable(), lng: z.number().min(-180).max(180).nullable(),
  hours: z.record(z.string().max(40)).nullable(), services: z.array(z.string().max(60)).max(40), gallery: z.array(z.string().url()).max(20),
  social: z.record(z.string().url().or(z.literal(""))).nullable(), foundedYear: z.number().int().min(1800).max(2100).nullable(), teamSize: z.string().max(20).nullable(), publicProfile: z.boolean(),
  locale: z.string().max(10), timezone: z.string().max(60),
}).partial();

export const PATCH = route(async (req: Request) => {
  const ctx = await requireOrg("settings", "edit");
  if (!["OWNER", "ADMIN", "MANAGER"].includes(ctx.role)) throw new HttpError(403, "Only owners, admins and managers can edit the company profile.");
  const d = await body(req, Schema);
  if (d.slug && d.slug !== ctx.org.slug && (await db.organization.findUnique({ where: { slug: d.slug } }))) throw new HttpError(409, "That profile address is taken.");
  // Changing legal identity details removes the badge until re-checked.
  const reverify = ctx.org.verificationStatus === "VERIFIED" && d.name && slugify(d.name) !== slugify(ctx.org.name);
  const row = await db.organization.update({ where: { id: ctx.org.id }, data: { ...d, address: d.address === null ? Prisma.DbNull : d.address, hours: d.hours === null ? Prisma.DbNull : d.hours, social: d.social === null ? Prisma.DbNull : d.social, email: d.email || null, website: d.website || null, logoUrl: d.logoUrl || null, coverUrl: d.coverUrl || null, ...(reverify ? { verificationStatus: "PENDING" } : {}) } });
  await audit(ctx, "company.profile_updated", "organization", ctx.org.id, d);
  return ok({ data: { slug: row.slug, verificationStatus: row.verificationStatus } });
});
