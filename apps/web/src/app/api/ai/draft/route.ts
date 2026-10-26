import { z } from "zod";
import { draft } from "@/lib/ai/agent";
import { body, ok, requireOrg, route } from "@/lib/http";

export const POST = route(async (req: Request) => {
  const ctx = await requireOrg();
  const d = await body(req, z.object({ instruction: z.string().min(3).max(6000) }));
  return ok({ text: await draft(ctx, d.instruction) });
});
