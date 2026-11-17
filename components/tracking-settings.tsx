"use client";
import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateTrackingSettings } from "@/app/actions";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { ProductWithStats } from "@/utils/types";

export default function TrackingSettings({
  product,
  demo = false,
  tracker = false,
}: {
  product: ProductWithStats;
  demo?: boolean;
  tracker?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(product.target_price?.toString() || "");
  const [drop, setDrop] = useState(product.drop_percent?.toString() || "");
  const [enabled, setEnabled] = useState(Boolean(product.alert_enabled));
  const [restock, setRestock] = useState(Boolean(product.restock_enabled));
  const [paused, setPaused] = useState(Boolean(product.paused));
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const Field = tracker ? Input : "input";
  const Submit = tracker ? Button : "button";
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (demo) {
      toast.info("This is a preview. Sign in to save your own alerts.");
      return;
    }
    setSaving(true);
    try {
      const result = await updateTrackingSettings(product.id, {
        target_price: target === "" ? null : Number(target),
        drop_percent: drop === "" ? null : Number(drop),
        alert_enabled: enabled,
        paused,
        restock_enabled: restock,
      });
      if (result.error) toast.error(result.error);
      else {
        toast.success("Tracking preferences saved");
        setOpen(false);
        router.refresh();
      }
    } catch {
      toast.error("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setTarget(product.target_price?.toString() || "");
          setDrop(product.drop_percent?.toString() || "");
          setEnabled(Boolean(product.alert_enabled));
          setPaused(Boolean(product.paused));
          setRestock(Boolean(product.restock_enabled));
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={tracker ? "sm" : "xs"}
          className={
            tracker
              ? "tracker-press text-xs text-neutral-600"
              : "text-indigo-700"
          }
        >
          <Bell size={14} />
          {product.alert_enabled ? "Edit alert" : "Set alert"}
        </Button>
      </DialogTrigger>
      <DialogContent
        className={
          tracker ? "tracker-dialog rounded-xl p-6" : "rounded-2xl p-7"
        }
      >
        {!tracker && (
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Bell size={21} />
          </div>
        )}
        <DialogTitle>
          {tracker ? "Tracking alerts" : "Buy at your price."}
        </DialogTitle>
        <DialogDescription>
          Choose an alert for {product.name}. Current price:{" "}
          {formatPrice(product.currency, product.current_price)}.
        </DialogDescription>
        <form onSubmit={save} className="space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Target price ({product.currency})
            <Field
              autoFocus
              type="number"
              min="0.01"
              max="1000000000"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={
                Number.isFinite(product.current_price)
                  ? `e.g. ${Math.round(product.current_price * 0.9)}`
                  : "Your target"
              }
              className={
                tracker
                  ? "mt-2 h-10 rounded-md"
                  : "mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              }
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Or a drop from the price when added (%)
            <Field
              type="number"
              min="0.1"
              max="99.9"
              step="0.1"
              value={drop}
              onChange={(e) => setDrop(e.target.value)}
              placeholder="e.g. 10"
              className={
                tracker
                  ? "mt-2 h-10 rounded-md"
                  : "mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500"
              }
            />
          </label>
          <p className="text-xs leading-relaxed text-slate-500">
            If you set both, either rule can trigger. We send one email when a
            rule is first met, then rearm after the price leaves the range.
            Changes apply at the next successful check.
          </p>
          <label className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
            <span>Email me when a rule is met</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="size-4 accent-indigo-600"
            />
          </label>
          <label className="flex items-center justify-between text-sm text-slate-600">
            <span>Email me when back in stock</span>
            <input
              type="checkbox"
              checked={restock}
              onChange={(e) => setRestock(e.target.checked)}
              className="size-4 accent-blue-600"
            />
          </label>
          <p className="text-xs text-slate-500">
            Triggers after a recorded out-of-stock → in-stock change. Unknown
            availability does not trigger an alert.
          </p>
          <label className="flex items-center justify-between text-sm text-slate-600">
            <span>Pause my tracking and alerts</span>
            <input
              type="checkbox"
              checked={paused}
              onChange={(e) => setPaused(e.target.checked)}
              className="size-4 accent-indigo-600"
            />
          </label>
          {paused && (
            <p className="text-xs text-slate-500">
              Your alerts pause. Shared prices may still update when another
              user tracks the same product.
            </p>
          )}
          <Submit
            disabled={saving}
            className={
              tracker
                ? "tracker-press h-10 w-full bg-neutral-900 text-white hover:bg-neutral-800"
                : "flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            }
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {demo ? "Preview only · sign in to save" : "Save preferences"}
          </Submit>
        </form>
      </DialogContent>
    </Dialog>
  );
}
