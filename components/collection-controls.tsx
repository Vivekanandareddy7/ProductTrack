"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Share2, Copy, Trash2, Loader2 } from "lucide-react";
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
  saveCollection,
  deleteCollection,
  shareCollection,
} from "@/app/workspace-actions";
import type { Collection } from "@/utils/types";
const primary = "bg-linear-to-b from-blue-500 to-blue-700 text-xs";
export function CollectionEditor({
  collection,
  demo = false,
  onSaved,
}: {
  collection?: Collection;
  demo?: boolean;
  onSaved?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(collection?.name || ""),
    [description, setDescription] = useState(collection?.description || ""),
    [budget, setBudget] = useState(collection?.budget?.toString() || ""),
    [currency, setCurrency] = useState(collection?.currency || "INR"),
    [busy, setBusy] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (demo) {
      toast.info("Sample collection. Sign in to create your own.");
      return;
    }
    setBusy(true);
    try {
      const r = await saveCollection({
        id: collection?.id,
        name,
        description,
        budget: budget === "" ? null : Number(budget),
        currency,
      });
      if ("error" in r) toast.error(r.error);
      else {
        toast.success("Collection saved");
        setOpen(false);
        onSaved?.(r.id);
        router.refresh();
      }
    } catch {
      toast.error("Could not save collection.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!collection) return;
    if (demo) {
      toast.info("Sample collection; nothing was deleted.");
      return;
    }
    setBusy(true);
    try {
      const r = await deleteCollection(collection.id);
      if ("error" in r) toast.error(r.error);
      else {
        setOpen(false);
        router.refresh();
        toast.success("Collection removed. Its products remain tracked.");
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setName(collection?.name || "");
          setDescription(collection?.description || "");
          setBudget(collection?.budget?.toString() || "");
          setCurrency(collection?.currency || "INR");
          setConfirmDelete(false);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-neutral-500">
          {collection ? <Pencil size={13} /> : <Plus size={13} />}{" "}
          {collection ? "Edit collection" : "New collection"}
        </Button>
      </DialogTrigger>
      <DialogContent className="tracker-dialog rounded-xl">
        <DialogTitle>
          {collection ? "Edit collection" : "Create collection"}
        </DialogTitle>
        <DialogDescription>
          Group products and set an optional budget. Collections start private.
        </DialogDescription>
        <form onSubmit={save} className="space-y-4">
          <label className="block text-sm">
            Name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              placeholder="Desk setup"
              className="mt-2"
            />
          </label>
          <label className="block text-sm">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="What are you planning?"
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
            />
          </label>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <label className="text-sm">
              Budget
              <Input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                type="number"
                min="0"
                max="1000000000"
                step=".01"
                placeholder="Optional"
                className="mt-2"
              />
            </label>
            <label className="text-sm">
              Currency
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["INR", "USD", "EUR", "GBP"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <p className="text-xs leading-5 text-neutral-500">
            Keep one currency per collection. Removing a collection preserves
            its tracked products and purchase records.
          </p>
          <div className="flex justify-between gap-3">
            {collection ? (
              <Button
                type="button"
                variant="ghost"
                className="text-xs text-red-600"
                disabled={busy}
                onClick={() =>
                  confirmDelete ? remove() : setConfirmDelete(true)
                }
              >
                <Trash2 size={13} />
                {confirmDelete ? "Confirm removal" : "Remove collection"}
              </Button>
            ) : (
              <span />
            )}
            <Button disabled={busy} size="sm" className={primary}>
              {busy && <Loader2 size={13} className="animate-spin" />}Save
              collection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function CollectionSharing({
  collection,
  demo = false,
}: {
  collection: Collection;
  demo?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState(collection.share_token);
  const router = useRouter();
  async function toggle() {
    if (demo) {
      toast.info("This is a sample public wishlist.");
      return;
    }
    setBusy(true);
    try {
      const r = await shareCollection(collection.id, !token);
      if ("error" in r) toast.error(r.error);
      else {
        setToken(r.token);
        router.refresh();
        toast.success(r.token ? "Public link enabled" : "Public link revoked");
      }
    } catch {
      toast.error("Could not update sharing.");
    } finally {
      setBusy(false);
    }
  }
  const path = token ? `/s/${token}` : null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setToken(collection.share_token);
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs shadow-none">
          <Share2 size={13} />
          {collection.is_public ? "Shared wishlist" : "Share wishlist"}
        </Button>
      </DialogTrigger>
      <DialogContent className="tracker-dialog rounded-xl">
        <DialogTitle>Share {collection.name}</DialogTitle>
        <DialogDescription>
          Anyone with the enabled link can view product names, store links,
          prices and availability. Budgets, purchases, alert rules and account
          details stay private.
        </DialogDescription>
        {path ? (
          <div className="space-y-3">
            <a
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all rounded-md border bg-neutral-50 p-3 text-sm text-blue-600"
            >
              {path}
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    new URL(path, window.location.origin).href,
                  );
                  toast.success("Link copied");
                } catch {
                  toast.error("Copy the displayed link manually.");
                }
              }}
            >
              <Copy size={13} />
              Copy link
            </Button>
          </div>
        ) : (
          <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-500">
            This collection is private.
          </p>
        )}
        <Button
          disabled={busy}
          variant={token ? "outline" : "default"}
          size="sm"
          className={
            token ? "" : "bg-linear-to-b from-blue-500 to-blue-700 text-xs"
          }
          onClick={toggle}
        >
          {busy && <Loader2 size={13} className="animate-spin" />}
          {token ? "Revoke public link" : "Enable public link"}
        </Button>
        {token && (
          <p className="text-xs text-neutral-500">
            Re-enabling sharing later generates a new link. Bought items are
            hidden from the public wishlist.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
