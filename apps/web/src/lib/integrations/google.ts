import { db } from "../db";
import { accessToken } from "./oauth";
import { emit } from "../webhooks";

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

async function g(orgId: string, url: string, init: RequestInit = {}) {
  const t = await accessToken(orgId, "google_business");
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as any)?.error?.message || `Google returned ${r.status}`);
  return j as any;
}

/** Pull locations and reviews from Google Business Profile into OENOD. */
export async function syncGoogleBusiness(orgId: string) {
  const integ = await db.integration.findUnique({ where: { orgId_provider: { orgId, provider: "google_business" } } });
  try {
    const accounts = await g(orgId, "https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
    let imported = 0;
    const locations: { name: string; title: string; account: string }[] = [];
    for (const a of accounts.accounts ?? []) {
      const ls = await g(orgId, `https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title&pageSize=100`);
      for (const l of ls.locations ?? []) {
        locations.push({ name: l.name, title: l.title, account: a.name });
        const reviews = await g(orgId, `https://mybusiness.googleapis.com/v4/${a.name}/${l.name}/reviews?pageSize=50`);
        for (const rv of reviews.reviews ?? []) {
          const data = {
            author: rv.reviewer?.displayName ?? "Google user",
            rating: STARS[rv.starRating] ?? 0,
            text: rv.comment ?? null,
            reply: rv.reviewReply?.comment ?? null,
            repliedAt: rv.reviewReply?.updateTime ? new Date(rv.reviewReply.updateTime) : null,
            postedAt: new Date(rv.createTime),
          };
          const existing = await db.review.findUnique({ where: { orgId_source_externalId: { orgId, source: "GOOGLE", externalId: rv.name } } });
          if (existing) await db.review.update({ where: { id: existing.id }, data });
          else {
            const created = await db.review.create({ data: { ...data, orgId, source: "GOOGLE", externalId: rv.name } });
            await emit(orgId, "review.received", created);
            imported++;
          }
        }
      }
    }
    await db.integration.update({ where: { id: integ!.id }, data: { lastSyncAt: new Date(), status: "CONNECTED", lastError: null, config: { locations } } });
    return { imported, locations: locations.length };
  } catch (e) {
    if (integ) await db.integration.update({ where: { id: integ.id }, data: { status: "ERROR", lastError: e instanceof Error ? e.message : String(e) } });
    throw e;
  }
}

/** externalId is the full review resource name: accounts/x/locations/y/reviews/z */
export async function replyToGoogleReview(orgId: string, externalId: string, comment: string) {
  await g(orgId, `https://mybusiness.googleapis.com/v4/${externalId}/reply`, { method: "PUT", body: JSON.stringify({ comment }) });
}

export async function publishGooglePost(orgId: string, summary: string) {
  const integ = await db.integration.findUnique({ where: { orgId_provider: { orgId, provider: "google_business" } } });
  const locs = ((integ?.config as any)?.locations ?? []) as { name: string; account: string }[];
  for (const l of locs) {
    await g(orgId, `https://mybusiness.googleapis.com/v4/${l.account}/${l.name}/localPosts`, { method: "POST", body: JSON.stringify({ languageCode: "en", summary, topicType: "STANDARD" }) });
  }
  return locs.length;
}
