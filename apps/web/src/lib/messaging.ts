import { Resend } from "resend";
import twilio from "twilio";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { APP_URL } from "./env";
import { dir, t } from "@oenod/i18n";

const enc = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me");

/** Signed, non-expiring unsubscribe link token. kind: user | lead | contact | jobalert */
export async function unsubscribeToken(kind: string, id: string) {
  return new SignJWT({ k: kind, id }).setProtectedHeader({ alg: "HS256" }).sign(enc());
}
export async function readUnsubscribeToken(t: string) {
  const { payload } = await jwtVerify(t, enc());
  return { kind: String(payload.k), id: String(payload.id) };
}
export async function unsubscribeUrl(kind: string, id: string) {
  return `${APP_URL}/unsubscribe?t=${await unsubscribeToken(kind, id)}`;
}

/**
 * Every email carries the OENOD logo in the header. When a company sends it (brand),
 * the company's own logo or name sits on the right of the same header.
 */
export function emailLayout(opts: { title: string; body: string; ctaLabel?: string; ctaUrl?: string; unsubscribe?: string; brand?: string; brandLogo?: string | null; locale?: string }) {
  const lang = opts.locale ?? "en";
  const company = opts.brand && opts.brand !== "OENOD" ? opts.brand : null;
  const footerName = company || "OENOD";
  const logo = opts.brandLogo && /^https:\/\//.test(opts.brandLogo) ? opts.brandLogo : null;
  const paragraphs = opts.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6;color:#2b3150;font-size:15px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const companyCell = company
    ? `<td align="right" style="vertical-align:middle">${logo
        ? `<span style="display:inline-block;background:#fff;border-radius:8px;padding:6px 10px"><img src="${escapeHtml(logo)}" alt="${escapeHtml(company)}" height="26" style="display:block;height:26px;max-width:140px"></span>`
        : `<span style="color:#C9D3FF;font-size:14px;font-weight:700">${escapeHtml(company)}</span>`}</td>`
    : "";
  return `<!doctype html><html lang="${lang}" dir="${dir(lang)}"><body style="margin:0;background:#F5F7FC;font-family:Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #E4E8F2;border-radius:16px;overflow:hidden">
<tr><td style="background:#000F55;padding:20px 28px"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle"><img src="${APP_URL}/brand/oenod-mark-white.png" alt="OENOD" height="24" style="display:block;height:24px;width:auto;border:0"></td>${companyCell}
</tr></table></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;color:#0A0C17">${escapeHtml(opts.title)}</h1>${paragraphs}
${opts.ctaUrl ? `<a href="${opts.ctaUrl}" style="display:inline-block;margin-top:8px;background:#000F55;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700">${escapeHtml(opts.ctaLabel || "Open")}</a>` : ""}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #E4E8F2;font-size:12px;color:#5E6785">
${escapeHtml(t(lang, "email.footer", { brand: footerName }))}${company ? ` ${escapeHtml(t(lang, "email.sentWith"))}.` : ""}
${opts.unsubscribe ? `<a href="${opts.unsubscribe}" style="color:#2342E0">${escapeHtml(t(lang, "email.unsubscribe"))}</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

type SendResult = { ok: boolean; id?: string; error?: string; skipped?: boolean };

/**
 * Send an email. Every send is logged; an idempotency key prevents duplicates
 * when a job is retried.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
  scope?: "PLATFORM" | "ORG";
  orgId?: string;
  campaignId?: string;
  automationKey?: string;
  unsubscribe?: string;
  from?: string;
}): Promise<SendResult> {
  if (opts.idempotencyKey) {
    const dup = await db.messageLog.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
    if (dup) return { ok: true, skipped: true };
  }
  const log = await db.messageLog.create({
    data: { channel: "EMAIL", to: opts.to, subject: opts.subject, scope: opts.scope ?? "PLATFORM", orgId: opts.orgId, campaignId: opts.campaignId, automationKey: opts.automationKey, idempotencyKey: opts.idempotencyKey },
  });
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:dev] to=${opts.to} subject=${opts.subject}`);
    await db.messageLog.update({ where: { id: log.id }, data: { status: "SENT", providerId: "dev-console" } });
    return { ok: true, id: "dev" };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const r = await resend.emails.send({
      from: opts.from || process.env.EMAIL_FROM || "OENOD <hello@oenod.com>",
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers: opts.unsubscribe ? { "List-Unsubscribe": `<${opts.unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
    });
    if (r.error) throw new Error(r.error.message);
    await db.messageLog.update({ where: { id: log.id }, data: { status: "SENT", providerId: r.data?.id } });
    return { ok: true, id: r.data?.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await db.messageLog.update({ where: { id: log.id }, data: { status: "FAILED", error } });
    return { ok: false, error };
  }
}

export async function sendSms(opts: { to: string; body: string; whatsapp?: boolean; idempotencyKey?: string; orgId?: string; campaignId?: string; scope?: "PLATFORM" | "ORG" }): Promise<SendResult> {
  if (opts.idempotencyKey) {
    const dup = await db.messageLog.findUnique({ where: { idempotencyKey: opts.idempotencyKey } });
    if (dup) return { ok: true, skipped: true };
  }
  const channel = opts.whatsapp ? "WHATSAPP" : "SMS";
  const log = await db.messageLog.create({ data: { channel, to: opts.to, scope: opts.scope ?? "PLATFORM", orgId: opts.orgId, campaignId: opts.campaignId, idempotencyKey: opts.idempotencyKey } });
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_FROM: from } = process.env;
  if (!sid || !tok || !from) {
    console.log(`[sms:dev] to=${opts.to} ${opts.body}`);
    await db.messageLog.update({ where: { id: log.id }, data: { status: "SENT", providerId: "dev-console" } });
    return { ok: true, id: "dev" };
  }
  try {
    const client = twilio(sid, tok);
    const pre = opts.whatsapp ? "whatsapp:" : "";
    const body = opts.scope === "PLATFORM" || opts.campaignId ? `${opts.body}\nReply STOP to opt out.` : opts.body;
    const m = await client.messages.create({ from: pre + from, to: pre + opts.to, body });
    await db.messageLog.update({ where: { id: log.id }, data: { status: "SENT", providerId: m.sid } });
    return { ok: true, id: m.sid };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await db.messageLog.update({ where: { id: log.id }, data: { status: "FAILED", error } });
    return { ok: false, error };
  }
}

/** Fill {{first_name}}, {{company}} etc. */
export function personalize(t: string, vars: Record<string, string | null | undefined>) {
  return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}
