import { z } from "zod";
import { body, ok, requireOrg, route } from "@/lib/http";
import { importOpenApi } from "@/lib/integrations/custom";

// Paste an OpenAPI/Swagger URL or JSON: returns a ready-to-save connector with every endpoint as an action.
export const POST = route(async (req: Request) => {
  await requireOrg("integrations", "edit");
  const { spec } = await body(req, z.object({ spec: z.string().min(10).max(5_000_000) }));
  return ok({ data: await importOpenApi(spec) });
});
