import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/superbase/admin";
import { checkCatalogProduct } from "@/lib/catalog";
import { sendPriceDropAlert } from "@/lib/email";
import type { AlertEvent } from "@/utils/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  const actualBytes = Buffer.from(actual),
    expectedBytes = Buffer.from(expected);
  if (
    !secret ||
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = createAdminClient();
    const results = {
      checked: 0,
      skipped: 0,
      failed: 0,
      priceChanges: 0,
      alertsSent: 0,
      alertsFailed: 0,
    };
    const {data: catalog,error: dueError} = await db.rpc("due_catalog_products",{p_limit:12});
    if(dueError)throw dueError;
    for(let i=0;i<(catalog?.length || 0);i+=3) {
      await Promise.all((catalog as {id:string;canonical_url:string}[]).slice(i,i+3).map(async item=>{
        try {const result=await checkCatalogProduct(item.id,item.canonical_url);if(result.skipped)results.skipped++;else{results.checked++;if(result.changed)results.priceChanges++;}}
        catch{results.failed++;}
      }));
    }
    const { data: events, error: eventsError } = await db
      .from("alert_events")
      .select("*")
      .in("status", ["pending", "failed", "sending"])
      .lt("attempts", 5)
      .order("created_at")
      .limit(50);
    if (eventsError) throw eventsError;
    for (const row of events || []) {
      const { data: token, error: claimError } = await db.rpc("claim_alert", {
        p_id: row.id,
      });
      if (claimError) throw claimError;
      if (!token) continue;
      const {
        data: { user },
        error: userError,
      } = await db.auth.admin.getUserById(row.user_id);
      const delivery =
        userError || !user?.email
          ? { error: "No delivery email is available." }
          : await sendPriceDropAlert(
              user.email,
              row as AlertEvent & { product_url: string },
            );
      const { error: saveError } = await db
        .from("alert_events")
        .update({
          status: delivery.success ? "sent" : "failed",
          sent_at: delivery.success ? new Date().toISOString() : null,
          error: delivery.error || null,
          lease_token: null,
          lease_until: null,
        })
        .eq("id", row.id)
        .eq("lease_token", token);
      if (saveError) throw saveError;
      if (delivery.success) results.alertsSent++;
      else results.alertsFailed++;
    }
    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json(
      {
        error:
          "The tracking job failed. Check database migration and service configuration.",
      },
      { status: 500 },
    );
  }
}
// Schedulers such as Vercel invoke GET. Both methods require the same secret.
export const GET = POST;
