import { db } from "@/lib/db";
import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { actorName, loadProject, logActivity } from "@/lib/projects";

type P = { params: Promise<{ id: string }> };
const BLOCKED = /\.(exe|bat|cmd|com|scr|js|vbs|msi|ps1|sh|jar|app|dmg)$/i;

export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects", "edit");
  const p = await loadProject(ctx, (await params).id);
  const form = await req.formData();
  const file = form.get("file");
  const taskId = (form.get("taskId") as string) || null;
  if (!file || typeof file === "string") throw new HttpError(422, "Choose a file.");
  if (file.size > 20 * 1024 * 1024) throw new HttpError(422, "Files must be under 20 MB.");
  if (BLOCKED.test(file.name)) throw new HttpError(422, "That file type isn't allowed.");
  if (taskId && !(await db.task.findFirst({ where: { id: taskId, projectId: p.id } }))) throw new HttpError(422, "Task not found.");
  const f = await db.projectFile.create({ data: { projectId: p.id, taskId, name: file.name.slice(0, 200), mime: file.type || "application/octet-stream", size: file.size, data: new Uint8Array(await file.arrayBuffer()), uploadedBy: actorName(ctx) } });
  await logActivity(p.id, actorName(ctx), "uploaded", f.name, taskId ?? undefined);
  return ok({ data: { id: f.id, name: f.name, size: f.size, mime: f.mime } }, 201);
});

// Download: /api/projects/{id}/files?fileId=...
export const GET = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg("projects");
  const p = await loadProject(ctx, (await params).id);
  const f = await db.projectFile.findFirst({ where: { id: new URL(req.url).searchParams.get("fileId") ?? "", projectId: p.id } });
  if (!f?.data) throw new HttpError(404, "File not found.");
  return new Response(Buffer.from(f.data), { headers: { "Content-Type": f.mime ?? "application/octet-stream", "Content-Disposition": `attachment; filename="${encodeURIComponent(f.name)}"`, "X-Content-Type-Options": "nosniff" } });
});
