import { db } from "@/lib/db";

// Serves public images uploaded through /api/uploads. Private documents are never served here.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const doc = await db.document.findFirst({ where: { id: (await params).id, entityType: "public" }, select: { data: true, mime: true } });
  if (!doc?.data || !doc.mime?.startsWith("image/") || doc.mime.includes("svg")) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(doc.data), {
    headers: { "Content-Type": doc.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Cross-Origin-Resource-Policy": "cross-origin" },
  });
}
