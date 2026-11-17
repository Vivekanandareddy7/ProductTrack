import "server-only";
import { createAdminClient } from "@/lib/superbase/admin";
import { scrapProduct } from "@/lib/superbase/firecrawl";

export async function checkCatalogProduct(id: string, url: string) {
  const db = createAdminClient();
  const { data: token, error: claimError } = await db.rpc(
    "claim_catalog_check",
    { p_id: id },
  );
  if (claimError)
    throw new Error(
      "Could not claim a price check. Apply the tracking migration first.",
    );
  if (!token) return { skipped: true, changed: false };
  try {
    const scraped = await scrapProduct(url);
    const { data, error } = await db.rpc("complete_catalog_check", {
      p_id: id,
      p_token: token,
      p_name: scraped.productName,
      p_price: scraped.currentPrice,
      p_currency: scraped.currencyCode || "INR",
      p_image: scraped.productImageUrl || null,
      p_stock: scraped.stockStatus || "unknown",
      p_shipping: scraped.shippingCost ?? null,
    });
    if (error) throw new Error(error.message);
    return { skipped: false, changed: data === 1 };
  } catch (error) {
    const { error: updateError } = await db
      .from("catalog_products")
      .update({
        next_check_at: new Date(Date.now() + 15 * 60000).toISOString(),
        last_error:
          "Price check failed. We will retry on the next scheduled run.",
        lease_token: null,
        lease_until: null,
      })
      .eq("id", id)
      .eq("lease_token", token);
    if (updateError)
      console.error("Failed to record price check failure", updateError.code);
    throw error;
  }
}
