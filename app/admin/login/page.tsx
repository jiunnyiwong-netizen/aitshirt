import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Admin login" };

async function login(formData: FormData) {
  "use server";
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error || !(await getAdmin())) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=1");
  }
  redirect("/admin");
}

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <form action={login} className="mx-auto max-w-sm space-y-3">
      <h1 className="text-xl font-bold">Admin login</h1>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Wrong email or password, or this account is not an admin.</p>}
      <input name="email" type="email" required autoComplete="email" placeholder="Email" className="h-12 w-full rounded-lg border border-neutral-300 px-3" />
      <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className="h-12 w-full rounded-lg border border-neutral-300 px-3" />
      <button className="h-12 w-full rounded-lg bg-neutral-900 font-semibold text-white">Log in</button>
    </form>
  );
}
