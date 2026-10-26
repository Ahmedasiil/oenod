import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { limit } from "@/lib/ratelimit";
import { APP_URL } from "@/lib/env";

// Public images (logos, covers, gallery, avatars). Raster only: SVG can carry scripts.
const OK = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const KINDS = ["LOGO", "COVER", "GALLERY", "AVATAR", "BRAND"];

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg();
  if (!limit(`upload:${ctx.org.id}`, 60, 3600_000)) throw new HttpError(429, "Too many uploads. Try again later.");
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") throw new HttpError(422, "Choose an image.");
  if (file.size > 3 * 1024 * 1024) throw new HttpError(422, "Images must be under 3 MB.");
  if (!OK.includes(file.type)) throw new HttpError(422, "Upload a PNG, JPG, WebP or GIF.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Check the file really is the image type it claims (magic bytes).
  const sig = Array.from(bytes.slice(0, 12));
  const real = (sig[0] === 0x89 && sig[1] === 0x50) || (sig[0] === 0xff && sig[1] === 0xd8) || (sig[0] === 0x47 && sig[1] === 0x49) || (sig[8] === 0x57 && sig[9] === 0x45 && sig[10] === 0x42 && sig[11] === 0x50);
  if (!real) throw new HttpError(422, "That file isn't a valid image.");
  const kind = String(form.get("kind") ?? "GALLERY").toUpperCase();
  const doc = await db.document.create({ data: { orgId: ctx.org.id, name: file.name.slice(0, 200), kind: KINDS.includes(kind) ? kind : "GALLERY", entityType: "public", mime: file.type, size: file.size, data: bytes } });
  return ok({ id: doc.id, url: `${APP_URL}/api/files/${doc.id}` }, 201);
});
