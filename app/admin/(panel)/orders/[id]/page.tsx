/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_LABELS, STATUS_STYLES, type OrderStatus } from "@/lib/admin/status";
import { formatRM } from "@/lib/money";
import { DESIGNS_BUCKET, supabaseAdmin } from "@/lib/supabase/admin";
import { updateOrder } from "./actions";

const LINK_SECONDS = 600;

type Item = {
  id: string;
  product_name: string;
  colour: string;
  size: string;
  quantity: number;
  unit_price_sen: number;
  designs: {
    id: string;
    original_path: string | null;
    preview_path: string | null;
    print_path: string | null;
    effective_dpi: number | null;
    style: string;
    files_deleted_at: string | null;
  };
};

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .select(
      "*, order_items(id, product_name, colour, size, quantity, unit_price_sen, designs(id, original_path, preview_path, print_path, effective_dpi, style, files_deleted_at))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const items = order.order_items as Item[];
  const storage = db.storage.from(DESIGNS_BUCKET);
  // Short-lived links: the bucket is private.
  const sign = async (path: string | null, download?: string) => {
    if (!path) return null;
    const { data } = await storage.createSignedUrl(path, LINK_SECONDS, download ? { download } : undefined);
    return data?.signedUrl ?? null;
  };
  const files = await Promise.all(
    items.map(async (i, n) => {
      const base = `order-${order.order_number}-${n + 1}-${i.size}`;
      const ext = i.designs.original_path?.split(".").pop() ?? "jpg";
      return {
        preview: await sign(i.designs.preview_path),
        print: await sign(i.designs.print_path, `${base}-print-A3-300dpi.png`),
        original: await sign(i.designs.original_path, `${base}-original.${ext}`),
      };
    }),
  );
  const a = order.shipping_address as Record<string, string | null> | null;
  const status = order.status as OrderStatus;
  const editable = ["new", "printing", "shipped"].includes(status);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Order #{order.order_number}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
      </div>

      <section className="grid gap-1 text-sm">
        <p className="font-semibold">{order.customer_name}</p>
        <p>{order.phone} · {order.email}</p>
        {a && <p className="text-neutral-600">{[a.line1, a.line2, [a.postal_code, a.city].filter(Boolean).join(" "), a.state].filter(Boolean).join(", ")}</p>}
        <p className="text-neutral-600">
          {formatRM(order.total_sen)} incl. {formatRM(order.shipping_sen)} shipping · paid by {order.payment_method ?? "—"}
        </p>
      </section>

      <ul className="space-y-4">
        {items.map((i, n) => (
          <li key={i.id} className="flex gap-4 rounded-xl border border-neutral-200 p-3">
            {files[n].preview ? (
              <img src={files[n].preview!} alt="Preview" className="h-32 w-32 rounded-lg border border-neutral-100 object-contain" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-500">No preview</div>
            )}
            <div className="flex-1 space-y-1 text-sm">
              <p className="font-semibold">{i.product_name}</p>
              <p>{i.colour} · size {i.size} · qty {i.quantity}</p>
              {i.designs.style !== "original" && <p className="text-neutral-500">AI style: {i.designs.style}</p>}
              {i.designs.effective_dpi !== null && (
                <p className={i.designs.effective_dpi < 150 ? "text-amber-700" : "text-neutral-500"}>Prints at {i.designs.effective_dpi} DPI</p>
              )}
              {i.designs.files_deleted_at ? (
                <p className="text-neutral-500">Files deleted (privacy cleanup).</p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {files[n].print && <a href={files[n].print!} className="rounded-lg bg-neutral-900 px-3 py-2 text-white">Print file (A3 PNG)</a>}
                  {files[n].original && <a href={files[n].original!} className="rounded-lg border border-neutral-300 px-3 py-2">Original photo</a>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-neutral-500">Download links expire after 10 minutes. Reload the page for fresh ones.</p>

      {editable && (
        <form action={updateOrder.bind(null, order.id)} className="space-y-3 rounded-xl border border-neutral-200 p-4">
          <h2 className="font-semibold">Update</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["new", "printing", "shipped"] as const).map((s) => (
              <label key={s} className="flex h-11 cursor-pointer items-center justify-center rounded-lg border border-neutral-300 text-sm has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-900 has-[:checked]:text-white">
                <input type="radio" name="status" value={s} defaultChecked={s === status} className="sr-only" />
                {STATUS_LABELS[s]}
              </label>
            ))}
          </div>
          <input name="courier" defaultValue={order.courier ?? ""} placeholder="Courier (e.g. J&T, Pos Laju)" className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
          <input name="tracking_number" defaultValue={order.tracking_number ?? ""} placeholder="Tracking number" className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm" />
          <button className="h-11 w-full rounded-lg bg-neutral-900 font-semibold text-white">Save</button>
          <p className="text-xs text-neutral-500">Setting Shipped emails the customer their tracking number.</p>
        </form>
      )}
      <Link href="/admin" className="text-sm underline">Back to orders</Link>
    </div>
  );
}
