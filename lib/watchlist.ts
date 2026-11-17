import "server-only";
import { createClient } from "@/lib/superbase/server";
import { computeStats } from "@/lib/tracking";
import type {
  AlertEvent,
  ProductWithStats,
  PricePoint,
  Collection,
  Purchase,
  ComparisonOffer,
  StockStatus,
} from "@/utils/types";
export async function getWatchlist() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  const empty = {
    user,
    products: [] as ProductWithStats[],
    events: [] as AlertEvent[],
    collections: [] as Collection[],
    purchases: [] as Purchase[],
    error: null as string | null,
  };
  if (!user) return empty;
  const [productResult, collectionResult, purchaseResult, eventResult] =
    await Promise.all([
      db
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      db
        .from("collections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at"),
      db
        .from("purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false }),
      db
        .from("alert_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
  if (
    [productResult, collectionResult, purchaseResult, eventResult].some(
      (r) => r.error,
    )
  )
    return {
      ...empty,
      error:
        "Could not load your workspace. Check that the latest database migration has been applied.",
    };
  const collections = (collectionResult.data || []).map((c) => ({
    ...c,
    budget: c.budget == null ? null : Number(c.budget),
  })) as Collection[];
  const purchases = (purchaseResult.data || []).map((p) => ({
    ...p,
    paid_price: Number(p.paid_price),
    quantity: Number(p.quantity),
    baseline_price: p.baseline_price == null ? null : Number(p.baseline_price),
  })) as Purchase[];
  const products = productResult.data || [];
  const events = (eventResult.data || []) as AlertEvent[];
  if (!products.length) return { ...empty, collections, purchases, events };
  const ids = [...new Set(products.map((p) => p.catalog_id).filter(Boolean))];
  const catalogResult = await db
    .from("catalog_products")
    .select(
      "id,last_error,stock_status,shipping_cost,checked_at,price_checked_at",
    )
    .in("id", ids);
  if (catalogResult.error)
    return {
      ...empty,
      error: "Could not load current availability. Please try again.",
    };
  const history: (PricePoint & { catalog_id: string })[] = [];
  for (let offset = 0; ; offset += 1000) {
    const result = await db
      .from("catalog_price_history")
      .select("catalog_id,price,checked_at")
      .in("catalog_id", ids)
      .order("checked_at")
      .order("id")
      .range(offset, offset + 999);
    if (result.error)
      return { ...empty, error: "Could not load price history." };
    history.push(
      ...(result.data || []).map((h) => ({ ...h, price: Number(h.price) })),
    );
    if ((result.data?.length || 0) < 1000) break;
  }
  const grouped = new Map<string, PricePoint[]>();
  for (const p of history) {
    const points = grouped.get(p.catalog_id) || [];
    points.push(p);
    grouped.set(p.catalog_id, points);
  }
  const base = products.map((p) => {
    const cat = catalogResult.data?.find((c) => c.id === p.catalog_id);
    return {
      ...p,
      current_price: p.current_price == null ? NaN : Number(p.current_price),
      baseline_price:
        p.baseline_price == null ? null : Number(p.baseline_price),
      target_price: p.target_price == null ? null : Number(p.target_price),
      drop_percent: p.drop_percent == null ? null : Number(p.drop_percent),
      delivery_cost: p.delivery_cost == null ? null : Number(p.delivery_cost),
      ...computeStats(
        grouped.get(p.catalog_id) || [],
        p.baseline_price == null ? null : Number(p.baseline_price),
      ),
      stock_status: (cat?.stock_status || "unknown") as StockStatus,
      stock_checked_at: cat?.checked_at,
      last_error: cat?.last_error,
      purchase: purchases.find((b) => b.product_id === p.id) || null,
    };
  }) as ProductWithStats[];
  const toOffer = (p: ProductWithStats): ComparisonOffer => {
    const cat = catalogResult.data?.find((c) => c.id === p.catalog_id);
    const manual = p.delivery_cost != null;
    const shipping = manual ? p.delivery_cost : cat?.shipping_cost;
    return {
      product_id: p.id,
      name: p.name,
      url: p.url,
      image_url: p.image_url,
      current_price: Number.isFinite(p.current_price) ? p.current_price : null,
      currency: p.currency,
      shipping_cost: shipping == null ? null : Number(shipping),
      shipping_source: manual
        ? "manual"
        : shipping == null
          ? "unknown"
          : "store",
      stock_status: p.stock_status || "unknown",
      checked_at: p.updated_at,
    };
  };
  return {
    user,
    error: null,
    collections,
    purchases,
    events,
    products: base.map((p) => ({
      ...p,
      comparisons: p.comparison_group_id
        ? base
            .filter((o) => o.comparison_group_id === p.comparison_group_id)
            .map(toOffer)
        : [toOffer(p)],
    })),
  };
}
