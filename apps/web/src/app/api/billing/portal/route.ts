import { ok, requireOrg, route } from "@/lib/http";
import { portalUrl } from "@/lib/billing";

export const POST = route(async () => {
  const ctx = await requireOrg("billing", "edit");
  return ok({ url: await portalUrl(ctx.org.id) });
});
