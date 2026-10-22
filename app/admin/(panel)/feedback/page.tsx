import { supabaseAdmin } from "@/lib/supabase/admin";

type Row = {
  ease_of_use: number | null;
  fair_price: number | null;
  would_buy_again: "yes" | "maybe" | "no" | null;
  comments: string | null;
  created_at: string;
  orders: { order_number: number } | null;
};

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "—";
};

export default async function AdminFeedback() {
  const { data, error } = await supabaseAdmin()
    .from("feedback")
    .select("ease_of_use, fair_price, would_buy_again, comments, created_at, orders(order_number)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data as unknown as Row[];
  const again = (v: string) => rows.filter((r) => r.would_buy_again === v).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Feedback ({rows.length})</h1>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <Stat label="Ease of use" value={`${avg(rows.map((r) => r.ease_of_use))} / 5`} />
        <Stat label="Fair price" value={`${avg(rows.map((r) => r.fair_price))} / 5`} />
        <Stat label="Buy again" value={`${again("yes")} yes · ${again("maybe")} maybe · ${again("no")} no`} />
      </div>
      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 text-sm">
        {rows.map((r, i) => (
          <li key={i} className="space-y-1 p-4">
            <p className="text-neutral-500">
              #{r.orders?.order_number ?? "—"} · ease {r.ease_of_use ?? "—"} · price {r.fair_price ?? "—"} · again {r.would_buy_again ?? "—"}
            </p>
            {r.comments && <p>{r.comments}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-100 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
