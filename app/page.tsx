import Image from "next/image";
import Link from "next/link";
import { formatRM } from "@/lib/money";
import { listProducts } from "@/lib/products";

export const revalidate = 60;

export default async function Home() {
  const products = await listProducts();
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Your photo, on a premium tee</h1>
        <p className="text-neutral-600">Pick a shirt, upload a photo, and see exactly how it will look before you buy.</p>
      </section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Link key={p.id} href={`/products/${p.slug}`} className="block overflow-hidden rounded-xl border border-neutral-200">
            <Image src={p.colours[0].mockup} alt={p.name} width={500} height={500} className="w-full bg-white" priority />
            <div className="flex items-center justify-between p-4">
              <div>
                <h2 className="font-semibold">{p.name}</h2>
                <p className="text-sm text-neutral-500">{p.colours.map((c) => c.name).join(" · ")}</p>
              </div>
              <span className="font-semibold">{formatRM(p.price_sen)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
