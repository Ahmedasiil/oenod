import { db } from "@/lib/db";
import { fail, HttpError, ok, requireOrg, route } from "@/lib/http";

// Public: serve the ad image.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const c = await db.adCampaign.findUnique({ where: { id: (await params).id }, select: { imageData: true, imageMime: true } });
    if (!c?.imageData) throw new HttpError(404, "No image");
    return new Response(Buffer.from(c.imageData), { headers: { "Content-Type": c.imageMime ?? "image/jpeg", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch (e) {
    return fail(e);
  }
}

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("marketing", "edit");
  const c = await db.adCampaign.findFirst({ where: { id: (await params).id, orgId: ctx.org.id }, select: { id: true, status: true } });
  if (!c) throw new HttpError(404, "Campaign not found.");
  const file = (await req.formData()).get("file");
  if (!file || typeof file === "string") throw new HttpError(422, "Choose an image.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new HttpError(422, "Use a JPG, PNG or WebP image.");
  if (file.size > 3 * 1024 * 1024) throw new HttpError(422, "Images must be under 3 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  // The browser-supplied type can lie, so check the file's signature too.
  const real = (bytes[0] === 0x89 && bytes[1] === 0x50) || (bytes[0] === 0xff && bytes[1] === 0xd8) || (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50);
  if (!real) throw new HttpError(422, "That file isn't a valid image.");
  await db.adCampaign.update({ where: { id: c.id }, data: { imageData: bytes, imageMime: file.type, imageUrl: null, ...(["ACTIVE", "PAUSED"].includes(c.status) ? { status: "DRAFT" } : {}) } });
  return ok({ ok: true });
});
