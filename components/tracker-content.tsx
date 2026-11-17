"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CircleAlert, Check, Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductForm from "@/components/prodcut-form";
import TrackedProducts, {
  type TrackerSection,
} from "@/components/tracked-products";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { checkedLabel } from "@/lib/tracking";
import { formatPrice } from "@/lib/format";
import {
  CollectionEditor,
  CollectionSharing,
} from "@/components/collection-controls";
import { PurchaseLog } from "@/components/purchase-controls";
import { collectionTotals } from "@/lib/workspace";
import type {
  Collection,
  Purchase,
  AlertEvent,
  ProductWithStats,
  User,
} from "@/utils/types";
import "@/components/tracker-motion.css";
export default function TrackerContent({
  products,
  collections = [],
  purchases = [],
  user,
  events = [],
  error,
  demo = false,
  now,
}: {
  products: ProductWithStats[];
  collections?: Collection[];
  purchases?: Purchase[];
  user: User | null;
  events?: AlertEvent[];
  error?: string | null;
  demo?: boolean;
  now: number;
}) {
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const collection = collections.find((c) => c.id === collectionId);
  const totals = collection
    ? collectionTotals(collection, products, purchases)
    : null;
  const watchProducts = products.filter((p) => !p.purchase);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<TrackerSection>("watchlist");
  const [addOpen, setAddOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState("all");
  const active = products.filter((p) => !p.paused).length;
  const failed = products.filter((p) => !p.paused && p.last_error);
  const alerts = products.filter((p) => !p.paused && p.alert_enabled).length;
  const fresh = products.filter(
    (p) =>
      p.updated_at &&
      now - Date.parse(p.updated_at) < 86400000 &&
      !p.paused &&
      !p.last_error,
  ).length;
  const latest = products
    .filter((p) => p.updated_at)
    .sort(
      (a, b) => Date.parse(b.updated_at!) - Date.parse(a.updated_at!),
    )[0]?.updated_at;
  const visibleEvents = events.filter(
    (e) => activityFilter === "all" || e.status === activityFilter,
  );
  const heading =
    section !== "watchlist" ? (
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {section === "alerts"
              ? "Alert history"
              : section === "purchases"
                ? "Purchase history"
                : "Tracking status"}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {section === "alerts"
              ? "Review notifications and delivery status for your saved rules."
              : section === "purchases"
                ? "Your actual spending and savings against the price when added."
                : "See which products are up to date and which checks need a retry."}
          </p>
        </div>
      </header>
    ) : collection ? (
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-2 text-sm text-neutral-500">
              {collection.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CollectionEditor collection={collection} demo={demo} />
          <CollectionSharing collection={collection} demo={demo} />
        </div>
      </header>
    ) : null;
  return (
    <main className="tracker-surface tracker-workspace h-[calc(100dvh-4rem)] overflow-hidden bg-white text-neutral-900">
      <div className="mx-auto flex h-full max-w-[1440px] flex-col px-4 pt-5 sm:px-6">
        {demo && (
          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500">
            <span>
              <Badge
                variant="outline"
                className="mr-2 rounded bg-white text-[10px] font-medium"
              >
                Demo
              </Badge>
              Sample products, prices and alerts.
            </span>
            <Link
              href="/tracker"
              className="inline-flex items-center gap-1 font-medium text-blue-600"
            >
              Open your watchlist
              <ArrowRight size={13} />
            </Link>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mb-4 flex shrink-0 items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <CircleAlert size={17} />
            {error}
          </div>
        )}
        <TrackedProducts
          products={watchProducts}
          collections={collections}
          collectionId={collection?.id || null}
          setCollectionId={setCollectionId}
          purchaseCount={purchases.length}
          query={query}
          setQuery={setQuery}
          demo={demo}
          now={now}
          section={section}
          setSection={setSection}
          alertCount={events.length}
          onAdd={() => setAddOpen(true)}
          heading={
            <>
              {heading}
              {section === "watchlist" && collection && totals && (
                <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-4">
                  {[
                    { label: "Budget", value: collection.budget },
                    { label: "Paid so far", value: totals.spent },
                    { label: "Wishlist total", value: totals.wishlist },
                    {
                      label: "After planned purchases",
                      value: totals.remaining,
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <p className="text-xs text-neutral-500">{item.label}</p>
                      <p className="mt-1 font-semibold">
                        {formatPrice(collection.currency, item.value)}
                      </p>
                    </div>
                  ))}
                  {totals.unknown > 0 && (
                    <p className="col-span-full text-xs text-amber-700">
                      {totals.unknown} items have no quoted price and are
                      excluded from totals.
                    </p>
                  )}
                  <p className="col-span-full text-xs text-neutral-500">
                    Wishlist totals use one unit per item and exclude delivery
                    costs.
                  </p>
                </div>
              )}
            </>
          }
        >
          {section === "purchases" ? (
            <PurchaseLog
              purchases={purchases}
              products={products}
              demo={demo}
            />
          ) : section === "alerts" ? (
            <section aria-label="Alert history">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  {visibleEvents.length} notifications
                </p>
                <Select
                  value={activityFilter}
                  onValueChange={setActivityFilter}
                >
                  <SelectTrigger
                    aria-label="Filter alert activity"
                    className="w-40 shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="tracker-select">
                    <SelectItem value="all">All recent alerts</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {visibleEvents.length ? (
                <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 px-5">
                  {visibleEvents.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 py-5">
                      <span
                        className={`mt-1 ${e.status === "sent" ? "text-emerald-600" : e.status === "failed" ? "text-amber-600" : "text-neutral-400"}`}
                      >
                        {e.status === "sent" ? (
                          <Check size={17} />
                        ) : e.status === "failed" ? (
                          <CircleAlert size={17} />
                        ) : e.status === "cancelled" ? (
                          <X size={17} />
                        ) : (
                          <Clock3 size={17} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={
                            demo
                              ? `/demo/p/${e.product_id}`
                              : `/p/${e.product_id}`
                          }
                          className="text-sm font-medium text-neutral-800 hover:text-blue-600"
                        >
                          {e.product_name}
                        </Link>
                        <p className="mt-1 text-xs text-neutral-500">
                          {e.kind === "restock"
                            ? "Back in stock"
                            : e.kind === "target"
                              ? `Target ${formatPrice(e.currency, e.target_price)} reached`
                              : `${e.drop_percent}% below price when added`}{" "}
                          · {formatPrice(e.currency, e.new_price)}
                        </p>
                        <p className="mt-2 text-xs text-neutral-400">
                          {new Date(e.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {e.error && ` · ${e.error}`}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="rounded-md text-xs font-normal capitalize"
                      >
                        {e.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 py-20 text-center text-sm text-neutral-500">
                  No notifications in this view.
                </div>
              )}
            </section>
          ) : (
            <section
              aria-label="Tracking status"
              className="rounded-xl border border-neutral-200 p-6"
            >
              <dl className="divide-y divide-neutral-100 text-sm">
                {[
                  {
                    label: "Checked in the last 24 hours",
                    value: `${fresh} / ${active}`,
                  },
                  { label: "Email rules enabled", value: alerts },
                  { label: "Checks needing a retry", value: failed.length },
                  { label: "Paused products", value: products.length - active },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between py-4">
                    <dt className="text-neutral-500">{item.label}</dt>
                    <dd className="font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {failed.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-amber-700">
                  {failed.map((p) => (
                    <li key={p.id}>{p.name}: retry scheduled</li>
                  ))}
                </ul>
              )}
              <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-500">
                Each product shows its last successful check. Pausing disables
                your alerts; shared prices may still update if another user
                tracks the same item.
              </p>
            </section>
          )}
        </TrackedProducts>
        <footer className="shrink-0 border-t border-neutral-100 py-3 text-xs text-neutral-400 lg:ml-60">
          {active} active · {products.length - active} paused ·{" "}
          {checkedLabel(latest, now)}
          <span className="float-right hidden sm:inline">
            Prices can change before checkout.
          </span>
        </footer>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="tracker-dialog rounded-xl sm:max-w-xl">
          <DialogTitle>Add product</DialogTitle>
          <DialogDescription>
            {demo
              ? "This demo uses sample data. Open your own watchlist to track a real product."
              : "Paste a full product link from a supported store."}
          </DialogDescription>
          {demo ? (
            <Button
              asChild
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Link href="/tracker">
                Open your watchlist
                <ArrowRight size={15} />
              </Link>
            </Button>
          ) : (
            <ProductForm user={user} onSuccess={() => setAddOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
