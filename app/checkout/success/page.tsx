import Link from "next/link";
import { ClearCart } from "@/components/cart/ClearCart";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function CheckoutSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let email: string | null = null;
  let paid = false;
  let orderNumber: string | null = null;
  if (session_id?.startsWith("cs_")) {
    try {
      const session = await stripe().checkout.sessions.retrieve(session_id);
      email = session.customer_details?.email ?? null;
      paid = session.payment_status === "paid";
      orderNumber = session.metadata?.order_number ?? null;
    } catch {
      // Unknown session: show the generic message.
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <ClearCart />
      <h1 className="text-2xl font-bold">Thank you!</h1>
      {orderNumber && <p className="font-medium">Order #{orderNumber}</p>}
      <p className="text-neutral-600">
        {paid
          ? `Your payment went through. We've sent a confirmation to ${email ?? "your email"}.`
          : "We're waiting for your bank to confirm the payment. You'll get an email as soon as it does."}
      </p>
      <Link href="/" className="inline-block underline">Back to the shop</Link>
    </div>
  );
}
