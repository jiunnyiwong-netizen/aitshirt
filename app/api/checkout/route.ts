import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientId } from "@/lib/client-id";
import { serverEnv } from "@/lib/env";
import { SHIPPING_RATES } from "@/lib/shipping";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

const SIZES = ["S", "M", "L", "XL", "XXL", "3XL"] as const;

const body = z.object({
  items: z
    .array(
      z.object({
        designId: z.string().uuid(),
        size: z.enum(SIZES),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
});

type DesignRow = {
  id: string;
  client_id: string;
  colour: string;
  print_path: string | null;
  files_deleted_at: string | null;
  products: { id: string; name: string; price_sen: number; colours: { key: string; name: string }[]; active: boolean };
};

// Creates a pending order and a Stripe Checkout session. Prices come from the
// database, never from the browser.
export async function POST(request: Request) {
  const clientId = await getClientId();
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!clientId || !parsed.success) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  const { items } = parsed.data;

  const db = supabaseAdmin();
  const designIds = [...new Set(items.map((i) => i.designId))];
  const { data, error } = await db
    .from("designs")
    .select("id, client_id, colour, print_path, files_deleted_at, products(id, name, price_sen, colours, active)")
    .in("id", designIds);
  if (error) return NextResponse.json({ error: "Could not load your cart" }, { status: 500 });

  const designs = new Map((data as unknown as DesignRow[]).map((d) => [d.id, d]));
  const lines = [];
  for (const item of items) {
    const d = designs.get(item.designId);
    if (!d || d.client_id !== clientId || !d.print_path || d.files_deleted_at || !d.products.active) {
      return NextResponse.json(
        { error: "One of your designs is no longer available. Please remove it and design it again.", designId: item.designId },
        { status: 409 },
      );
    }
    const colourName = d.products.colours.find((c) => c.key === d.colour)?.name ?? d.colour;
    lines.push({ ...item, design: d, colourName });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.design.products.price_sen * l.quantity, 0);

  const { data: order, error: orderError } = await db
    .from("orders")
    .insert({ subtotal_sen: subtotal, total_sen: subtotal })
    .select("id, order_number")
    .single();
  if (orderError) return NextResponse.json({ error: "Could not create your order" }, { status: 500 });

  const { error: itemsError } = await db.from("order_items").insert(
    lines.map((l) => ({
      order_id: order.id,
      product_id: l.design.products.id,
      design_id: l.designId,
      product_name: l.design.products.name,
      colour: l.design.colour,
      size: l.size,
      quantity: l.quantity,
      unit_price_sen: l.design.products.price_sen,
    })),
  );
  if (itemsError) {
    await db.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Could not create your order" }, { status: 500 });
  }

  const site = serverEnv().NEXT_PUBLIC_SITE_URL;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      currency: "myr",
      // Card and FPX must also be turned on in Stripe → Settings → Payment methods.
      allowed_payment_method_types: ["card", "fpx"],
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: "myr",
          unit_amount: l.design.products.price_sen,
          product_data: { name: `${l.design.products.name} (${l.colourName}, ${l.size})` },
        },
      })),
      shipping_address_collection: { allowed_countries: ["MY"] },
      phone_number_collection: { enabled: true },
      shipping_options: SHIPPING_RATES.map((r) => ({
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: r.label,
          fixed_amount: { amount: r.amountSen, currency: "myr" },
          delivery_estimate: {
            minimum: { unit: "business_day", value: r.minDays },
            maximum: { unit: "business_day", value: r.maxDays },
          },
        },
      })),
      client_reference_id: order.id,
      metadata: { order_id: order.id, order_number: String(order.order_number) },
      payment_intent_data: { metadata: { order_id: order.id } },
      success_url: `${site}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cart`,
    });

    await db.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout failed", e);
    await db.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Payment is unavailable right now. Please try again shortly." }, { status: 502 });
  }
}
