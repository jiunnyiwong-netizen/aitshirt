import { NextResponse } from "next/server";
import { flags } from "@/lib/flags";

// Phase 2 "Try it on me" (FASHN AI). Not built yet: stays a 404 until FEATURE_TRYON=true.
export async function POST() {
  if (!flags.tryOnServer()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ error: "Not implemented yet" }, { status: 501 });
}
