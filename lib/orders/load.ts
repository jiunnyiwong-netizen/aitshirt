import "server-only";
import type { EmailOrder } from "@/lib/email/templates";
import { supabaseAdmin } from "@/lib/supabase/admin";

// An order with its items, shaped for emails.
export async function loadOrderForEmail(orderId: string) {
  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(
      "id, order_number, customer_name, email, phone, subtotal_sen, shipping_sen, total_sen, shipping_address, courier, tracking_number, order_items(product_name, colour, size, quantity, unit_price_sen)",
    )
    .eq("id", orderId)
    .single();
  if (error) throw error;
  const { order_items, ...order } = data;
  return { ...order, items: order_items } as EmailOrder & {
    id: string;
    courier: string | null;
    tracking_number: string | null;
  };
}
