import { ok, requireSuperAdmin, route } from "@/lib/http";
import { platformStats } from "@/lib/admin";

export const GET = route(async () => {
  await requireSuperAdmin();
  return ok(await platformStats());
});
