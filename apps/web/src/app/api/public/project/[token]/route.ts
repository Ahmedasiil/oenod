import { db } from "@/lib/db";
import { HttpError, ok, route } from "@/lib/http";

// Client view: progress, milestones and shared tasks. No internal costs or notes.
export const GET = route(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  const p = await db.project.findUnique({ where: { portalToken: (await params).token }, include: { org: { select: { name: true, logoUrl: true, brandColor: true, verificationStatus: true } } } });
  if (!p || !p.clientPortal || p.archivedAt) throw new HttpError(404, "This project link isn't active.");
  const [milestones, tasks, activity] = await Promise.all([
    db.milestone.findMany({ where: { projectId: p.id }, orderBy: [{ order: "asc" }], select: { name: true, dueDate: true, status: true, completedAt: true } }),
    db.task.findMany({ where: { projectId: p.id, parentId: null }, select: { title: true, status: true, dueDate: true, completedAt: true }, orderBy: { order: "asc" } }),
    db.projectActivity.findMany({ where: { projectId: p.id, action: { in: ["completed", "milestone_done", "created"] } }, orderBy: { createdAt: "desc" }, take: 20, select: { action: true, detail: true, createdAt: true } }),
  ]);
  return ok({
    company: { name: p.org.name, logoUrl: p.org.logoUrl, brandColor: p.org.brandColor, verified: p.org.verificationStatus === "VERIFIED" },
    project: { name: p.name, code: p.code, status: p.status, progress: p.progress, health: p.health, startDate: p.startDate, dueDate: p.dueDate, description: p.description },
    milestones, tasks, activity,
  });
});
