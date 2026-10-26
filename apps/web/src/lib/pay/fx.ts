import { BASE } from "@/lib/pay/config";
import { rate } from "@/lib/pay/providers/airwallex";

let cached: { at: number; v: number } | null = null;
/** Airalo prices are in USD; convert to the wallet currency (cached 10 minutes). */
export async function usdRate() {
  if (BASE === "USD") return 1;
  if (cached && Date.now() - cached.at < 600_000) return cached.v;
  const v = await rate("USD", BASE, 100).catch(() => Number(process.env.PAY_USD_RATE_FALLBACK ?? 1.4));
  cached = { at: Date.now(), v };
  return v;
}
