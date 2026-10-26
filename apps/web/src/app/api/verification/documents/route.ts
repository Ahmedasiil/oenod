import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";

const OK = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// Upload incorporation papers, business licence, utility bill, etc.
export const POST = route(async (req: Request) => {
  const ctx = await requireOrg("settings", "edit");
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") throw new HttpError(422, "Choose a file.");
  if (file.size > 10 * 1024 * 1024) throw new HttpError(422, "Files must be under 10 MB.");
  if (!OK.includes(file.type)) throw new HttpError(422, "Upload a PDF, JPG, PNG or WebP.");
  const kind = String(form.get("kind") ?? "CERTIFICATE").toUpperCase();
  const doc = await db.document.create({ data: { orgId: ctx.org.id, name: file.name.slice(0, 200), kind: ["CERTIFICATE", "PERMIT", "INSURANCE", "CONTRACT", "OTHER"].includes(kind) ? kind : "OTHER", entityType: "verification", mime: file.type, size: file.size, data: new Uint8Array(await file.arrayBuffer()) } });
  return ok({ id: doc.id, name: doc.name }, 201);
});
