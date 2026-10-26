import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Thanks for your purchase" };

// Stripe sends people here after paying. Access is granted by the payment webhook, usually within seconds.
export default function Purchased() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-[#1FAF6B]" />
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Payment received</h1>
      <p className="mt-2 text-muted">Thank you. Your purchase is being added to your account and a receipt is on its way to your email.</p>
      <Link href="/academy/my" className="btn-pri mt-8">Go to my learning</Link>
    </div>
  );
}
