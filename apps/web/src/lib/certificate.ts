import { db } from "./db";
import { escapeHtml as esc } from "./messaging";
import { companyLogo, initials, oenodLogo, OENOD_MARK_RATIO, safeColor } from "./brand";
import QRCode from "qrcode";
import { APP_URL } from "./env";

export const CERT_KINDS: Record<string, { heading: string; lead: string; verb: string }> = {
  COMPLETION: { heading: "Certificate of Completion", lead: "This certifies that", verb: "has successfully completed" },
  ACHIEVEMENT: { heading: "Certificate of Achievement", lead: "This is proudly presented to", verb: "in recognition of" },
  APPRECIATION: { heading: "Certificate of Appreciation", lead: "With sincere thanks to", verb: "for" },
  SAFETY: { heading: "Safety Training Certificate", lead: "This certifies that", verb: "has completed the safety training" },
  PARTICIPATION: { heading: "Certificate of Participation", lead: "This certifies that", verb: "took part in" },
  EXCELLENCE: { heading: "Award of Excellence", lead: "This award is presented to", verb: "for outstanding work in" },
};

export type CertificateData = {
  code: string;
  kind: string;
  recipient: string;
  title: string;
  description?: string | null;
  hours?: number | null;
  issuedAt: Date;
  expiresAt?: Date | null;
  revoked?: boolean;
  /** "academy" for OENOD Academy courses, "company" for certificates a company issues itself. */
  source: "academy" | "company";
  company?: { name: string; logoUrl: string | null; brandColor: string; verified: boolean } | null;
  signer?: { name: string; title: string } | null;
};

/** Look a certificate up by its public code, from either the Academy or a company. */
export async function findCertificate(rawCode: string): Promise<CertificateData | null> {
  const code = rawCode.trim().toUpperCase();
  const company = (o: { name: string; logoUrl: string | null; brandColor: string; verificationStatus: string } | null | undefined) =>
    o ? { name: o.name, logoUrl: o.logoUrl, brandColor: o.brandColor, verified: o.verificationStatus === "VERIFIED" } : null;
  const orgSelect = { name: true, logoUrl: true, brandColor: true, verificationStatus: true } as const;

  const e = await db.enrollment.findUnique({ where: { certificateCode: code }, include: { user: { select: { name: true } }, course: { select: { title: true, durationMin: true, level: true, outcomes: true, instructorName: true, org: { select: orgSelect } } } } });
  if (e?.completedAt) {
    const sponsor = e.sponsorOrgId ? await db.organization.findUnique({ where: { id: e.sponsorOrgId }, select: orgSelect }) : null;
    return {
      code, kind: "COMPLETION", recipient: e.user.name, title: e.course.title, source: "academy",
      description: e.course.outcomes.length ? `Skills: ${e.course.outcomes.slice(0, 3).join(" · ")}` : `${e.course.level} level`,
      hours: Math.round(e.course.durationMin / 6) / 10, issuedAt: e.completedAt,
      company: company(sponsor ?? e.course.org),
      signer: { name: e.course.instructorName || "OENOD Academy", title: e.course.org ? "Course instructor" : "OENOD Academy" },
    };
  }
  const c = await db.issuedCertificate.findUnique({ where: { code }, include: { org: { select: orgSelect } } });
  if (!c) return null;
  return {
    code, kind: c.kind, recipient: c.recipientName, title: c.title, description: c.description, hours: c.hours, source: "company",
    issuedAt: c.issuedAt, expiresAt: c.expiresAt, revoked: Boolean(c.revokedAt), company: company(c.org),
    signer: c.signerName ? { name: c.signerName, title: c.signerTitle ?? "" } : null,
  };
}

