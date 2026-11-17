"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  prepareComparison,
  linkStoreOffer,
  unlinkStoreOffer,
} from "@/app/workspace-actions";
import { formatPrice } from "@/lib/format";
import { deriveStore } from "@/lib/tracking";
import { offerTotal, comparisonWinner } from "@/lib/workspace";
import type { ProductWithStats } from "@/utils/types";
export default function StoreComparison({
  product,
  products = [],
  demo = false,
}: {
  product: ProductWithStats;
  products?: ProductWithStats[];
  demo?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [url, setUrl] = useState(""),
    [candidate, setCandidate] = useState<{
      id: string;
      name: string;
      currency: string;
      current_price: number | null;
    } | null>(null),
    [confirmed, setConfirmed] = useState(false),
    [delivery, setDelivery] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  const offers = product.comparisons || [];
  const winner = comparisonWinner(offers);
  async function load() {
    if (demo) {
      toast.info("Sample comparison. Sign in to add another store.");
      return;
    }
    setBusy(true);
    try {
      const r = await prepareComparison(url);
      if ("error" in r) toast.error(r.error);
      else {
        setCandidate(r.candidate);
        setConfirmed(false);
      }
    } catch {
      toast.error("Could not load listing.");
    } finally {
      setBusy(false);
    }
  }
  async function link() {
    if (!candidate) return;
    if (demo) {
      toast.info("Sample data; nothing changed.");
      return;
    }
    setBusy(true);
    try {
      const r = await linkStoreOffer(
        product.id,
        candidate.id,
        confirmed,
        delivery === "" ? null : Number(delivery),
      );
      if ("error" in r) toast.error(r.error);
      else {
        setOpen(false);
        router.refresh();
        toast.success("Store offer linked");
      }
    } catch {
      toast.error("Could not link offer.");
    } finally {
      setBusy(false);
    }
  }
  async function updateDelivery(id: string, cost: string) {
    const other = offers.find((o) => o.product_id !== id);
    if (!other) return;
    if (demo) {
      toast.info("Sample costs; nothing changed.");
      return;
    }
    setBusy(true);
    try {
      const r = await linkStoreOffer(
        other.product_id,
        id,
        true,
        cost === "" ? null : Number(cost),
      );
      if ("error" in r) toast.error(r.error);
      else {
        router.refresh();
        toast.success("Delivery cost updated");
      }
    } catch {
      toast.error("Could not update cost.");
    } finally {
      setBusy(false);
    }
  }
  async function unlink(id: string) {
    if (demo) {
      toast.info("Sample comparison; nothing changed.");
      return;
    }
    setBusy(true);
    try {
      const r = await unlinkStoreOffer(id);
      if ("error" in r) toast.error(r.error);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 rounded-xl border border-neutral-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Compare stores</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Offers you confirm as the same model, size, colour and variant.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (next) {
              setCandidate(null);
              setConfirmed(false);
              setDelivery("");
            }
            setOpen(next);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              Add store offer
            </Button>
          </DialogTrigger>
          <DialogContent className="tracker-dialog rounded-xl">
            <DialogTitle>Compare the same product</DialogTitle>
            <DialogDescription>
              Add a store link or choose an existing tracker. Loading a new link
              adds it to your watchlist; linking requires your variant
              confirmation.
            </DialogDescription>
            <div className="flex gap-2">
              <Input
                aria-label="Other store product URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://store.com/product"
              />
              <Button size="sm" disabled={busy || !url} onClick={load}>
                {busy ? "Loading…" : "Load"}
              </Button>
            </div>
            {products.some(
              (p) => p.id !== product.id && p.currency === product.currency,
            ) && (
              <Select
                value={candidate?.id || ""}
                onValueChange={(id) => {
                  const p = products.find((p) => p.id === id)!;
                  setCandidate({
                    ...p,
                    current_price: Number.isFinite(p.current_price)
                      ? p.current_price
                      : null,
                  });
                  setConfirmed(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an existing tracker" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter(
                      (p) =>
                        p.id !== product.id && p.currency === product.currency,
                    )
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            {candidate && (
              <>
                <p className="rounded-md bg-neutral-50 p-3 text-sm">
                  {candidate.name}
                  <br />
                  {formatPrice(candidate.currency, candidate.current_price)}
                </p>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1"
                  />
                  I checked: this is the exact same model and variant as{" "}
                  {product.name}.
                </label>
                <label className="text-sm">
                  Delivery cost ({product.currency})
                  <Input
                    className="mt-2"
                    type="number"
                    min="0"
                    max="1000000000"
                    step=".01"
                    value={delivery}
                    onChange={(e) => setDelivery(e.target.value)}
                    placeholder="Leave empty if unknown; 0 for free"
                  />
                </label>
                <Button
                  disabled={
                    busy ||
                    !confirmed ||
                    candidate.currency !== product.currency ||
                    candidate.id === product.id
                  }
                  onClick={link}
                >
                  Link confirmed offer
                </Button>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {offers.length ? (
        <div className="mt-5 space-y-3">
          {offers.map((o) => (
            <div
              key={o.product_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <a
                  href={o.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600"
                >
                  {deriveStore(o.url)} ↗
                </a>
                <p className="mt-1 text-xs text-neutral-500">
                  {o.stock_status.replaceAll("_", " ")} · Delivery{" "}
                  {o.shipping_cost == null
                    ? "unknown"
                    : `${formatPrice(o.currency, o.shipping_cost)} (${o.shipping_source})`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {formatPrice(o.currency, o.current_price)}
                </p>
                <p className="text-xs text-neutral-500">
                  Delivered {formatPrice(o.currency, offerTotal(o))}
                </p>
                {winner === o.product_id && (
                  <p className="text-xs text-emerald-700">
                    Lowest available delivered total
                  </p>
                )}
              </div>
              {offers.length > 1 && (
                <form
                  key={`${o.product_id}-${o.shipping_cost}`}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    void updateDelivery(
                      o.product_id,
                      String(form.get("delivery") || ""),
                    );
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    name="delivery"
                    aria-label={`Delivery cost for ${deriveStore(o.url)}`}
                    type="number"
                    min="0"
                    max="1000000000"
                    step=".01"
                    defaultValue={o.shipping_cost ?? ""}
                    placeholder="Delivery"
                    className="w-24"
                  />
                  <Button disabled={busy} variant="outline" size="sm">
                    Save fee
                  </Button>
                </form>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => unlink(o.product_id)}
              >
                Unlink
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-neutral-500">
          No confirmed store offers yet.
        </p>
      )}
      <p className="mt-4 text-xs leading-5 text-neutral-500">
        A delivered-price winner needs at least two confirmed in-stock offers
        with known delivery costs. Check availability and fees at checkout.
      </p>
    </section>
  );
}
