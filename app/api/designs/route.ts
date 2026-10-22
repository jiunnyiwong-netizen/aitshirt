import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientId } from "@/lib/client-id";
import { DESIGNS_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

const body = z.object({
  productId: z.string().uuid(),
  colour: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  consent: z.literal(true),
});

// Starts a design: creates the row and returns a signed link so the browser can
// upload the original photo straight to Storage (Vercel caps request bodies at 4.5 MB).
export async function POST(request: Request) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Please reload the page and try again." }, { status: 400 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { productId, colour, contentType } = parsed.data;

  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("id, colours")
    .eq("id", productId)
    .eq("active", true)
    .maybeSingle();
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  if (!(product.colours as { key: string }[]).some((c) => c.key === colour)) {
    return NextResponse.json({ error: "Unknown colour" }, { status: 400 });
  }

  const { data: design, error } = await db
    .from("designs")
    .insert({ client_id: clientId, product_id: productId, colour, consent_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Could not start the design" }, { status: 500 });

  const path = `${design.id}/original.${EXTENSIONS[contentType]}`;
  const { data: upload, error: uploadError } = await db.storage
    .from(DESIGNS_BUCKET)
    .createSignedUploadUrl(path);
  if (uploadError) return NextResponse.json({ error: "Could not prepare the upload" }, { status: 500 });

  await db.from("designs").update({ original_path: path }).eq("id", design.id);

  return NextResponse.json({ designId: design.id, path, token: upload.token });
}
