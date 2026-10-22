import Link from "next/link";
import { STATUS_LABELS, STATUS_STYLES, type OrderStatus } from "@/lib/admin/status";
import { formatRM } from "@/lib/money";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FILTERS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "todo", label: "To do", statuses: ["new", "printing"] },
  { key: "shipped", label: "Shipped", statuses: ["shipped"] },
  { key: "all", label: "All paid", statuses: ["new", "printing", "shipped"] },
];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const filter = FILTERS.find((f) => f.key === show) ?? FILTERS[0];
  const { data: orders, error } = await supabaseAdmin()
    .from("orders")
    .select("id, order_number, status, customer_name, total_sen, paid_at, order_items(quantity)")
    .in("status", filter.statuses)
    .order("paid_at", { ascending: true })
    .limit(200);
  if (error) throw error;

  return (
    <div className="space-y-4">
      <nav className="flex gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin?show=${f.key}`}
            className={`rounded-full px-3 py-1.5 ${f === filter ? "bg-neutral-900 text-white" : "bg-neutral-100"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">No orders here.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">#{o.order_number} · {o.customer_name ?? "—"}</p>
                  <p className="text-sm text-neutral-500">
                    {o.order_items.reduce((n: number, i: { quantity: number }) => n + i.quantity, 0)} shirt(s) ·{" "}
                    {o.paid_at ? new Date(o.paid_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" }) : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[o.status as OrderStatus]}`}>
                    {STATUS_LABELS[o.status as OrderStatus]}
                  </span>
                  <p className="mt-1 text-sm">{formatRM(o.total_sen)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
