"use client";
import { useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Search,
  SearchX,
  Package,
  Bell,
  Activity,
  TrendingDown,
  Target,
  Pause,
  Menu,
  ArrowUpDown,
  ShoppingBag,
  Plus,
} from "lucide-react";
import ProductCard from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Autocomplete,
  AutocompleteInput,
  AutocompletePopup,
  AutocompleteList,
  AutocompleteItem,
  AutocompleteEmpty,
} from "@/components/ui/autocomplete";
import { changePercent, deriveStore, targetReached } from "@/lib/tracking";
import { CollectionEditor } from "@/components/collection-controls";
import type { Collection, ProductWithStats } from "@/utils/types";
export type TrackerSection = "watchlist" | "alerts" | "health" | "purchases";
export default function TrackedProducts({
  products,
  query,
  setQuery,
  demo = false,
  now,
  section,
  setSection,
  children,
  heading,
  alertCount = 0,
  onAdd,
  collections = [],
  collectionId,
  setCollectionId,
  purchaseCount = 0,
}: {
  products: ProductWithStats[];
  query: string;
  setQuery: (value: string) => void;
  demo?: boolean;
  now: number;
  section: TrackerSection;
  setSection: (value: TrackerSection) => void;
  children: ReactNode;
  heading: ReactNode;
  alertCount?: number;
  onAdd: () => void;
  collections?: Collection[];
  collectionId: string | null;
  setCollectionId: (id: string | null) => void;
  purchaseCount?: number;
}) {
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [stores, setStores] = useState<string[]>([]);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduced = useReducedMotion();
  const storeOptions = [
    ...new Set(products.map((p) => deriveStore(p.url))),
  ].sort();
  const matches = (p: ProductWithStats, key: string) =>
    key === "all" ||
    (key === "drops" && (changePercent(p) ?? 0) < 0) ||
    (key === "targets" && targetReached(p)) ||
    (key === "paused" && p.paused);
  const visible = useMemo(
    () =>
      products
        .filter(
          (p) =>
            `${p.name} ${deriveStore(p.url)}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()) &&
            (!stores.length || stores.includes(deriveStore(p.url))) &&
            (min === "" || p.current_price >= Number(min)) &&
            (max === "" || p.current_price <= Number(max)) &&
            matches(p, status) &&
            (!collectionId || p.collection_id === collectionId),
        )
        .sort((a, b) =>
          sort === "low"
            ? a.current_price - b.current_price
            : sort === "high"
              ? b.current_price - a.current_price
              : sort === "drop"
                ? (changePercent(a) ?? 0) - (changePercent(b) ?? 0)
                : Date.parse(b.created_at || "") -
                  Date.parse(a.created_at || ""),
        ),
    [products, query, stores, min, max, status, sort, collectionId],
  );
  const suggestions = products
    .filter((p) =>
      `${p.name} ${deriveStore(p.url)}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 8);
  const filters = [
    { key: "all", label: "All products", Icon: Package },
    { key: "drops", label: "Price drops", Icon: TrendingDown },
    { key: "targets", label: "Targets reached", Icon: Target },
    { key: "paused", label: "Paused", Icon: Pause },
  ];
  function clear() {
    setStores([]);
    setMin("");
    setMax("");
    setStatus("all");
    setQuery("");
  }
  function showSection(next: TrackerSection) {
    setSection(next);
    if (next === "watchlist") setCollectionId(null);
    setMobileOpen(false);
  }
  const sidebar = (
    <div className="space-y-7">
      <nav aria-label="Tracker navigation" className="space-y-1">
        {[
          {
            key: "watchlist" as const,
            label: "Watchlist",
            Icon: Package,
            count: products.length,
          },
          {
            key: "alerts" as const,
            label: "Alert history",
            Icon: Bell,
            count: alertCount,
          },
          {
            key: "purchases" as const,
            label: "Purchases",
            Icon: ShoppingBag,
            count: purchaseCount,
          },
          {
            key: "health" as const,
            label: "Tracking status",
            Icon: Activity,
            count: null,
          },
        ].map((item) => (
          <Button
            key={item.key}
            variant="ghost"
            onClick={() => showSection(item.key)}
            aria-current={section === item.key ? "page" : undefined}
            className={`h-10 w-full justify-start px-3 text-sm font-medium ${section === item.key ? "bg-blue-50 text-blue-700 hover:bg-blue-50" : "text-neutral-600"}`}
          >
            <item.Icon size={16} />
            {item.label}
            {item.count != null && (
              <span className="ml-auto text-xs tabular-nums opacity-60">
                {item.count}
              </span>
            )}
          </Button>
        ))}
      </nav>
      <div>
        <p className="mb-2 px-3 text-xs font-semibold text-neutral-500">
          Collections
        </p>
        {collections.map((c) => (
          <Button
            key={c.id}
            variant="ghost"
            className={`w-full justify-start truncate text-sm ${collectionId === c.id && section === "watchlist" ? "bg-blue-50 text-blue-700" : "text-neutral-600"}`}
            onClick={() => {
              setSection("watchlist");
              setCollectionId(c.id);
              setMobileOpen(false);
              clear();
            }}
          >
            {c.name}
            <span className="ml-auto text-xs opacity-60">
              {products.filter((p) => p.collection_id === c.id).length}
            </span>
          </Button>
        ))}
        <CollectionEditor demo={demo} />
      </div>
      {section === "watchlist" && products.length > 0 && (
        <>
          <fieldset className="space-y-1">
            <legend className="mb-3 px-3 text-xs font-semibold text-neutral-500">
              Status
            </legend>
            {filters.map(({ key, label, Icon }) => (
              <Button
                key={key}
                variant="ghost"
                aria-pressed={status === key}
                onClick={() => setStatus(key)}
                className={`h-9 w-full justify-start px-3 text-sm font-normal ${status === key ? "bg-neutral-100 text-neutral-900" : "text-neutral-500"}`}
              >
                <Icon size={15} />
                {label}
                <span className="ml-auto text-xs tabular-nums text-neutral-400">
                  {products.filter((p) => matches(p, key)).length}
                </span>
              </Button>
            ))}
          </fieldset>
          {storeOptions.length > 0 && (
            <fieldset className="px-3">
              <legend className="mb-3 text-xs font-semibold text-neutral-500">
                Stores
              </legend>
              <div className="space-y-3">
                {storeOptions.map((store) => (
                  <label
                    key={store}
                    className="flex items-center gap-2.5 text-sm text-neutral-600"
                  >
                    <input
                      type="checkbox"
                      checked={stores.includes(store)}
                      onChange={(e) =>
                        setStores(
                          e.target.checked
                            ? [...stores, store]
                            : stores.filter((s) => s !== store),
                        )
                      }
                      className="size-3.5 accent-blue-600"
                    />
                    {store}
                    <span className="ml-auto text-xs text-neutral-400">
                      {
                        products.filter((p) => deriveStore(p.url) === store)
                          .length
                      }
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset className="px-3">
            <legend className="mb-3 text-xs font-semibold text-neutral-500">
              Price range
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Minimum price"
                type="number"
                min="0"
                placeholder="Min"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
              <Input
                aria-label="Maximum price"
                type="number"
                min="0"
                placeholder="Max"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </div>
            <p className="mt-2 text-[11px] leading-4 text-neutral-400">
              In each product’s listed currency.
            </p>
            {min !== "" && max !== "" && Number(min) > Number(max) && (
              <p role="alert" className="mt-2 text-xs text-amber-700">
                Min is greater than max.
              </p>
            )}
          </fieldset>
          {(stores.length > 0 || min || max || status !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 text-xs text-blue-600"
              onClick={clear}
            >
              Reset filters
            </Button>
          )}
        </>
      )}
    </div>
  );
  return (
    <div className="flex min-h-0 flex-1 items-stretch gap-8 xl:gap-10">
      <aside
        aria-label="Watchlist sidebar"
        data-lenis-prevent
        className="hidden h-full w-52 shrink-0 overflow-y-auto overscroll-contain border-r border-neutral-200 pb-5 pr-5 lg:block"
      >
        {sidebar}
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-4 shrink-0 lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Menu size={16} />
                Navigation & filters
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="tracker-sheet w-72 overflow-y-auto"
            >
              <SheetTitle className="mb-2">Your tracker</SheetTitle>
              <SheetDescription className="mb-6">
                Navigation and watchlist filters.
              </SheetDescription>
              {sidebar}
            </SheetContent>
          </Sheet>
        </div>
        {heading}
        {section === "watchlist" ? (
          <>
            {products.length > 0 && (
              <>
                <div className="mb-5 flex shrink-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <div className="w-full sm:min-w-40 sm:flex-1 sm:max-w-sm">
                    <Autocomplete
                      items={products}
                      filteredItems={suggestions}
                      itemToStringValue={(p) => p.name}
                      value={query}
                      onValueChange={setQuery}
                    >
                      <AutocompleteInput
                        aria-label="Search your watchlist"
                        placeholder="Search products…"
                        startAddon={
                          <Search size={16} className="text-neutral-400" />
                        }
                        showClear
                        className="h-10 [&_input]:h-full [&_input]:leading-normal"
                      />
                      <AutocompletePopup className="tracker-popup">
                        <AutocompleteEmpty>
                          No matching products.
                        </AutocompleteEmpty>
                        <AutocompleteList>
                          {(p: ProductWithStats) => (
                            <AutocompleteItem key={p.id} value={p}>
                              <span className="flex-1 truncate text-sm">
                                {p.name}
                              </span>
                              <span className="text-xs text-neutral-400">
                                {deriveStore(p.url)}
                              </span>
                            </AutocompleteItem>
                          )}
                        </AutocompleteList>
                      </AutocompletePopup>
                    </Autocomplete>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:gap-3">
                    <Select value={sort} onValueChange={setSort}>
                      <SelectTrigger
                        aria-label="Sort products"
                        className="h-10 min-w-0 flex-1 gap-2 bg-white text-sm shadow-none sm:w-44 sm:flex-none"
                      >
                        <ArrowUpDown size={14} className="text-neutral-400" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="tracker-select">
                        <SelectItem value="newest">Newest first</SelectItem>
                        <SelectItem value="low">Price: low to high</SelectItem>
                        <SelectItem value="high">Price: high to low</SelectItem>
                        <SelectItem value="drop">Biggest drop</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={onAdd}
                      className="h-10 shrink-0 bg-linear-to-b from-blue-500 to-blue-700 px-4 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      Add product
                    </Button>
                  </div>
                </div>
                <p className="mb-4 shrink-0 text-xs text-neutral-500">
                  Showing {visible.length} of {products.length} products
                </p>
              </>
            )}
            <div
              data-lenis-prevent
              data-testid="product-scroll"
              tabIndex={0}
              role="region"
              aria-label="Product list"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5 pr-1 [scrollbar-gutter:stable]"
            >
              {visible.length ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {visible.map((p) => (
                    <motion.div
                      key={p.id}
                      layout={reduced || query ? false : "position"}
                      initial={false}
                      transition={{
                        layout: { duration: 0.18, ease: [0.23, 1, 0.32, 1] },
                      }}
                    >
                      <ProductCard
                        prodcut={p}
                        collections={collections}
                        demo={demo}
                        now={now}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-80 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-neutral-200 p-6 text-center">
                  <SearchX size={26} className="text-neutral-300" />
                  <h2 className="text-base font-medium">
                    {products.length
                      ? "No matching products"
                      : "No products tracked yet"}
                  </h2>
                  <p className="max-w-sm text-sm leading-6 text-neutral-500">
                    {products.length
                      ? "Try another search or broaden your filters."
                      : "Add a product link to start recording prices and set your first alert."}
                  </p>
                  {products.length === 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-3">
                      <Button
                        onClick={onAdd}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Add your first product
                      </Button>
                      {!demo && (
                        <Button asChild variant="outline">
                          <a href="/demo">Explore the demo</a>
                        </Button>
                      )}
                    </div>
                  )}
                  {products.length > 0 && (
                    <Button variant="outline" onClick={clear}>
                      Clear search and filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            data-lenis-prevent
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5"
          >
            {children}
          </div>
        )}
      </section>
    </div>
  );
}
