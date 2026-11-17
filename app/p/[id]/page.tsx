import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getWatchlist } from "@/lib/watchlist";
import { getRequestTime } from "@/lib/request-time";
import ProductDetails from "@/components/product-details";
export const metadata = {
  title: "Product details",
  robots: { index: false, follow: false },
};
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { products, collections, user, error } = await getWatchlist();
  if (!user) redirect("/tracker");
  if (error)
    return (
      <main className="mx-auto min-h-[60vh] max-w-6xl px-6 py-12">
        <Link href="/tracker" className="text-sm text-blue-600">
          ← Back to watchlist
        </Link>
        <p
          role="alert"
          className="mt-6 rounded-md bg-amber-50 p-4 text-amber-800"
        >
          {error}
        </p>
      </main>
    );
  const product = products.find((p) => p.id === id);
  if (!product) notFound();
  return (
    <ProductDetails
      products={products}
      collections={collections}
      product={product}
      now={await getRequestTime()}
    />
  );
}
