import FirecrawlApp from "@mendable/firecrawl-js";
import { ScrapedProduct } from "@/utils/types";
import { canonicalizeProductUrl } from "@/lib/tracking";

export async function scrapProduct(input: string): Promise<ScrapedProduct> {
  const url = canonicalizeProductUrl(input);
  if (!process.env.FIRECRAWLER_API_KEY)
    throw new Error("Price extraction is not configured.");
  const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWLER_API_KEY });
  const result = await app.scrape(url, {
    formats: [
      {
        type: "json",
        prompt:
          "Extract the selected product variant's actual selling price, not MRP, installment price, coupon or bank offer. Extract name, ISO currency code and main product image. Extract explicit stockStatus as in_stock, out_of_stock or unknown, and shippingCost only if clearly quoted (0 for explicitly free delivery). If a product is out of stock without a quoted price, return currentPrice null. Do not invent prices, availability or shipping.",
        schema: {
          type: "object",
          required: ["productName", "currentPrice", "currencyCode"],
          properties: {
            productName: { type: "string" },
            currentPrice: { type: ["number", "null"] },
            stockStatus: {
              type: "string",
              enum: ["in_stock", "out_of_stock", "unknown"],
            },
            shippingCost: { type: ["number", "null"] },
            currencyCode: { type: "string" },
            productImageUrl: { type: "string" },
          },
        },
      },
    ],
  });
  const data = result.json as ScrapedProduct | undefined;
  if (
    !data?.productName ||
    (data.currentPrice != null &&
      (!Number.isFinite(data.currentPrice) || data.currentPrice <= 0)) ||
    (data.currentPrice == null &&
      !["out_of_stock", "in_stock"].includes(data.stockStatus || "")) ||
    !/^[A-Z]{3}$/.test(data.currencyCode || "")
  ) {
    throw new Error(
      "Could not extract a valid price. Check that this link opens an available product.",
    );
  }
  let image: string | undefined;
  try {
    if (
      data.productImageUrl &&
      new URL(data.productImageUrl).protocol === "https:"
    )
      image = data.productImageUrl;
  } catch {
    /* Optional image. */
  }
  return {
    ...data,
    stockStatus: ["in_stock", "out_of_stock"].includes(data.stockStatus || "")
      ? data.stockStatus
      : "unknown",
    shippingCost:
      data.shippingCost != null &&
      Number.isFinite(data.shippingCost) &&
      data.shippingCost >= 0
        ? data.shippingCost
        : null,
    productName: data.productName.slice(0, 500),
    productImageUrl: image,
  };
}
