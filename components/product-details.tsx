"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductImage from "@/components/product-image";
import TrackingSettings from "@/components/tracking-settings";
import TrackerPriceChart from "@/components/tracker-price-chart";
import { formatPrice } from "@/lib/format";
import { changePercent, checkedLabel, deriveStore } from "@/lib/tracking";
import ProductManager from "@/components/product-manager";
import StoreComparison from "@/components/store-comparison";
import { PurchaseEditor } from "@/components/purchase-controls";
import type { Collection, ProductWithStats } from "@/utils/types";
import "@/components/tracker-motion.css";
export default function ProductDetails({
  product,
  products = [],
  collections = [],
  demo = false,
  now,
}: {
  product: ProductWithStats;
  products?: ProductWithStats[];
  collections?: Collection[];
  demo?: boolean;
  now: number;
}) {
  const [range, setRange] = useState("all");
  const all = product.history || [];
  const last = all.length ? Date.parse(all.at(-1)!.checked_at) : now;
  const history = all.filter(
    (p) =>
      range === "all" ||
      Date.parse(p.checked_at) >= last - Number(range) * 86400000,
  );
  const enough =
    all.length >= 5 && last - Date.parse(all[0].checked_at) >= 86400000;
  const change = changePercent(product);
  const medianChange =
    enough && Number.isFinite(product.current_price) && product.median_price
      ? ((product.current_price - product.median_price) /
          product.median_price) *
        100
      : null;
  return (
    <main className="tracker-surface min-h-[calc(100dvh-4rem)] bg-white px-4 pb-24 pt-8 sm:px-6">
      <div className="mx-auto max-w-[1392px]">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-6 -ml-3 text-neutral-500"
        >
          <Link href={demo ? "/demo" : "/tracker"}>
            <ArrowLeft size={16} />
            Back to watchlist
          </Link>
        </Button>
        {demo && (
          <p className="mb-6 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
            <Badge variant="outline" className="mr-2 rounded bg-white">
              Demo
            </Badge>
            Sample product details and recorded prices.
          </p>
        )}
        <section className="grid gap-8 border-b border-neutral-200 pb-8 md:grid-cols-[240px_1fr] lg:grid-cols-[240px_minmax(0,1fr)_280px] lg:gap-8">
          <div className="flex h-60 items-center justify-center rounded-xl bg-neutral-50 p-8 md:h-64">
            <ProductImage
              src={product.image_url}
              name={product.name}
              size={300}
            />
          </div>
          <div>
            <p className="mb-3 text-sm text-neutral-500">
              {deriveStore(product.url)} ·{" "}
              {product.paused
                ? "Tracking paused"
                : checkedLabel(product.updated_at, now)}
            </p>
            <h1 className="max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-neutral-900 lg:text-3xl">
              {product.name}
            </h1>
            <p className="mt-5 text-4xl font-semibold tracking-tight">
              {formatPrice(product.currency, product.current_price)}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
              {change != null && change !== 0 && (
                <span
                  className={`inline-flex items-center ${change < 0 ? "text-emerald-700" : "text-rose-600"}`}
                >
                  {change < 0 ? (
                    <ArrowDownRight size={17} />
                  ) : (
                    <ArrowUpRight size={17} />
                  )}{" "}
                  {Math.abs(change).toFixed(1)}%
                </span>
              )}
              From {formatPrice(product.currency, product.first_price)} when
              added
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {!demo && (
                <Button
                  asChild
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on {deriveStore(product.url)}
                    <ExternalLink size={15} />
                  </a>
                </Button>
              )}
              <TrackingSettings product={product} demo={demo} tracker />
              <PurchaseEditor product={product} demo={demo} />
              <ProductManager
                product={product}
                collections={collections}
                demo={demo}
              />
            </div>
            <p className="mt-5 text-sm text-neutral-500">
              Target:{" "}
              <span className="font-medium text-neutral-800">
                {product.target_price != null
                  ? formatPrice(product.currency, product.target_price)
                  : "Not set"}
              </span>{" "}
              ·{" "}
              {product.paused
                ? "Paused"
                : product.alert_enabled
                  ? "Email alerts enabled"
                  : "Email alerts off"}
            </p>
          </div>
          <aside className="rounded-xl border border-neutral-200 p-5 md:col-span-2 lg:col-span-1">
            <h2 className="text-sm font-semibold">Tracking overview</h2>
            <p className="mt-3 text-sm">
              Availability:{" "}
              {(product.stock_status || "unknown").replaceAll("_", " ")}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Restock emails {product.restock_enabled ? "enabled" : "off"}
            </p>
            <dl className="mt-3 divide-y divide-neutral-100 text-sm">
              <div className="flex justify-between py-3">
                <dt className="text-neutral-500">Store</dt>
                <dd>{deriveStore(product.url)}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-neutral-500">Target</dt>
                <dd className="font-medium">
                  {formatPrice(product.currency, product.target_price)}
                </dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-neutral-500">Recorded checks</dt>
                <dd>{all.length}</dd>
              </div>
              <div className="flex justify-between py-3">
                <dt className="text-neutral-500">Alerts</dt>
                <dd>
                  {product.paused
                    ? "Paused"
                    : product.alert_enabled
                      ? "Enabled"
                      : "Off"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-neutral-500">
              {product.last_error
                ? "The last price check failed. A retry is scheduled."
                : checkedLabel(product.updated_at, now)}
            </p>
          </aside>
        </section>
        {product.last_error && (
          <p
            role="alert"
            className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-800"
          >
            {product.last_error}
          </p>
        )}
        <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            { label: "Lowest recorded", value: product.lowest_price },
            { label: "Highest recorded", value: product.highest_price },
            {
              label: "Recorded median",
              value: enough ? product.median_price : null,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-neutral-200 p-5"
            >
              <p className="text-sm text-neutral-500">{s.label}</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatPrice(product.currency, s.value)}
              </p>
              <p className="mt-2 text-xs text-neutral-400">
                {s.label === "Recorded median" && !enough
                  ? "Needs 5 checks spanning a day"
                  : "Within recorded price history"}
              </p>
            </div>
          ))}
        </section>
        <section className="mt-8 rounded-xl border border-neutral-200 p-5 sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Price history</h2>
              <p className="mt-1 text-xs text-neutral-500">
                {history.length} recorded checks
                {all[0] &&
                  ` · Tracking since ${new Date(all[0].checked_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
              </p>
            </div>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger
                aria-label="History time range"
                className="w-36 shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="tracker-select">
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All history</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TrackerPriceChart
            history={history}
            currency={product.currency}
            target={product.target_price}
          />
        </section>
        <StoreComparison product={product} products={products} demo={demo} />
        <section className="mt-8 rounded-xl border border-neutral-200 p-6">
          <h2 className="text-base font-semibold">Price context</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {medianChange != null
              ? Math.abs(medianChange) < 0.05
                ? `Today's price matches the median of ${all.length} recorded checks.`
                : `Today's price is ${Math.abs(medianChange).toFixed(1)}% ${medianChange < 0 ? "below" : "above"} the median of ${all.length} recorded checks.`
              : "We are collecting enough price history for a useful comparison."}
          </p>
          <p className="mt-2 text-sm leading-6 text-neutral-500">
            The curve connects recorded observations; it is a visual guide, not
            evidence of every price between checks. Verify the price at the
            store before buying.
          </p>
        </section>
      </div>
    </main>
  );
}
