import { z } from "zod";
import { db } from "@/lib/db";
import { getCtx } from "@/lib/auth";
import { clientIp, HttpError, ok, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { emit } from "@/lib/webhooks";
import { notify } from "@/lib/audit";
import { emailLayout, sendEmail } from "@/lib/messaging";
import { scoreApplication } from "@/lib/recruiting";

const Schema = z.object({
  jobId: z.string(),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().max(30).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  coverLetter: z.string().max(8000).optional().or(z.literal("")),
  resumeText: z.string().max(30000).optional().or(z.literal("")),
  marketingConsent: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

// Public: apply without an account (multipart form with optional resume file).
export const POST = route(async (req: Request) => {
  if (!limit(`apply:${clientIp(req)}`, 15, 3600_000)) throw new HttpError(429, "Too many applications from this network. Try again later.");
  const form = await req.formData();
  const d = Schema.parse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  const file = form.get("resume");
  let resume: { name: string; mime: string; data: Buffer } | null = null;
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) throw new HttpError(422, "Resume must be under 5 MB.");
    if (!["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.type)) throw new HttpError(422, "Upload a PDF, Word or text file.");
    resume = { name: file.name, mime: file.type, data: Buffer.from(await file.arrayBuffer()) };
  }
  const job = await db.jobPosting.findFirst({ where: { id: d.jobId, status: "OPEN" }, include: { org: true } });
  if (!job) throw new HttpError(404, "This job is no longer accepting applications.");
  const dup = await db.jobApplication.findFirst({ where: { jobId: job.id, email: d.email } });
  if (dup) throw new HttpError(409, "You've already applied for this job. The employer will be in touch.");
  const ctx = await getCtx();
  const app = await db.jobApplication.create({
    data: {
      orgId: job.orgId, jobId: job.id, userId: ctx.user?.id, name: d.name, email: d.email, phone: d.phone || null, city: d.city || null,
      linkedinUrl: d.linkedinUrl || null, coverLetter: d.coverLetter || null, resumeText: d.resumeText || null,
      resumeName: resume?.name, resumeMime: resume?.mime, resumeData: resume ? new Uint8Array(resume.data) : undefined, marketingConsent: d.marketingConsent,
    },
  });
  if (d.marketingConsent) {
    await db.lead.upsert({ where: { email: d.email }, create: { email: d.email, name: d.name, phone: d.phone || null, source: "jobs", tags: ["job-seeker"], emailConsent: true, consentAt: new Date(), consentText: "Send me job alerts and OENOD updates", consentIp: clientIp(req) }, update: { emailConsent: true, consentAt: new Date(), unsubscribedAt: null } });
  }
  await emit(job.orgId, "application.created", { id: app.id, jobId: job.id, name: app.name, email: app.email });
  await notify(job.orgId, `New applicant for ${job.title}`, { body: d.name, link: "/app/recruiting", level: "success" });
  await sendEmail({ to: d.email, scope: "ORG", orgId: job.orgId, idempotencyKey: `apply:${app.id}`, subject: `We received your application — ${job.title}`, html: emailLayout({ brand: job.org.name, title: "Application received", body: `Hi ${d.name.split(" ")[0]},\n\nThanks for applying for ${job.title} at ${job.org.name}. The team will review your application and contact you if it's a match.\n\nGood luck!` }) });
  scoreApplication(app.id).catch(() => {});
  return ok({ ok: true, id: app.id }, 201);
});
