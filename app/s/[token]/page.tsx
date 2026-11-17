import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/superbase/server";
import { createDemoWatchlist } from "@/lib/demo";
import { formatPrice } from "@/lib/format";
import { deriveStore } from "@/lib/tracking";
import ProductImage from "@/components/product-image";
import type { PublicWishlist } from "@/utils/types";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Shared wishlist",
  robots: { index: false, follow: false },
};
export default async function SharedWishlist({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let wishlist: PublicWishlist | null = null;
  if (token === "demo-desk") {
    const { products, collections } = createDemoWatchlist();
    wishlist = {
      name: collections[0].name,
      description: collections[0].description,
      items: products
        .filter((p) => p.collection_id === "demo-desk")
        .map((p) => ({
          name: p.name,
          url: p.url,
          image_url: p.image_url,
          price: p.current_price,
          currency: p.currency,
          stock_status: p.stock_status || "unknown",
        })),
    };
  } else {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        token,
      )
    )
      notFound();
    const db = await createClient();
    const { data, error } = await db.rpc("public_wishlist", { p_token: token });
    if (error) throw new Error("Could not load this shared wishlist.");
    wishlist = data as PublicWishlist | null;
  }
  if (!wishlist) notFound();
  return (
    <main className="mx-auto min-h-[70vh] max-w-5xl px-6 py-12">
      {token === "demo-desk" && (
        <p className="mb-4 text-xs text-neutral-500">
          Demo · Sample public wishlist and prices
        </p>
      )}
      <p className="text-xs text-neutral-500">Shared wishlist</p>
      <h1 className="mt-2 text-3xl font-semibold">{wishlist.name}</h1>
      <p className="mt-3 text-neutral-500">{wishlist.description}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {wishlist.items.map((p, i) => (
          <article
            key={i}
            className="flex items-center gap-4 rounded-xl border p-5"
          >
            <div className="size-20 shrink-0 rounded-lg bg-neutral-50 p-2">
              <ProductImage src={p.image_url} name={p.name} />
            </div>
            <div>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600"
              >
                {p.name} ↗
              </a>
              <p className="mt-2 text-xl font-semibold">
                {formatPrice(p.currency, p.price)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {deriveStore(p.url)} · {p.stock_status.replaceAll("_", " ")}
              </p>
            </div>
          </article>
        ))}
      </div>
      {!wishlist.items.length && (
        <p className="mt-8 text-neutral-500">
          No unpurchased items in this wishlist.
        </p>
      )}
      <p className="mt-8 text-xs text-neutral-500">
        Recorded prices may change. Check the store before buying.
      </p>
      <Link href="/tracker" className="mt-6 inline-block text-sm text-blue-600">
        Create your own watchlist →
      </Link>
    </main>
  );
}
