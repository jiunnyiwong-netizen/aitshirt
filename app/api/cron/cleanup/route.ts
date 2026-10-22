import { NextResponse } from "next/server";
import { requiredEnv } from "@/lib/env";
import { DESIGNS_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

// Daily privacy cleanup (Vercel Cron, see vercel.json). Deletes customer photos,
// AI restyles, previews and print files 30 days after shipping, or after 7 days if never paid.
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

  // Each design keeps all its files in one folder (original, AI restyles, preview, print).
  const storage = db.storage.from(DESIGNS_BUCKET);
  const paths: string[] = rows.flatMap((r) => [r.original_path, r.preview_path, r.print_path]).filter((p): p is string => !!p);
  for (const r of rows) {
    const { data: files } = await storage.list(r.id, { limit: 100 });
    for (const f of files ?? []) paths.push(`${r.id}/${f.name}`);
  }
  const unique = [...new Set(paths)];
  for (let i = 0; i < unique.length; i += 900) {
    const { error: removeError } = await storage.remove(unique.slice(i, i + 900));
    if (removeError) return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  const { error: updateError } = await db
    .from("designs")
    .update({ files_deleted_at: new Date().toISOString() })
    .in("id", rows.map((r) => r.id));
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ deleted: rows.length, files: unique.length });
}
