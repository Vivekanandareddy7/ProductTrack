"use server";
import { createClient } from "@/lib/superbase/server";
import { revalidatePath } from "next/cache";
import { addProdcut } from "@/app/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
async function mutate<T>(
  work: (db: SupabaseClient, userId: string) => Promise<T>,
): Promise<T | { error: string }> {
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { error: "Sign in to manage your watchlist." };
    const result = await work(db, user.id);
    revalidatePath("/tracker");
    revalidatePath("/p/[id]", "page");
    return result;
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save your changes.",
    };
  }
}
function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export async function saveCollection(input: {
  id?: string;
  name: string;
  description: string;
  budget: number | null;
  currency: string;
}) {
  return mutate(async (db, userId) => {
    const name = input.name.trim();
    if (!name || name.length > 60 || input.description.length > 500)
      throw new Error(
        "Use a collection name of 1–60 characters and a description under 500 characters.",
      );
    if (
      !/^[A-Z]{3}$/.test(input.currency) ||
      (input.budget != null &&
        (!Number.isFinite(input.budget) ||
          input.budget < 0 ||
          input.budget > 1e9))
    )
      throw new Error("Enter a valid currency and budget.");
    const values = {
      name,
      description: input.description.trim(),
      budget: input.budget,
      currency: input.currency,
    };
    const result = input.id
      ? await db
          .from("collections")
          .update(values)
          .eq("id", input.id)
          .eq("user_id", userId)
          .select("id")
          .single()
      : await db
          .from("collections")
          .insert({ ...values, user_id: userId })
          .select("id")
          .single();
    check(result.error);
    return { success: true, id: result.data!.id as string };
  });
}
export async function deleteCollection(id: string) {
  return mutate(async (db, userId) => {
    const { data, error } = await db
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    check(error);
    if (!data) throw new Error("Collection not found.");
    return { success: true };
  });
}
export async function assignProductCollection(
  productId: string,
  collectionId: string | null,
) {
  return mutate(async (db) => {
    const { error } = await db.rpc("assign_collection", {
      p_product: productId,
      p_collection: collectionId,
    });
    check(error);
    return { success: true };
  });
}
export async function shareCollection(id: string, enabled: boolean) {
  return mutate(async (db) => {
    const { data, error } = await db.rpc("set_collection_sharing", {
      p_collection: id,
      p_public: enabled,
    });
    check(error);
    return { success: true, token: data as string | null };
  });
}
export async function savePurchase(
  productId: string,
  price: number,
  quantity: number,
  date: string,
) {
  return mutate(async (db) => {
    if (
      !Number.isFinite(price) ||
      price < 0 ||
      price > 1e9 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    )
      throw new Error("Enter a valid paid price, quantity and date.");
    const { data, error } = await db.rpc("record_purchase", {
      p_product: productId,
      p_price: price,
      p_quantity: quantity,
      p_date: date,
    });
    check(error);
    return { success: true, id: data as string };
  });
}
export async function deletePurchase(id: string) {
  return mutate(async (db) => {
    const { error } = await db.rpc("remove_purchase", { p_purchase: id });
    check(error);
    return { success: true };
  });
}
export async function prepareComparison(url: string) {
  const form = new FormData();
  form.set("url", url);
  const added = await addProdcut(form);
  if (added.error) return { error: added.error };
  if (!added.productId) return { error: "Could not load this store listing." };
  return mutate(async (db, userId) => {
    const { data, error } = await db
      .from("products")
      .select("id,name,url,image_url,current_price,currency")
      .eq("id", added.productId)
      .eq("user_id", userId)
      .single();
    check(error);
    if (!data) throw new Error("Offer not found.");
    return {
      success: true,
      candidate: {
        ...data,
        current_price:
          data.current_price == null ? null : Number(data.current_price),
      } as {
        id: string;
        name: string;
        url: string;
        image_url?: string;
        current_price: number | null;
        currency: string;
      },
    };
  });
}
export async function linkStoreOffer(
  sourceId: string,
  offerId: string,
  confirmed: boolean,
  delivery: number | null,
) {
  return mutate(async (db) => {
    const { error } = await db.rpc("link_comparison", {
      p_source: sourceId,
      p_offer: offerId,
      p_confirmed: confirmed,
      p_delivery: delivery,
    });
    check(error);
    return { success: true };
  });
}
export async function unlinkStoreOffer(productId: string) {
  return mutate(async (db) => {
    const { error } = await db.rpc("unlink_comparison", {
      p_product: productId,
    });
    check(error);
    return { success: true };
  });
}
