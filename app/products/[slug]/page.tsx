import { notFound } from "next/navigation";
import { ProductDesigner } from "@/components/designer/ProductDesigner";
import { formatRM } from "@/lib/money";
import { getProduct } from "@/lib/products";

export const revalidate = 60;

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-md space-y-4 lg:max-w-lg">
      <div>
        <h1 className="text-xl font-bold">{product.name}</h1>
        <p className="font-semibold">{formatRM(product.price_sen)}</p>
        {product.description && <p className="mt-1 text-sm text-neutral-600">{product.description}</p>}
      </div>
      <ProductDesigner product={product} />
    </div>
  );
}
