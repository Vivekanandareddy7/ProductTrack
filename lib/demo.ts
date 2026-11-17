import { computeStats } from "@/lib/tracking";
import type {
  Collection,
  Purchase,
  AlertEvent,
  ProductWithStats,
} from "@/utils/types";

export function createDemoWatchlist(now = Date.now()) {
  const samples = [
    {
      name: "Redragon Kumara K552",
      url: "https://amazon.in/dp/B016MAK38U",
      image: "/demo-products/keyboard.jpg",
      prices: [2999, 2999, 2799, 2899, 2499, 2499, 2289],
      target: 2300,
      currency: "INR",
    },
    {
      name: "TIMEX Expedition · 38mm",
      url: "https://amazon.in/dp/B000B55AEA",
      image: "/demo-products/watch.jpg",
      prices: [4500, 4500, 4700, 4500, 4800, 4800, 4699],
      target: 4000,
      currency: "INR",
    },
    {
      name: "Apple iPhone 17 Pro Max · 256GB",
      url: "https://amazon.in/dp/B0FQ1Z7M3P",
      image: "/demo-products/phone.jpg",
      prices: [144900, 144900, 142900, 139900, 139900, 136900, 134900],
      target: 130000,
      currency: "INR",
    },
    {
      name: "PUMA Blktop Rider Suede",
      url: "https://myntra.com/shoes/puma/blktop-rider/123456/buy",
      image: "/demo-products/sneakers.jpg",
      prices: [6999, 6999, 5999, 5499, 5999, 4999, 4499],
      target: 4500,
      currency: "INR",
    },
    {
      name: "MSI Codex Z2 Gaming Desktop",
      url: "https://amazon.in/dp/B0D1EXAMPLE",
      image: "/demo-products/desktop.jpg",
      prices: [94990, 92990, 92990, 94990, 93990, 95990, 96990],
      target: 90000,
      currency: "INR",
    },
    {
      name: "XYXX Nova Cotton Polo",
      url: "https://ajio.com/cotton-polo/p/123456",
      image: "/demo-products/polo.jpg",
      prices: [799, 699, 749, 649, 599, 649, 599],
      target: 500,
      currency: "INR",
      paused: true,
    },
  ];
  const products: ProductWithStats[] = samples.map((s, i) => {
    const history = s.prices.map((price, j) => ({
      price,
      checked_at: new Date(now - (6 - j) * 86400000 - 18 * 60000).toISOString(),
    }));
    return {
      id: `demo-${i}`,
      user_id: "demo",
      url: s.url,
      name: s.name,
      current_price: s.prices.at(-1)!,
      currency: s.currency,
      image_url: s.image,
      baseline_price: s.prices[0],
      target_price: s.target,
      alert_enabled: true,
      paused: s.paused || false,
      created_at: new Date(now - (7 + i) * 86400000).toISOString(),
      updated_at: history.at(-1)!.checked_at,
      ...computeStats(history, s.prices[0]),
    };
  });
  const collections: Collection[] = [
    {
      id: "demo-desk",
      user_id: "demo",
      name: "Desk setup",
      description: "A better workspace, within budget.",
      currency: "INR",
      budget: 105000,
      is_public: true,
      share_token: "demo-desk",
      created_at: new Date(now).toISOString(),
    },
  ];
  [products[0], products[4]].forEach((p) => {
    p.collection_id = "demo-desk";
  });
  products.forEach((p) => {
    p.stock_status = "in_stock";
    p.restock_enabled = true;
  });
  products[1].stock_status = "out_of_stock";
  const purchases: Purchase[] = [
    {
      id: "demo-purchase",
      user_id: "demo",
      product_id: products[5].id,
      collection_id: null,
      product_name: products[5].name,
      product_url: products[5].url,
      image_url: products[5].image_url,
      currency: "INR",
      paid_price: 549,
      quantity: 1,
      baseline_price: 799,
      purchased_at: new Date(now - 86400000).toISOString().slice(0, 10),
    },
  ];
  products[5].purchase = purchases[0];
  products[0].comparisons = [
    {
      product_id: products[0].id,
      name: products[0].name,
      url: products[0].url,
      current_price: 2289,
      currency: "INR",
      shipping_cost: 0,
      shipping_source: "store",
      stock_status: "in_stock",
    },
    {
      product_id: "demo-offer",
      name: products[0].name,
      url: "https://www.flipkart.com/",
      current_price: 2399,
      currency: "INR",
      shipping_cost: 40,
      shipping_source: "manual",
      stock_status: "in_stock",
    },
  ];
  const events: AlertEvent[] = [
    {
      id: "demo-alert-1",
      product_id: "demo-0",
      product_name: products[0].name,
      user_id: "demo",
      kind: "target",
      old_price: 2499,
      new_price: 2289,
      target_price: 2300,
      currency: "INR",
      status: "sent",
      created_at: new Date(now - 18 * 60000).toISOString(),
    },
    {
      id: "demo-alert-2",
      product_id: "demo-3",
      product_name: products[3].name,
      user_id: "demo",
      kind: "target",
      old_price: 4999,
      new_price: 4499,
      target_price: 4500,
      currency: "INR",
      status: "pending",
      created_at: new Date(now - 18 * 60000).toISOString(),
    },
  ];
  return { products, events, collections, purchases };
}
