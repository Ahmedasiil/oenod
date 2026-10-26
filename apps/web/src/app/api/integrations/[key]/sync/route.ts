import { HttpError, ok, requireOrg, route } from "@/lib/http";
import { syncGoogleBusiness, publishGooglePost } from "@/lib/integrations/google";

export const POST = route(async (req: Request, { params }: { params: Promise<{ key: string }> }) => {
  const ctx = await requireOrg("integrations", "edit");
  const key = (await params).key;
  if (key === "google_business") {
    const b = (await req.json().catch(() => ({}))) as { post?: string };
    if (b.post) return ok({ published: await publishGooglePost(ctx.org.id, b.post) });
    return ok(await syncGoogleBusiness(ctx.org.id));
  }
  throw new HttpError(400, "Sync runs automatically for this connector.");
});
