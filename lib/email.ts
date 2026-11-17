import "server-only";
import { Resend } from "resend";
import { formatPrice } from "@/lib/format";
import type { AlertEvent, SendPriceDropAlertResult } from "@/utils/types";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}

export async function sendPriceDropAlert(
  email: string,
  event: AlertEvent & { product_url: string },
): Promise<SendPriceDropAlertResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!key || !from) return { error: "Email delivery is not configured." };
  const name = escapeHtml(event.product_name);
  const price = formatPrice(event.currency, event.new_price);
  const reason =
    event.kind === "restock"
      ? "This product is back in stock, based on the latest store check."
      : event.kind === "target"
        ? `Your target of ${formatPrice(event.currency, event.target_price)} has been reached.`
        : `The price is at least ${event.drop_percent}% below the price when you added it.`;
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send(
      {
        from,
        to: email,
        subject: `${event.kind === "restock" ? "Back in stock" : "Price alert"}: ${event.product_name.slice(0, 100)}`,
        text: `${event.product_name}\n${reason}\nCurrent price: ${price}\nView product: ${event.product_url}\nManage alerts in your ProductTrack watchlist.`,
        html: `<div style="background:#f6f7fb;padding:40px 20px;font-family:Arial,sans-serif;color:#18181b"><div style="max-width:520px;margin:auto;background:white;border:1px solid #e4e4e7;border-radius:16px;padding:32px"><p style="color:#4f46e5;font-weight:bold">PRODUCTTRACK / PRICE ALERT</p><h1 style="font-size:24px">Your tracking update</h1><p>${name}</p><p style="font-size:36px;font-weight:bold">${escapeHtml(price)}</p><p style="color:#52525b">${escapeHtml(reason)}</p><a style="display:inline-block;background:#4f46e5;color:white;padding:14px 20px;border-radius:10px;text-decoration:none" href="${escapeHtml(event.product_url)}">View product</a><p style="font-size:12px;color:#71717a;margin-top:32px">Prices can change. Manage or pause alerts in your ProductTrack watchlist.</p></div></div>`,
      },
      { idempotencyKey: `producttrack-alert/${event.id}` },
    );
    if (error) return { error: error.message };
    return { success: true };
  } catch {
    return { error: "Email provider could not be reached." };
  }
}
