import { NextResponse } from "next/server";
import { z } from "zod";
import { geminiModel, GeminiError, restylePhoto } from "@/lib/ai/gemini";
import { stylePath, type AiStyleKey } from "@/lib/ai/styles";
import { getClientId } from "@/lib/client-id";
import { flags } from "@/lib/flags";
import { DESIGNS_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({ style: z.enum(["cartoon", "anime", "lineart", "popart", "watercolour", "cutout"]) });

const perCustomer = () => Number(process.env.AI_DAILY_LIMIT_PER_CUSTOMER || 6);
const perSite = () => Number(process.env.AI_DAILY_LIMIT_TOTAL || 300);

// Restyles the customer's uploaded photo with Gemini and returns a short-lived link to the result.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!flags.aiRestyleServer()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  const clientId = await getClientId();
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!clientId || !parsed.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const style: AiStyleKey = parsed.data.style;

  const db = supabaseAdmin();
  const storage = db.storage.from(DESIGNS_BUCKET);
  const { data: design } = await db
    .from("designs")
    .select("id, client_id, original_path, files_deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!design || design.client_id !== clientId || !design.original_path || design.files_deleted_at) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }

  const path = stylePath(id, style);
  const signed = async () => (await storage.createSignedUrl(path, 3600)).data?.signedUrl;

  // Already made this style for this photo: reuse it, free.
  const { data: existing } = await storage.list(id, { search: `style-${style}.png` });
  if (existing?.some((f) => f.name === `style-${style}.png`)) {
    return NextResponse.json({ url: await signed(), remaining: null });
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ count: mine }, { count: all }] = await Promise.all([
    db.from("ai_requests").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("ok", true).gte("created_at", since),
    db.from("ai_requests").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  if ((mine ?? 0) >= perCustomer()) {
    return NextResponse.json(
      { error: `You've used today's ${perCustomer()} free AI restyles. You can still use your original photo.` },
      { status: 429 },
    );
  }
  if ((all ?? 0) >= perSite()) {
    return NextResponse.json({ error: "AI restyling is busy right now. Please try again later." }, { status: 503 });
  }

  const { data: file, error: downloadError } = await storage.download(design.original_path);
  if (downloadError) return NextResponse.json({ error: "Photo upload not found" }, { status: 409 });

  const log = { client_id: clientId, design_id: id, style, model: geminiModel() };
  let png: Buffer;
  try {
    png = await restylePhoto(Buffer.from(await file.arrayBuffer()), style);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("ai_requests").insert({ ...log, ok: false, error: message.slice(0, 500) });
    console.error("Gemini restyle failed", message);
    const userMessage =
      e instanceof GeminiError
        ? "The AI couldn't restyle this photo. Try another style or another photo."
        : "Something went wrong. Please try again.";
    return NextResponse.json({ error: userMessage }, { status: 502 });
  }

  const { error: uploadError } = await storage.upload(path, png, { contentType: "image/png", upsert: true });
  if (uploadError) return NextResponse.json({ error: "Could not save the restyled photo" }, { status: 500 });
  await db.from("ai_requests").insert({ ...log, ok: true });

  return NextResponse.json({ url: await signed(), remaining: perCustomer() - (mine ?? 0) - 1 });
}
