"use server";
import { createClient } from "@/lib/superbase/server";
import { createAdminClient } from "@/lib/superbase/admin";
import { checkCatalogProduct } from "@/lib/catalog";
import { canonicalizeProductUrl } from "@/lib/tracking";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function addProdcut(formData: FormData) {
  try {
    const url = canonicalizeProductUrl(String(formData.get("url") || ""));
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Sign in to add a product." };
    const admin = createAdminClient();
    const { count, error: countError } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (countError)
      throw new Error(
        "Apply the tracking database migration before adding products.",
      );
    const { data: catalog, error: catalogError } = await admin
      .from("catalog_products")
      .upsert(
        { canonical_url: url },
        { onConflict: "canonical_url", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    if (catalogError)
      throw new Error(
        "Apply the tracking database migration before adding products.",
      );
    let id = catalog?.id;
    if (!id) {
      const { data, error } = await admin
        .from("catalog_products")
        .select("id")
        .eq("canonical_url", url)
        .single();
      if (error) throw error;
      id = data.id;
    }
    const { data: existing, error: existingError } = await admin
      .from("products")
      .select("id")
      .eq("user_id", user.id)
      .eq("catalog_id", id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing)
      return {
        message: "This product is already on your watchlist.",
        productId: existing.id,
      };
    if ((count ?? 0) >= 50)
      return {
        error:
          "Your watchlist is full (50 products). Remove an item to add another.",
      };
    await checkCatalogProduct(id, url);
    const { data: item, error: itemError } = await admin
      .from("catalog_products")
      .select("*")
      .eq("id", id)
      .single();
    if (itemError) throw itemError;
    if (
      !item.current_price &&
      item.stock_status !== "out_of_stock" &&
      item.stock_status !== "in_stock"
    )
      return { error: "This product is being checked. Try again shortly." };
    const { data: added, error } = await admin
      .from("products")
      .insert({
        user_id: user.id,
        catalog_id: id,
        url,
        name: item.name,
        current_price: item.current_price,
        currency: item.currency,
        image_url: item.image_url,
        updated_at: item.checked_at,
        baseline_price: item.current_price,
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      const { data: duplicate } = await admin
        .from("products")
        .select("id")
        .eq("user_id", user.id)
        .eq("catalog_id", id)
        .single();
      return {
        message: "This product is already on your watchlist.",
        productId: duplicate?.id,
      };
    }
    if (error) throw error;
    revalidatePath("/tracker");
    return {
      productId: added?.id,
      message:
        "Product added. Set a target to get an email when it is reached.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not add this product.",
    };
  }
}

export async function updateTrackingSettings(
  productId: string,
  settings: {
    target_price: number | null;
    drop_percent: number | null;
    alert_enabled: boolean;
    paused: boolean;
    restock_enabled?: boolean;
  },
) {
  const target = settings.target_price;
  const drop = settings.drop_percent;
  if (
    target != null &&
    (!Number.isFinite(target) || target <= 0 || target > 1e9)
  )
    return { error: "Enter a target price greater than zero." };
  if (drop != null && (!Number.isFinite(drop) || drop <= 0 || drop >= 100))
    return { error: "Enter a drop percentage between 0 and 100." };
  if (settings.alert_enabled && target == null && drop == null)
    return { error: "Set a target price or drop percentage to enable alerts." };
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { error: "Sign in to update your alerts." };
  const { data, error } = await db
    .from("products")
    .update({
      target_price: target,
      drop_percent: drop,
      alert_enabled: Boolean(settings.alert_enabled),
      paused: Boolean(settings.paused),
      ...(settings.restock_enabled !== undefined
        ? { restock_enabled: Boolean(settings.restock_enabled) }
        : {}),
    })
    .eq("id", productId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return {
      error:
        "Could not save settings. Check that the tracking migration has been applied.",
    };
  revalidatePath("/tracker");
  revalidatePath(`/p/${productId}`);
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { error: "Sign in to remove a product." };
  const { data, error } = await db
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Could not remove this product." };
  revalidatePath("/tracker");
  return { success: true };
}

export async function getProduct() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return [];
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return error ? { error: "Could not load your watchlist." } : data || [];
}

export async function getPriceHistory(productId: string) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { error: "Sign in to view price history." };
  const { data: product, error: productError } = await db
    .from("products")
    .select("catalog_id")
    .eq("id", productId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (productError || !product) return { error: "Product not found." };
  const { data, error } = await db
    .from("catalog_price_history")
    .select("price, checked_at")
    .eq("catalog_id", product.catalog_id)
    .order("checked_at", { ascending: true });
  return error ? { error: "Could not load price history." } : data || [];
}
