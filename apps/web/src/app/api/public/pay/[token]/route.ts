import { invoiceCheckout } from "@/lib/payments";
import { ok, route } from "@/lib/http";

export const POST = route(async (_req: Request, { params }: { params: Promise<{ token: string }> }) => {
  return ok({ url: await invoiceCheckout((await params).token) });
});
