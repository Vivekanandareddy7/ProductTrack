"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { savePurchase, deletePurchase } from "@/app/workspace-actions";
import { formatPrice } from "@/lib/format";
import { purchaseSavings } from "@/lib/workspace";
import type { ProductWithStats, Purchase } from "@/utils/types";
export function PurchaseEditor({
  product,
  demo = false,
  open: controlled,
  onOpenChange,
}: {
  product: ProductWithStats;
  demo?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false),
    [price, setPrice] = useState(
      product.purchase?.paid_price.toString() ||
        (Number.isFinite(product.current_price)
          ? product.current_price.toString()
          : ""),
    ),
    [quantity, setQuantity] = useState(
      product.purchase?.quantity.toString() || "1",
    ),
    [date, setDate] = useState(
      product.purchase?.purchased_at || new Date().toISOString().slice(0, 10),
    ),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  const open = controlled ?? ownOpen;
  function setOpen(next: boolean) {
    if (next) {
      setPrice(
        product.purchase?.paid_price.toString() ||
          (Number.isFinite(product.current_price)
            ? product.current_price.toString()
            : ""),
      );
      setQuantity(product.purchase?.quantity.toString() || "1");
      setDate(
        product.purchase?.purchased_at || new Date().toISOString().slice(0, 10),
      );
    }
    onOpenChange?.(next);
    if (controlled === undefined) setOwnOpen(next);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (demo) {
      toast.info("Sample purchase. Sign in to record your own.");
      return;
    }
    setBusy(true);
    try {
      const r = await savePurchase(
        product.id,
        Number(price),
        Number(quantity),
        date,
      );
      if ("error" in r) toast.error(r.error);
      else {
        toast.success("Purchase recorded; tracking paused");
        setOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Could not record purchase.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlled === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs shadow-none">
            <ShoppingBag size={14} />
            {product.purchase ? "Edit purchase" : "Mark as bought"}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="tracker-dialog rounded-xl">
        <DialogTitle>
          {product.purchase ? "Edit purchase" : "Record purchase"}
        </DialogTitle>
        <DialogDescription>
          {product.name}. Record the amount actually paid; this pauses tracking
          and alerts for the item.
        </DialogDescription>
        <form onSubmit={save} className="space-y-4">
          <label className="block text-sm">
            Paid per unit ({product.currency}, including fees)
            <Input
              type="number"
              min="0"
              max="1000000000"
              step=".01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="mt-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Quantity
              <Input
                type="number"
                min="1"
                max="1000"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="mt-2"
              />
            </label>
            <label className="text-sm">
              Purchase date
              <Input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-2"
              />
            </label>
          </div>
          <p className="text-xs leading-5 text-neutral-500">
            Savings compare your paid price with the price when you first added
            this item, multiplied by quantity. They can be negative if you paid
            more.
          </p>
          <Button
            disabled={busy}
            size="sm"
            className="bg-linear-to-b from-blue-500 to-blue-700 text-xs"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}Save
            purchase
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function PurchaseLog({
  purchases,
  products,
  demo = false,
}: {
  purchases: Purchase[];
  products: ProductWithStats[];
  demo?: boolean;
}) {
  const [removing, setRemoving] = useState<string | null>(null),
    [confirm, setConfirm] = useState<string | null>(null);
  const router = useRouter();
  async function remove(id: string) {
    if (demo) {
      toast.info("Sample purchase history; nothing changed.");
      return;
    }
    setRemoving(id);
    try {
      const r = await deletePurchase(id);
      if ("error" in r) toast.error(r.error);
      else {
        setConfirm(null);
        router.refresh();
        toast.success(
          "Purchase record removed; previous tracking state restored",
        );
      }
    } finally {
      setRemoving(null);
    }
  }
  const currencies = [...new Set(purchases.map((p) => p.currency))];
  return (
    <section aria-label="Purchase log">
      <div className="mb-5 flex flex-wrap gap-6">
        {currencies.map((c) => {
          const records = purchases.filter((p) => p.currency === c);
          const spent = records.reduce(
            (sum, p) => sum + p.paid_price * p.quantity,
            0,
          );
          const known = records.filter((p) => purchaseSavings(p) != null);
          return (
            <div key={c} className="text-sm">
              <p className="text-neutral-500">Total paid ({c})</p>
              <p className="mt-1 text-xl font-semibold">
                {formatPrice(c, spent)}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Against price when added:{" "}
                {known.length
                  ? formatPrice(
                      c,
                      known.reduce((sum, p) => sum + purchaseSavings(p)!, 0),
                    )
                  : "Not available"}
              </p>
            </div>
          );
        })}
      </div>
      {purchases.length ? (
        <div className="divide-y rounded-lg border">
          {purchases.map((p) => {
            const product = products.find((w) => w.id === p.product_id);
            const savings = purchaseSavings(p);
            return (
              <article
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.product_name}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {p.purchased_at} · {p.quantity} ×{" "}
                    {formatPrice(p.currency, p.paid_price)} · Total{" "}
                    {formatPrice(p.currency, p.paid_price * p.quantity)}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {savings == null
                      ? "No baseline available"
                      : `${savings >= 0 ? "Saved" : "Paid above baseline"} ${formatPrice(p.currency, Math.abs(savings))} against price when added`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {product && (
                    <>
                      <PurchaseEditor product={product} demo={demo} />
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          href={
                            demo ? `/demo/p/${product.id}` : `/p/${product.id}`
                          }
                        >
                          Details
                        </Link>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-600"
                    disabled={removing === p.id}
                    onClick={() =>
                      confirm === p.id ? remove(p.id) : setConfirm(p.id)
                    }
                  >
                    {confirm === p.id ? "Confirm removal" : "Remove record"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-neutral-500">
          No purchases yet. Use “Mark as bought” on a product to record one.
        </div>
      )}
    </section>
  );
}
