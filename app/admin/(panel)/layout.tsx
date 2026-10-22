import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  await (await supabaseServer()).auth.signOut();
  redirect("/admin/login");
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <nav className="flex gap-4 font-semibold">
          <Link href="/admin">Orders</Link>
          <Link href="/admin/feedback">Feedback</Link>
        </nav>
        <form action={logout} className="flex items-center gap-3 text-neutral-500">
          <span className="hidden sm:inline">{user.email}</span>
          <button className="underline">Log out</button>
        </form>
      </div>
      {children}
    </div>
  );
}
