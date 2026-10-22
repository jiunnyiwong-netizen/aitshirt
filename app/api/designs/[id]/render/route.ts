import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientId } from "@/lib/client-id";
import { effectiveDpi, MAX_WIDTH_FRACTION } from "@/lib/print-area";
import { renderPrintPng } from "@/lib/render/print";
import { DESIGNS_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({
  colour: z.string().min(1),
  transform: z.object({
    cx: z.number().min(-2).max(3),
    cy: z.number().min(-2).max(3),
    width: z.number().positive().max(MAX_WIDTH_FRACTION),
    rotation: z.number().min(-360).max(360),
  }),
  // Mockup preview drawn in the browser, as a PNG data URL (small: about 800 px wide).
  preview: z.string().startsWith("data:image/png;base64,").max(4_000_000),
});

// "Add to cart": saves the preview and builds the 300 DPI A3 print file.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = await getClientId();
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { colour, transform, preview } = parsed.data;

  const db = supabaseAdmin();
  const { data: design } = await db
    .from("designs")
    .select("id, client_id, original_path, files_deleted_at, products(colours)")
    .eq("id", id)
    .maybeSingle();
  if (!design || design.client_id !== clientId || !design.original_path || design.files_deleted_at) {
    return NextResponse.json({ error: "Design not found" }, { status: 404 });
  }
  const colours = (design.products as unknown as { colours: { key: string }[] }).colours;
  if (!colours.some((c) => c.key === colour)) {
    return NextResponse.json({ error: "Unknown colour" }, { status: 400 });
  }

  const { data: file, error: downloadError } = await db.storage
    .from(DESIGNS_BUCKET)
    .download(design.original_path);
  if (downloadError) return NextResponse.json({ error: "Photo upload not found" }, { status: 409 });
  const original = Buffer.from(await file.arrayBuffer());

  let print: Buffer;
  let sourceWidth: number;
  let sourceHeight: number;
  try {
    print = await renderPrintPng(original, transform);
    const sharp = (await import("sharp")).default;
    const meta = await sharp(original).metadata();
    const sideways = (meta.orientation ?? 1) >= 5;
    sourceWidth = (sideways ? meta.height : meta.width) ?? 0;
    sourceHeight = (sideways ? meta.width : meta.height) ?? 0;
  } catch {
    return NextResponse.json({ error: "We couldn't read that photo. Try a JPG or PNG." }, { status: 422 });
  }

  const previewPng = Buffer.from(preview.slice("data:image/png;base64,".length), "base64");
  const previewPath = `${id}/preview.png`;
  const printPath = `${id}/print.png`;
  const storage = db.storage.from(DESIGNS_BUCKET);
  const [p1, p2] = await Promise.all([
    storage.upload(previewPath, previewPng, { contentType: "image/png", upsert: true }),
    storage.upload(printPath, print, { contentType: "image/png", upsert: true }),
  ]);
  if (p1.error || p2.error) return NextResponse.json({ error: "Could not save your design" }, { status: 500 });

  const dpi = effectiveDpi(sourceWidth, transform.width);
  await db
    .from("designs")
    .update({
      colour,
      transform,
      source_width: sourceWidth,
      source_height: sourceHeight,
      effective_dpi: dpi,
      preview_path: previewPath,
      print_path: printPath,
    })
    .eq("id", id);

  return NextResponse.json({ ok: true, effectiveDpi: dpi });
}
