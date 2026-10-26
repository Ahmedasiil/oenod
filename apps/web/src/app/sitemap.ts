import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { APP_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

// Public pages, open jobs, Academy courses and business profiles, so search engines can find them.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/pricing", "/jobs", "/academy", "/companies", "/plugins", "/developers", "/partners", "/security", "/download", "/status", "/contact", "/legal/privacy", "/legal/terms"]
    .map((p) => ({ url: `${APP_URL}${p}`, changeFrequency: "weekly" as const, priority: p ? 0.7 : 1 }));
  const [jobs, courses, orgs] = await Promise.all([
    db.jobPosting.findMany({ where: { status: "OPEN", isPublic: true }, select: { slug: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 20000 }).catch(() => []),
    db.course.findMany({ where: { published: true, isPublic: true }, select: { slug: true, updatedAt: true }, take: 5000 }).catch(() => []),
    db.organization.findMany({ where: { publicProfile: true, subscriptionStatus: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] } }, select: { slug: true, updatedAt: true }, take: 20000 }).catch(() => []),
  ]);
  return [
    ...pages,
    ...jobs.map((j) => ({ url: `${APP_URL}/jobs/${j.slug}`, lastModified: j.createdAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...courses.map((c) => ({ url: `${APP_URL}/academy/${c.slug}`, lastModified: c.updatedAt, priority: 0.6 })),
    ...orgs.map((o) => ({ url: `${APP_URL}/companies/${o.slug}`, lastModified: o.updatedAt, priority: 0.5 })),
  ];
}
