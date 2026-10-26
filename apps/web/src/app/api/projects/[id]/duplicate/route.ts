import { z } from "zod";
import { body, ok, requireOrg, route } from "@/lib/http";
import { serialize } from "@/lib/resources";
import { duplicateProject, loadProject } from "@/lib/projects";

// Duplicate a project, or save it as a reusable template.
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("projects", "edit");
  const src = await loadProject(ctx, (await params).id);
  const d = await body(req, z.object({ name: z.string().trim().min(2).max(140).optional(), startDate: z.coerce.date().optional(), asTemplate: z.boolean().default(false) }));
  const p = await duplicateProject(ctx, src.id, { name: d.name ?? (d.asTemplate ? `${src.name} (template)` : `${src.name} (copy)`), startDate: d.startDate, asTemplate: d.asTemplate });
  return ok({ data: serialize(p) }, 201);
});
