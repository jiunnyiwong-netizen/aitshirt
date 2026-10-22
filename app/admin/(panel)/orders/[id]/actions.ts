"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { sendEmail } from "@/lib/email/send";
import { shippedEmail } from "@/lib/email/templates";
import { loadOrderForEmail } from "@/lib/orders/load";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED = ["new", "printing", "shipped"] as const;

export async function updateOrder(orderId: string, formData: FormData) {
  await requireAdmin();
  const status = String(formData.get("status"));
  if (!ALLOWED.includes(status as (typeof ALLOWED)[number])) throw new Error("Invalid status");
  const courier = String(formData.get("courier") ?? "").trim() || null;
  const tracking = String(formData.get("tracking_number") ?? "").trim() || null;

  const db = supabaseAdmin();
  const { data: before } = await db.from("orders").select("status").eq("id", orderId).single();
  if (!before || !["new", "printing", "shipped"].includes(before.status)) throw new Error("Order not editable");

  const now = new Date().toISOString();
  const changes: Record<string, unknown> = { status, courier, tracking_number: tracking };
  if (status === "printing" && before.status === "new") changes.printing_at = now;
  if (status === "shipped" && before.status !== "shipped") changes.shipped_at = now;
  if (status !== "shipped") changes.shipped_at = null;
  await db.from("orders").update(changes).eq("id", orderId);

  if (status === "shipped" && before.status !== "shipped") {
    const order = await loadOrderForEmail(orderId);
    if (order.email) {
      const mail = shippedEmail(order);
      await sendEmail(order.email, mail.subject, mail.html).catch((e) => console.error("Shipped email failed", e));
    }
  }
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
}
