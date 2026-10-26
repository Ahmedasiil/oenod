import { db } from "@/lib/db";
import { escapeHtml } from "@/lib/messaging";

const ICONS: Record<string, string> = {
  "Leadership": "M12 3l3 6 6 .9-4.5 4.3 1 6.3L12 17.5 6.5 20.5l1-6.3L3 9.9 9 9z",
  "Finance": "M4 18h16M6 15V9M10 15V6M14 15v-4M18 15V8",
  "Marketing": "M3 11l14-6v14L3 13zM17 8a4 4 0 010 8",
  "Sales": "M3 17l6-6 4 4 8-8M15 7h6v6",
  "People & HR": "M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5",
  "Operations": "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 7.5 4 7 3 10l2 1v2l-2 1 1 3 2-.5L7.5 18 7 20l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z",
  "Technology & AI": "M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3M6 6h12v12H6zM10 10h4v4h-4z",
  "Customer service": "M4 12a8 8 0 0116 0v4a2 2 0 01-2 2h-2v-6h4M4 12v4a2 2 0 002 2h2v-6H4",
  "Safety & compliance": "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  "Career": "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  "Business": "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6",
};

// Branded course cover generated on the fly: OENOD navy, the course colour, title and the logo mark.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const c = await db.course.findUnique({ where: { slug: (await params).slug }, select: { title: true, category: true, coverColor: true, level: true, priceCents: true, org: { select: { name: true } } } });
  if (!c) return new Response("Not found", { status: 404 });
  const words = c.title.split(" ");
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + w).length <= 22) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  const icon = ICONS[c.category] ?? ICONS.Business;
  const accent = /^#[0-9a-fA-F]{6}$/.test(c.coverColor) ? c.coverColor : "#2342E0";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#000F55"/><stop offset="1" stop-color="#061A7A"/></linearGradient>
<radialGradient id="r" cx="0.85" cy="0.15" r="0.7"><stop offset="0" stop-color="${accent}" stop-opacity=".85"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient></defs>
<rect width="800" height="450" fill="url(#g)"/><rect width="800" height="450" fill="url(#r)"/>
<g opacity=".08" stroke="#fff" fill="none">${Array.from({ length: 9 }, (_, i) => `<circle cx="690" cy="90" r="${40 + i * 38}"/>`).join("")}</g>
<g transform="translate(640 250) scale(4.2)" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" opacity=".9"><path d="${icon}"/></g>
<g font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" fill="#fff">
<g transform="translate(48 56)"><circle cx="9" cy="9" r="9" fill="#fff"/><text x="26" y="16" font-size="22" font-weight="800" letter-spacing="1">ENOD</text><text x="96" y="16" font-size="15" font-weight="600" opacity=".75">ACADEMY</text></g>
<text x="48" y="128" font-size="15" font-weight="700" letter-spacing="2" opacity=".75">${escapeHtml(c.category.toUpperCase())} · ${escapeHtml(c.level.toUpperCase())}</text>
${lines.slice(0, 4).map((l, i) => `<text x="48" y="${190 + i * 52}" font-size="44" font-weight="800">${escapeHtml(l)}</text>`).join("")}
<text x="48" y="410" font-size="16" font-weight="600" opacity=".7">${escapeHtml(c.org?.name ?? "oenod.com")}</text>
${c.priceCents === 0 ? `<rect x="660" y="384" width="92" height="34" rx="17" fill="#fff"/><text x="706" y="407" font-size="15" font-weight="800" fill="#000F55" text-anchor="middle">FREE</text>` : ""}
</g></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
