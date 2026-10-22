import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDesigner } from "@/components/designer/ProductDesigner";
import { getProduct } from "@/lib/products";

export const revalidate = 60;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <div className="space-y-4">
      <nav className="text-sm text-muted">
        <Link href="/#shirts" className="underline">All shirts</Link>
      </nav>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{product.name}</h1>
        {product.description && <p className="text-sm text-muted">{product.description}</p>}
      </div>
      <ProductDesigner product={product} />
    </div>
  );
}
