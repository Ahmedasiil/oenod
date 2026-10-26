import { getSpec, listResource, createResource, serialize } from "@/lib/resources";
import { ok, requireOrg, route } from "@/lib/http";

type P = { params: Promise<{ resource: string }> };

export const GET = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg();
  const spec = getSpec((await params).resource, ctx);
  return ok(await listResource(spec, ctx, new URL(req.url).searchParams));
});

export const POST = route(async (req: Request, { params }: P) => {
  const ctx = await requireOrg();
  const spec = getSpec((await params).resource, ctx, "edit");
  const row = await createResource(spec, ctx, await req.json());
  return ok({ data: serialize(row) }, 201);
});

export const OPTIONS = () => new Response(null, { status: 204 });
