import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";

// Public company profile: everything people need to know about the business.
export const GET = route(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const o = await db.organization.findUnique({ where: { slug: (await params).slug } });
  if (!o || !o.publicProfile) throw new HttpError(404, "Company not found.");
  const [jobs, courses, reviews, rating, followers, locations] = await Promise.all([
    db.jobPosting.findMany({ where: { orgId: o.id, status: "OPEN", isPublic: true }, select: { slug: true, title: true, city: true, employmentType: true, workplace: true, salaryMin: true, salaryMax: true, salaryPeriod: true, currency: true, publishedAt: true }, orderBy: { publishedAt: "desc" }, take: 20 }),
    db.course.findMany({ where: { orgId: o.id, isPublic: true, published: true }, select: { slug: true, title: true, summary: true, priceCents: true, currency: true, coverColor: true }, take: 12 }),
    db.review.findMany({ where: { orgId: o.id, rating: { gte: 1 } }, select: { author: true, rating: true, text: true, source: true, postedAt: true, reply: true }, orderBy: { postedAt: "desc" }, take: 10 }),
    db.review.aggregate({ where: { orgId: o.id, rating: { gte: 1 } }, _avg: { rating: true }, _count: true }),
    db.companyFollow.count({ where: { orgId: o.id } }),
    db.location.findMany({ where: { orgId: o.id }, select: { name: true, address: true, lat: true, lng: true } }),
  ]);
  return ok({
    company: { name: o.name, slug: o.slug, legalName: o.verificationStatus === "VERIFIED" ? o.legalName : null, tagline: o.tagline, about: o.about, industry: o.industry, email: o.email, phone: o.phone, website: o.website, address: o.address, lat: o.lat, lng: o.lng, logoUrl: o.logoUrl, coverUrl: o.coverUrl, brandColor: o.brandColor, hours: o.hours, services: o.services, gallery: o.gallery, social: o.social, foundedYear: o.foundedYear, teamSize: o.teamSize, verified: o.verificationStatus === "VERIFIED", verifiedAt: o.verifiedAt, memberSince: o.createdAt },
    jobs, courses, reviews, rating: { average: rating._avg.rating ? Math.round(rating._avg.rating * 10) / 10 : null, count: rating._count }, followers, locations,
  });
});
