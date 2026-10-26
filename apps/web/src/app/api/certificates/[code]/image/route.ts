import { clientIp, fail, HttpError } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { findCertificate, renderCertificate } from "@/lib/certificate";

// The certificate artwork as a vector image. ?download=1 saves it as a file.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!limit(`certimg:${clientIp(req)}`, 30)) throw new HttpError(429, "Too many requests. Try again in a minute.");
    const c = await findCertificate((await params).code);
    if (!c) throw new HttpError(404, "Certificate not found.");
    const q = new URL(req.url).searchParams;
    const svg = await renderCertificate(c, q.get("theme") === "light" ? "light" : "navy");
    const download = q.get("download");
    const file = `${c.recipient.replace(/[^\w-]+/g, "-")}-${c.code}.svg`;
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com",
        "X-Content-Type-Options": "nosniff",
        ...(download ? { "Content-Disposition": `attachment; filename="${file}"` } : {}),
      },
    });
  } catch (e) {
    return fail(e);
  }
}
