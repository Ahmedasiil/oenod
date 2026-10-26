import { getSpec, getResource, updateResource, deleteResource, serialize } from "@/lib/resources";
import { ok, requireOrg, route } from "@/lib/http";

type P = { params: Promise<{ resource: string; id: string }> };

export const GET = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg();
  const { resource, id } = await params;
  return ok({ data: serialize(await getResource(getSpec(resource, ctx), ctx, id)) });
});

export const PATCH = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg();
  const { resource, id } = await params;
  return ok({ data: serialize(await updateResource(getSpec(resource, ctx, "edit"), ctx, id, await req.json())) });
});

export const DELETE = route(async (_req: Request, { params }: P) => {
  const ctx = await requireOrg();
  const { resource, id } = await params;
  await deleteResource(getSpec(resource, ctx, "edit"), ctx, id);
  return ok({ ok: true });
});

export const OPTIONS = () => new Response(null, { status: 204 });
