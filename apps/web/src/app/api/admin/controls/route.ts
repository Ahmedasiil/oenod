import { ok, requireSuperAdmin, route } from "@/lib/http";
import { controls, SURFACES } from "@/lib/platform";
import { MODULES } from "@/lib/modules";

// The "under construction" switchboard: one row per surface.
export const GET = route(async () => {
  await requireSuperAdmin();
  const rows = await controls();
  return ok({ data: SURFACES.map((s) => ({ ...s, control: rows.find((r) => r.surface === s.key) ?? { surface: s.key, mode: "LIVE" } })), modules: MODULES.map((m) => ({ key: m.key, name: m.name })) });
});
