import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";

const body = z.object({
  token: z.string().uuid(),
  ease_of_use: z.number().int().min(1).max(5).nullable(),
  fair_price: z.number().int().min(1).max(5).nullable(),
  would_buy_again: z.enum(["yes", "maybe", "no"]).nullable(),
  comments: z.string().max(2000).nullable(),
});

// Saves (or updates) the post-checkout feedback for one order.
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid feedback" }, { status: 400 });
  const { token, ...answers } = parsed.data;

  const db = supabaseAdmin();
  const { data: order } = await db.from("orders").select("id").eq("feedback_token", token).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { error } = await db
    .from("feedback")
    .upsert({ order_id: order.id, ...answers, comments: answers.comments?.trim() || null }, { onConflict: "order_id" });
  if (error) return NextResponse.json({ error: "Could not save feedback" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
