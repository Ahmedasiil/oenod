import { getSpec, refOptions } from "@/lib/resources";
import { ok, requireOrg, route } from "@/lib/http";

export const GET = route(async (req: Request, { params }: { params: Promise<{ resource: string }> }) => {
  const ctx = await requireOrg();
  const spec = getSpec((await params).resource, ctx);
  return ok(await refOptions(spec, ctx, new URL(req.url).searchParams.get("q") ?? undefined));
});
