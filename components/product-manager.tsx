"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct } from "@/app/actions";
import { assignProductCollection } from "@/app/workspace-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PurchaseEditor } from "@/components/purchase-controls";
import type { Collection, ProductWithStats } from "@/utils/types";
export default function ProductManager({
  product,
  collections = [],
  demo = false,
}: {
  product: ProductWithStats;
  collections?: Collection[];
  demo?: boolean;
}) {
  const [mode, setMode] = useState<string | null>(null),
    [collection, setCollection] = useState(product.collection_id || "none"),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  async function save() {
    if (demo) {
      toast.info("Sample data. Open your watchlist to save changes.");
      return;
    }
    setBusy(true);
    try {
      const r =
        mode === "remove"
          ? await deleteProduct(product.id)
          : await assignProductCollection(
              product.id,
              collection === "none" ? null : collection,
            );
      if ("error" in r && r.error) toast.error(r.error);
      else {
        setMode(null);
        router.refresh();
        toast.success(
          mode === "remove"
            ? "Tracker removed; purchase records preserved"
            : "Collection updated",
        );
      }
    } catch {
      toast.error("Could not save changes.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Options for ${product.name}`}
          >
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              setCollection(product.collection_id || "none");
              setMode("collection");
            }}
          >
            Move to collection
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setMode("purchase")}>
            {product.purchase ? "Edit purchase" : "Mark as bought"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setMode("remove")}
            className="text-red-600"
          >
            Remove tracker
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PurchaseEditor
        product={product}
        demo={demo}
        open={mode === "purchase"}
        onOpenChange={(open) => setMode(open ? "purchase" : null)}
      />
      <Dialog
        open={mode === "collection" || mode === "remove"}
        onOpenChange={(open) => {
          if (!open) setMode(null);
        }}
      >
        <DialogContent className="tracker-dialog rounded-xl">
          <DialogTitle>
            {mode === "remove" ? "Remove this tracker?" : "Move to collection"}
          </DialogTitle>
          <DialogDescription>
            {mode === "remove"
              ? "Tracking and private alert history will be removed. Your purchase record is preserved."
              : "Choose a collection in the same currency as this product."}
          </DialogDescription>
          {mode === "collection" && (
            <Select value={collection} onValueChange={setCollection}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No collection</SelectItem>
                {collections
                  .filter((c) => c.currency === product.currency)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              variant={mode === "remove" ? "destructive" : "default"}
              onClick={save}
            >
              {busy ? "Saving…" : mode === "remove" ? "Remove tracker" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
