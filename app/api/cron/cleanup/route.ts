import { NextResponse } from "next/server";
import { requiredEnv } from "@/lib/env";
import { DESIGNS_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Daily privacy cleanup (Vercel Cron, see vercel.json). Deletes customer photos,
// previews and print files 30 days after shipping, or after 7 days if never paid.
// Order records are kept.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${requiredEnv("CRON_SECRET")}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: due, error } = await db.rpc("designs_due_for_cleanup");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = due as { id: string; original_path: string | null; preview_path: string | null; print_path: string | null }[];
  if (rows.length === 0) return NextResponse.json({ deleted: 0 });

  const paths = rows.flatMap((r) => [r.original_path, r.preview_path, r.print_path]).filter((p): p is string => !!p);
  for (let i = 0; i < paths.length; i += 900) {
    const { error: removeError } = await db.storage.from(DESIGNS_BUCKET).remove(paths.slice(i, i + 900));
    if (removeError) return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  const { error: updateError } = await db
    .from("designs")
    .update({ files_deleted_at: new Date().toISOString() })
    .in("id", rows.map((r) => r.id));
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ deleted: rows.length, files: paths.length });
}
