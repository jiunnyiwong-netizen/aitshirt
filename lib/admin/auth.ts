import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

// Admins are Supabase users whose app_metadata.role is "admin".
export async function getAdmin() {
  const { data } = await (await supabaseServer()).auth.getUser();
  const user = data.user;
  return user && user.app_metadata?.role === "admin" ? user : null;
}

export async function requireAdmin() {
  const user = await getAdmin();
  if (!user) redirect("/admin/login");
  return user;
}
