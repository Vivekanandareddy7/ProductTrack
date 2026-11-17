import { notFound } from "next/navigation";
import { getRequestTime } from "@/lib/request-time";
import { createDemoWatchlist } from "@/lib/demo";
import ProductDetails from "@/components/product-details";
export const dynamic = "force-dynamic";
export const metadata = { title: "Demo product details" };
export default async function DemoProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const now = await getRequestTime();
  const { products, collections } = createDemoWatchlist(now);
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  return (
    <ProductDetails
      products={products}
      collections={collections}
      product={product}
      demo
      now={now}
    />
  );
}