// Rough text measuring so long names and titles shrink or wrap instead of overflowing.
const width = (s: string, size: number) => [...s].reduce((w, ch) => w + (/[MW@]/.test(ch) ? 0.9 : /[A-Z0-9]/.test(ch) ? 0.68 : /[ilj.,'|!]/.test(ch) ? 0.28 : ch === " " ? 0.3 : 0.54), 0) * size;
function fit(s: string, max: number, size: number, min: number) {
  let f = size;
  while (f > min && width(s, f) > max) f -= 2;
  return f;
}
function wrap(s: string, max: number, size: number, lines = 2) {
  const out: string[] = [];
  for (const w of s.split(/\s+/)) {
    const last = out[out.length - 1];
    if (last !== undefined && width(`${last} ${w}`, size) <= max) out[out.length - 1] = `${last} ${w}`;
    else out.push(w);
  }
  if (out.length > lines) { out.length = lines; out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, "") + "…"; }
  return out;
}
const day = (d: Date) => d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

/**
 * The certificate artwork (A4 landscape, vector). A centred, editorial layout:
 * the OENOD logo leads at the top, the company that provided or issued it sits
 * beside it as a smaller co-brand, and the seal, QR code and ID make it verifiable.
 * theme "light" is white paper; "navy" is the premium dark edition.
 */
export async function renderCertificate(c: CertificateData, theme: "light" | "navy" = "navy") {
  const W = 1600, H = 1131, CX = W / 2;
  const kind = CERT_KINDS[c.kind] ?? CERT_KINDS.COMPLETION;
  const dark = theme === "navy";
  const t = dark
    ? { bg: "#000B3D", bg2: "#00125E", ink: "#FFFFFF", brand: "#FFFFFF", soft: "#AEB8E6", faint: "#6F7CB8", line: "#3A4A9A", rule: "#C9D1F5", qrBg: "#FFFFFF", qr: "#000F55" }
    : { bg: "#FFFFFF", bg2: "#F6F8FD", ink: "#0B0D1A", brand: "#000F55", soft: "#555E7D", faint: "#8E95AE", line: "#DADFEC", rule: "#000F55", qrBg: "#FFFFFF", qr: "#000F55" };
  const [mark, coLogo] = await Promise.all([oenodLogo(dark ? "white" : "navy"), companyLogo(c.company?.logoUrl)]);
  const accent = safeColor(c.company?.brandColor, "#000F55");

  // Header lockup: OENOD first, then a hairline divider and the company, smaller.
  const markH = 50, markW = Math.round(markH * OENOD_MARK_RATIO);
  let coW = 0, coSvg = "";
  if (c.company) {
    if (coLogo) { coW = 190; }
    else { coW = 52 + 14 + Math.min(260, width(c.company.name, 20)); }
  }
  const gap = c.company ? 36 : 0;
  const lockW = markW + (c.company ? gap * 2 + 1 + coW : 0);
  const lx = CX - lockW / 2, ly = 132;
  if (c.company) {
    const cx0 = lx + markW + gap * 2 + 1;
    coSvg = coLogo
      ? `<image href="${coLogo}" x="${cx0}" y="${ly - 6}" width="${coW}" height="${markH + 12}" preserveAspectRatio="xMinYMid meet"/>`
      : `<circle cx="${cx0 + 26}" cy="${ly + markH / 2}" r="26" fill="${accent}"/><text x="${cx0 + 26}" y="${ly + markH / 2 + 8}" text-anchor="middle" font-size="20" font-weight="700" fill="#FFFFFF">${esc(initials(c.company.name))}</text><text x="${cx0 + 66}" y="${ly + markH / 2 + 7}" font-size="20" font-weight="600" fill="${t.ink}">${esc(c.company.name.length > 26 ? c.company.name.slice(0, 25) + "…" : c.company.name)}</text>`;
    if (c.company.verified) {
      const vx = coLogo ? cx0 + coW + 8 : cx0 + 66 + Math.min(260, width(c.company.name, 20)) + 10;
      coSvg += `<g transform="translate(${vx} ${ly + markH / 2 - 10})"><circle cx="10" cy="10" r="10" fill="#1D9BF0"/><path d="M5.6 10.3l3 3 5.8-6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
    coSvg = `<line x1="${lx + markW + gap}" y1="${ly + 2}" x2="${lx + markW + gap}" y2="${ly + markH - 2}" stroke="${t.line}" stroke-width="1.5"/>${coSvg}`;
  }
  const coLabel = c.company ? `<text x="${CX}" y="${ly - 26}" text-anchor="middle" class="kick" fill="${t.faint}" font-size="11">${c.source === "academy" ? "OENOD ACADEMY · PROVIDED BY " + esc(c.company.name.toUpperCase()) : "ISSUED BY " + esc(c.company.name.toUpperCase()) + " ON OENOD"}</text>` : `<text x="${CX}" y="${ly - 26}" text-anchor="middle" class="kick" fill="${t.faint}" font-size="11">${c.source === "academy" ? "OENOD ACADEMY" : "OENOD"}</text>`;

  // Title block.
  const heading = kind.heading.toUpperCase();
  const hw = width(heading, 17) * 1.25;
  const nameSize = fit(c.recipient, 1100, 100, 56);
  const titleLines = wrap(c.title, 1080, 40, 2);
  const yLead = 400, yName = 510, yVerb = 600, yTitle = 660;
  const detail = [c.hours ? `${c.hours} hour${c.hours === 1 ? "" : "s"}` : null, c.description].filter(Boolean).join("   ·   ");

  // Seal: fine sunburst ticks around a navy disc with the OENOD dot.
  const SX = CX, SY = 846, R = 70;
  const ticks = Array.from({ length: 90 }, (_, i) => {
    const a = (i / 90) * Math.PI * 2, r1 = R + 6, r2 = R + (i % 2 ? 12 : 17);
    return `M${(SX + Math.cos(a) * r1).toFixed(1)} ${(SY + Math.sin(a) * r1).toFixed(1)}L${(SX + Math.cos(a) * r2).toFixed(1)} ${(SY + Math.sin(a) * r2).toFixed(1)}`;
  }).join("");
  const ringText = `VERIFIED · ${c.issuedAt.getFullYear()} · OENOD · CERTIFIED · `;

  // QR code for the public check.
  const qr = QRCode.create(`${APP_URL}/verify/${c.code}`, { errorCorrectionLevel: "M" }).modules;
  const QS = 78, qx = W - 120 - QS, qy = H - 86 - QS, cell = QS / qr.size;
  let qrPath = "";
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.get(x, y)) qrPath += `M${(qx + x * cell).toFixed(2)} ${(qy + y * cell).toFixed(2)}h${cell.toFixed(2)}v${cell.toFixed(2)}h-${cell.toFixed(2)}z`;

  const block = (x: number, anchor: "start" | "end", top: string, topClass: string, label: string, sub: string) => `
    <text x="${x}" y="${SY - 4}" text-anchor="${anchor}" class="${topClass}" fill="${t.ink}">${top}</text>
    <line x1="${anchor === "start" ? x : x - 320}" y1="${SY + 18}" x2="${anchor === "start" ? x + 320 : x}" y2="${SY + 18}" stroke="${t.line}" stroke-width="1.5"/>
    <text x="${x}" y="${SY + 50}" text-anchor="${anchor}" font-size="16" font-weight="600" fill="${t.ink}">${label}</text>
    <text x="${x}" y="${SY + 74}" text-anchor="${anchor}" font-size="14" fill="${t.soft}">${sub}</text>`;
  const signer = c.source === "academy" ? { name: c.signer?.name ?? "OENOD Academy", title: c.signer?.title ?? "OENOD Academy" } : c.signer ?? { name: c.company?.name ?? "OENOD", title: "Issuer" };
  const status = c.revoked ? "REVOKED" : c.expiresAt && c.expiresAt < new Date() ? "EXPIRED" : null;
  const corner = (x: number, y: number, sx: number, sy: number) => `<path d="M${x} ${y + sy * 46}V${y}H${x + sx * 46}" stroke="${t.rule}" stroke-width="2.5" fill="none"/>`;

  // Rosette watermark behind the name.
  const rosette = Array.from({ length: 36 }, (_, i) => `<ellipse cx="${CX}" cy="560" rx="330" ry="120" transform="rotate(${i * 5} ${CX} 560)"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;family=Cormorant+Garamond:ital,wght@0,600;1,500&amp;display=swap');
    text { font-family: Inter, 'Segoe UI', Helvetica, Arial, sans-serif; }
    .kick { font-weight: 600; letter-spacing: 3.2px; }
    .name { font-family: 'Cormorant Garamond', 'Cormorant', Georgia, 'Times New Roman', serif; font-weight: 600; }
    .date { font-size: 26px; font-weight: 500; letter-spacing: -0.3px; }
    .sig { font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; font-weight: 500; font-size: 36px; }
  </style>
  <radialGradient id="paper" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="${t.bg}"/><stop offset="1" stop-color="${t.bg2}"/></radialGradient>
  <linearGradient id="disc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark ? "#FFFFFF" : "#0A1E8C"}"/><stop offset="1" stop-color="${dark ? "#C9D1F5" : "#000B3D"}"/></linearGradient>
  <path id="ring" d="M ${SX} ${SY} m -${R - 13} 0 a ${R - 13} ${R - 13} 0 1 1 ${2 * (R - 13)} 0 a ${R - 13} ${R - 13} 0 1 1 -${2 * (R - 13)} 0"/>
</defs>

<rect width="${W}" height="${H}" fill="url(#paper)"/>
<g fill="none" stroke="${t.brand}" stroke-opacity="${dark ? 0.06 : 0.032}" stroke-width="1">${rosette}</g>

<!-- Frame -->
<rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${t.line}" stroke-width="1.5"/>
<rect x="54" y="54" width="${W - 108}" height="${H - 108}" fill="none" stroke="${t.line}" stroke-width="0.75"/>
${corner(40, 40, 1, 1)}${corner(W - 40, 40, -1, 1)}${corner(40, H - 40, 1, -1)}${corner(W - 40, H - 40, -1, -1)}

<!-- Brand lockup -->
${coLabel}
<image href="${mark}" x="${lx}" y="${ly}" width="${markW}" height="${markH}"/>
${coSvg}

<!-- Heading -->
<line x1="${CX - hw / 2 - 90}" y1="${284}" x2="${CX - hw / 2 - 26}" y2="${284}" stroke="${t.rule}" stroke-width="1.5"/>
<text x="${CX}" y="290" text-anchor="middle" class="kick" font-size="17" fill="${t.brand}">${esc(heading)}</text>
<line x1="${CX + hw / 2 + 26}" y1="${284}" x2="${CX + hw / 2 + 90}" y2="${284}" stroke="${t.rule}" stroke-width="1.5"/>

<text x="${CX}" y="${yLead}" text-anchor="middle" font-size="21" fill="${t.soft}">${esc(kind.lead)}</text>
<text x="${CX}" y="${yName}" text-anchor="middle" class="name" font-size="${nameSize}" fill="${t.ink}">${esc(c.recipient)}</text>
<line x1="${CX - 260}" y1="${yName + 34}" x2="${CX + 260}" y2="${yName + 34}" stroke="${t.line}" stroke-width="1.5"/>
<circle cx="${CX}" cy="${yName + 34}" r="4" fill="${accent === "#000F55" && dark ? "#FFFFFF" : accent}"/>

<text x="${CX}" y="${yVerb}" text-anchor="middle" font-size="21" fill="${t.soft}">${esc(kind.verb)}</text>
${titleLines.map((l, i) => `<text x="${CX}" y="${yTitle + i * 52}" text-anchor="middle" font-size="40" font-weight="700" letter-spacing="-0.5" fill="${t.brand}">${esc(l)}</text>`).join("")}
${detail ? `<text x="${CX}" y="${yTitle + (titleLines.length - 1) * 52 + 50}" text-anchor="middle" font-size="17" fill="${t.faint}">${esc(detail.length > 120 ? detail.slice(0, 118) + "…" : detail)}</text>` : ""}

<!-- Signature, seal, date -->
${block(200, "start", esc(signer.name), "sig", esc(signer.name), esc(signer.title || " "))}
${block(W - 200, "end", esc(day(c.issuedAt)), "date", "Date issued", c.expiresAt ? `Valid until ${esc(day(c.expiresAt))}` : "No expiry")}
<g>
  <path d="${ticks}" stroke="${t.brand}" stroke-opacity=".55" stroke-width="1.4"/>
  <circle cx="${SX}" cy="${SY}" r="${R}" fill="url(#disc)"/>
  <circle cx="${SX}" cy="${SY}" r="${R - 26}" fill="none" stroke="${dark ? "#000F55" : "#FFFFFF"}" stroke-opacity=".35"/>
  <text font-size="10.5" font-weight="600" letter-spacing="2.6" fill="${dark ? "#000F55" : "#FFFFFF"}" fill-opacity=".9"><textPath href="#ring" xlink:href="#ring">${ringText}</textPath></text>
  <circle cx="${SX}" cy="${SY}" r="15" fill="${dark ? "#000F55" : "#FFFFFF"}"/>
</g>

<!-- Footer: verification -->
<text x="120" y="${H - 128}" class="kick" font-size="11" fill="${t.faint}">CERTIFICATE ID</text>
<text x="120" y="${H - 102}" font-size="19" font-weight="600" letter-spacing="1.5" fill="${t.ink}">${esc(c.code)}</text>
<text x="${qx - 22}" y="${H - 128}" text-anchor="end" class="kick" font-size="11" fill="${t.faint}">VERIFY</text>
<text x="${qx - 22}" y="${H - 102}" text-anchor="end" font-size="15" fill="${t.soft}">${esc(APP_URL.replace(/^https?:\/\//, ""))}/verify</text>
<rect x="${qx - 6}" y="${qy - 6}" width="${QS + 12}" height="${QS + 12}" rx="6" fill="${t.qrBg}"/>
<path d="${qrPath}" fill="${t.qr}"/>
${status ? `<g transform="rotate(-12 ${CX} 560)"><rect x="${CX - 240}" y="510" width="480" height="104" rx="10" fill="none" stroke="#C81E1E" stroke-width="5" opacity=".85"/><text x="${CX}" y="584" text-anchor="middle" font-size="64" font-weight="700" letter-spacing="12" fill="#C81E1E" opacity=".85">${status}</text></g>` : ""}
</svg>`;
}
