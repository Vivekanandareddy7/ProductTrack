import type {
  Collection,
  Purchase,
  ProductWithStats,
  ComparisonOffer,
} from "@/utils/types";
export function purchaseSavings(p: Purchase): number | null {
  return p.baseline_price != null &&
    Number.isFinite(p.baseline_price) &&
    p.baseline_price > 0
    ? (p.baseline_price - p.paid_price) * p.quantity
    : null;
}
export function collectionTotals(
  collection: Collection,
  products: ProductWithStats[],
  purchases: Purchase[],
) {
  const items = products.filter(
    (p) =>
      p.collection_id === collection.id &&
      p.currency === collection.currency &&
      !p.purchase,
  );
  const spent = purchases
    .filter(
      (p) =>
        p.collection_id === collection.id && p.currency === collection.currency,
    )
    .reduce((sum, p) => sum + p.paid_price * p.quantity, 0);
  const wishlist = items.reduce(
    (sum, p) =>
      sum +
      (Number.isFinite(p.current_price) && p.current_price > 0
        ? p.current_price
        : 0),
    0,
  );
  const unknown = items.filter(
    (p) => !Number.isFinite(p.current_price) || p.current_price <= 0,
  ).length;
  return {
    spent,
    wishlist,
    projected: spent + wishlist,
    unknown,
    count: items.length,
    remaining:
      collection.budget == null ? null : collection.budget - spent - wishlist,
  };
}
export function offerTotal(offer: ComparisonOffer): number | null {
  return offer.current_price != null &&
    Number.isFinite(offer.current_price) &&
    offer.shipping_cost != null &&
    Number.isFinite(offer.shipping_cost)
    ? offer.current_price + offer.shipping_cost
    : null;
}
export function comparisonWinner(offers: ComparisonOffer[]): string | null {
  const available = offers.filter((o) => o.stock_status === "in_stock");
  if (
    available.length < 2 ||
    available.some((o) => offerTotal(o) == null) ||
    new Set(available.map((o) => o.currency)).size !== 1
  )
    return null;
  return [...available].sort((a, b) => offerTotal(a)! - offerTotal(b)!)[0]
    .product_id;
}
