import type { ProductWithStats, PricePoint } from "@/utils/types";

/** Store identities intentionally retain domain/country and product variants. */
export function canonicalizeProductUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid product URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Use a public HTTPS product link.");
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  // Supported retailers only: avoids scraping arbitrary/internal addresses.
  const amazon =
    /^(?:[a-z0-9-]+\.)?amazon\.(?:in|com|co\.uk|de|fr|it|es|ca|com\.au)$/.test(
      host,
    );
  const flipkart = host === "flipkart.com";
  const others = ["myntra.com", "ajio.com", "croma.com", "meesho.com"];
  if (!amazon && !flipkart && !others.includes(host)) {
    throw new Error(
      "Use a full product link from Amazon, Flipkart, Myntra, AJIO, Croma or Meesho.",
    );
  }
  url.hostname = host;
  url.hash = "";
  const asin =
    amazon &&
    url.pathname.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:\/|$)/i);
  if (asin) url.pathname = `/dp/${asin[1].toUpperCase()}`;
  const keep = amazon ? ["th", "psc"] : flipkart ? ["pid"] : [];
  for (const key of [...url.searchParams.keys()])
    if (!keep.includes(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}

export function deriveStore(input: string): string {
  try {
    const host = new URL(input).hostname;
    if (host.includes("amazon.")) return "Amazon";
    if (host.includes("flipkart.")) return "Flipkart";
    if (host.includes("myntra.")) return "Myntra";
    if (host.includes("ajio.")) return "AJIO";
    if (host.includes("croma.")) return "Croma";
    if (host.includes("meesho.")) return "Meesho";
    return "Store";
  } catch {
    return "Store";
  }
}

export function computeStats(history: PricePoint[], baseline?: number | null) {
  const valid = history
    .filter((p) => Number.isFinite(Number(p.price)) && Number(p.price) > 0)
    .sort((a, b) => a.checked_at.localeCompare(b.checked_at));
  const sorted = valid.map((p) => Number(p.price)).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    first_price: baseline ?? valid[0]?.price ?? null,
    lowest_price: sorted[0] ?? null,
    highest_price: sorted.at(-1) ?? null,
    median_price: sorted.length
      ? (sorted[middle] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2
      : null,
    observation_count: valid.length,
    history: valid,
  };
}

export function changePercent(p: ProductWithStats): number | null {
  const first = Number(p.first_price);
  const current = Number(p.current_price);
  return first > 0 && Number.isFinite(current)
    ? ((current - first) / first) * 100
    : null;
}

export function targetReached(p: ProductWithStats): boolean {
  return (
    !p.paused &&
    p.stock_status !== "out_of_stock" &&
    Boolean(p.alert_enabled) &&
    p.target_price != null &&
    Number(p.current_price) <= Number(p.target_price)
  );
}

export function alertEligible(
  price: number,
  baseline: number,
  target: number | null,
  drop: number | null,
): boolean {
  return (
    (target != null && price <= target) ||
    (drop != null && baseline > 0 && price <= baseline * (1 - drop / 100))
  );
}

export function checkedLabel(value?: string | null, now = Date.now()): string {
  if (!value) return "Awaiting first check";
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 60000),
  );
  if (!Number.isFinite(minutes)) return "Awaiting first check";
  if (minutes < 1) return "Checked just now";
  if (minutes < 60) return `Checked ${minutes}m ago`;
  if (minutes < 1440) return `Checked ${Math.floor(minutes / 60)}h ago`;
  return `Checked ${Math.floor(minutes / 1440)}d ago`;
}
