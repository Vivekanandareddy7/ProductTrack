"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { useReducedMotion } from "motion/react";

import { ArrowDownRight, ArrowUpRight, ArrowRight, Check } from "lucide-react";

import { formatPrice, localeForCurrency, normalizeCurrency } from "@/lib/format";
import {
  changePercent,
  checkedLabel,
  deriveStore,
  targetReached,
} from "@/lib/tracking";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProductImage from "@/components/product-image";
import TrackingSettings from "@/components/tracking-settings";
import ProductManager from "@/components/product-manager";
import TrackerPriceChart from "@/components/tracker-price-chart";
import type { Collection, ProductWithStats } from "@/utils/types";
export default function ProductCard({
  prodcut: product,
  demo = false,
  now,
  collections = [],
}: {
  prodcut: ProductWithStats;
  demo?: boolean;
  now: number;
  collections?: Collection[];
}) {
  const reduced = useReducedMotion();
  const change = changePercent(product);
  const reached = targetReached(product);
  const lowest =
    (product.observation_count || 0) >= 2 &&
    product.lowest_price != null &&
    product.current_price <= product.lowest_price;
  const href = demo ? `/demo/p/${product.id}` : `/p/${product.id}`;
  const currencyCode = normalizeCurrency(product.currency);
  return (
    <Card className="tracker-product h-full gap-0 overflow-hidden rounded-xl border-neutral-200 bg-white py-0 shadow-none">
      <article aria-label={product.name}>
        <div className="flex items-center justify-between gap-2 px-5 pt-4">
          <p className="flex items-center gap-2 text-xs text-neutral-500">
            <span
              className={`size-1.5 rounded-full ${product.paused ? "bg-neutral-300" : product.last_error ? "bg-amber-500" : "bg-emerald-500"}`}
            />
            {deriveStore(product.url)}
            <span className="text-neutral-300">·</span>
            {product.stock_status === "out_of_stock"
              ? "Out of stock"
              : product.paused
                ? "Paused"
                : "Tracking"}
          </p>
          <div className="flex items-center gap-1">
            {reached ? (
              <Badge
                variant="ghost"
                className="rounded px-1 text-xs font-normal text-emerald-700"
              >
                <Check size={12} />
                Target reached
              </Badge>
            ) : lowest && !product.paused ? (
              <Badge
                variant="ghost"
                className="rounded px-1 text-xs font-normal text-neutral-500"
              >
                Lowest recorded
              </Badge>
            ) : null}
            <ProductManager
              product={product}
              collections={collections}
              demo={demo}
            />
          </div>
        </div>
        <Link
          href={href}
          className="group grid grid-cols-[80px_minmax(0,1fr)] items-center gap-3 px-5 pb-1 pt-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 xl:grid-cols-[80px_minmax(0,1fr)_104px]"
          aria-label={`View details for ${product.name}`}
        >
          <div className="flex size-20 items-center justify-center rounded-lg bg-neutral-50 p-2">
            <ProductImage src={product.image_url} name={product.name} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5 text-neutral-800 group-hover:text-blue-600">
              {product.name}
            </h3>
            {Number.isFinite(product.current_price) ? (
              <NumberFlow
                value={product.current_price}
                locales={localeForCurrency(currencyCode)}
                format={{
                  style: "currency",
                  currency: currencyCode,
                  maximumFractionDigits: Number.isInteger(product.current_price)
                    ? 0
                    : 2,
                }}
                animated={!reduced}
                className="mt-2 block text-[26px] font-semibold leading-tight tracking-tight text-neutral-950 tabular-nums"
              />
            ) : (
              <p className="mt-2 text-lg font-semibold">Price unavailable</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
              {change != null && change !== 0 && (
                <span
                  className={`inline-flex items-center gap-0.5 font-medium ${change < 0 ? "text-emerald-700" : "text-rose-600"}`}
                >
                  {change < 0 ? (
                    <ArrowDownRight size={14} />
                  ) : (
                    <ArrowUpRight size={14} />
                  )}{" "}
                  {Math.abs(change).toFixed(1)}%
                </span>
              )}
              <span>
                {change == null || change === 0
                  ? "No change since added"
                  : "since added"}
              </span>
            </div>
          </div>
          <dl className="hidden self-stretch border-l border-neutral-100 pl-3 xl:flex xl:flex-col xl:justify-center">
            <dt className="text-xs text-neutral-500">
              {product.target_price != null
                ? "Your target"
                : "Highest recorded"}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-neutral-800">
              {formatPrice(
                product.currency,
                product.target_price ?? product.highest_price,
              )}
            </dd>
            {product.target_price != null && (
              <dd
                className={`mt-1.5 text-xs ${reached ? "text-emerald-700" : "text-neutral-500"}`}
              >
                {reached
                  ? "Target reached"
                  : Number.isFinite(product.current_price)
                    ? `${formatPrice(product.currency, Math.max(0, product.current_price - product.target_price))} to go`
                    : "Awaiting price"}
              </dd>
            )}
          </dl>
        </Link>
        <div className="px-5 pt-1">
          <TrackerPriceChart
            history={product.history || []}
            currency={product.currency}
            compact
          />
        </div>
        <div className="flex items-center justify-between px-5 pb-4 pt-1 text-xs text-neutral-500">
          <p>
            Lowest{" "}
            <span className="font-medium text-neutral-700">
              {formatPrice(product.currency, product.lowest_price)}
            </span>
          </p>
          <p>{product.observation_count || 0} price checks</p>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-neutral-600 xl:hidden">
              {product.target_price != null ? (
                <>
                  Target{" "}
                  <span className="ml-1 font-medium text-neutral-900">
                    {formatPrice(product.currency, product.target_price)}
                  </span>
                </>
              ) : product.drop_percent ? (
                `${product.drop_percent}% drop alert`
              ) : (
                "No price alert set"
              )}
            </p>
            <p
              className={`mt-1 text-xs ${product.last_error ? "text-amber-700" : "text-neutral-500"}`}
            >
              {product.paused
                ? "Paused"
                : product.alert_enabled
                  ? "Email alerts enabled"
                  : "Email alerts off"}
              <span className="mx-1.5 text-neutral-300">·</span>
              {product.last_error
                ? "Check failed; retry scheduled"
                : checkedLabel(product.updated_at, now)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TrackingSettings product={product} demo={demo} tracker />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs shadow-none"
            >
              <Link href={href}>
                Details
                <ArrowRight size={13} />
              </Link>
            </Button>
          </div>
        </footer>
      </article>
    </Card>
  );
}
