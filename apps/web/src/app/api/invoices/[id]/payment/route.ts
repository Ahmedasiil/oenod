import { z } from "zod";
import { db } from "@/lib/db";
import { body, HttpError, ok, requireOrg, route } from "@/lib/http";
import { recordPayment } from "@/lib/payments";

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = await requireOrg("sales", "edit");
  const d = await body(req, z.object({ amount: z.number().positive(), method: z.string().default("CARD"), reference: z.string().optional() }));
  const inv = await db.invoice.findFirst({ where: { id: (await params).id, orgId: ctx.org.id } });
  if (!inv) throw new HttpError(404, "Invoice not found");
  return ok(await recordPayment(inv.id, d.amount, d.method, d.reference));
});
