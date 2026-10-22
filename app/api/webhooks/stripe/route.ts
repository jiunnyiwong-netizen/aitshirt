import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendEmail } from "@/lib/email/send";
import { newOrderAlertEmail, orderConfirmationEmail } from "@/lib/email/templates";
import { requiredEnv, serverEnv } from "@/lib/env";
import { loadOrderForEmail } from "@/lib/orders/load";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Stripe calls this after payment. Card payments arrive as checkout.session.completed
// with payment_status "paid"; a delayed bank payment arrives later as async_payment_succeeded.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature ?? "", requiredEnv("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        if (event.data.object.payment_status === "paid") await markPaid(event.data.object);
        break;
      case "checkout.session.async_payment_succeeded":
        await markPaid(event.data.object);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await supabaseAdmin()
          .from("orders")
          .update({ status: "cancelled" })
          .eq("stripe_session_id", event.data.object.id)
          .eq("status", "pending_payment");
        break;
    }
  } catch (e) {
    console.error(`Webhook ${event.type} failed`, e);
    // Stripe retries on a non-2xx response.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function markPaid(session: Stripe.Checkout.Session) {
  const db = supabaseAdmin();
  const orderId = session.metadata?.order_id;
  if (!orderId) throw new Error(`Session ${session.id} has no order_id`);

  const full = await stripe().checkout.sessions.retrieve(session.id, { expand: ["payment_intent.payment_method"] });
  const intent = full.payment_intent as Stripe.PaymentIntent | null;
  const method = intent?.payment_method as Stripe.PaymentMethod | null;
  const shipping = full.collected_information?.shipping_details;

  await db
    .from("orders")
    .update({
      status: "new",
      paid_at: new Date().toISOString(),
      email: full.customer_details?.email ?? null,
      customer_name: shipping?.name ?? full.customer_details?.name ?? null,
      phone: full.customer_details?.phone ?? null,
      shipping_address: shipping?.address ?? null,
      shipping_sen: full.shipping_cost?.amount_total ?? 0,
      total_sen: full.amount_total ?? 0,
      stripe_payment_intent_id: intent?.id ?? null,
      payment_method: method?.type ?? null,
    })
    .eq("id", orderId)
    .eq("status", "pending_payment");

  // Claim the confirmation so a retried webhook doesn't email twice.
  const { data: claimed } = await db
    .from("orders")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("confirmation_sent_at", null)
    .select("id");
  if (!claimed?.length) return;

  try {
    const order = await loadOrderForEmail(orderId);
    if (order.email) {
      const mail = orderConfirmationEmail(order);
      await sendEmail(order.email, mail.subject, mail.html);
    }
    const partner = process.env.ADMIN_NOTIFY_EMAIL;
    if (partner) {
      const alert = newOrderAlertEmail(order, `${serverEnv().NEXT_PUBLIC_SITE_URL}/admin/orders/${orderId}`);
      await sendEmail(partner, alert.subject, alert.html).catch((e) => console.error("Partner alert failed", e));
    }
  } catch (e) {
    // Release the claim so Stripe's retry sends it.
    await db.from("orders").update({ confirmation_sent_at: null }).eq("id", orderId);
    throw e;
  }
}
