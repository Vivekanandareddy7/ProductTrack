"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Home,
  LogIn,
  Package,
  Plus,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/superbase/client";
import { addProdcut } from "@/app/actions";
import { toast } from "sonner";
import {
  Command,
  CommandDialog,
  CommandDialogPopup,
  CommandDialogTrigger,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

type Product = {
  id: string;
  name: string;
  current_price: number;
  currency: string;
  url: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const router = useRouter();

  // ⌘K / Ctrl+K toggles the palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Fetch user + recent products each time the palette opens
  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user ? { id: user.id } : null);
      if (!user) {
        setProducts([]);
        return;
      }
      const { data } = await supabase
        .from("products")
        .select("id, name, current_price, currency, url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setProducts((data ?? []) as Product[]);
    })();
  }, [open]);

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) setQuery("");
    setOpen(next);
  }, []);

  const run = useCallback((fn: () => void | Promise<void>) => {
    setOpen(false);
    setQuery("");
    Promise.resolve(fn()).catch((err) => console.error(err));
  }, []);

  const isUrl = (s: string) => /^https?:\/\/\S+/i.test(s.trim());

  const filteredProducts = query
    ? products.filter((p) =>
        (p.name ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : products.slice(0, 8);

  const showTrackUrl = query.trim().length > 0 && isUrl(query);

  const q = query.trim().toLowerCase();
  const navItems = [
    { value: "home", label: "Home", href: "/" },
    { value: "tracker", label: "My tracked products", href: "/tracker" },
    ...(!user ? [{ value: "auth", label: "Sign in", href: "/auth" }] : []),
  ];
  const filteredNav = q
    ? navItems.filter((n) => n.label.toLowerCase().includes(q))
    : navItems;
  const hasNoResults =
    q.length > 0 && !showTrackUrl && filteredNav.length === 0 && filteredProducts.length === 0;

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandDialogTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            aria-label="Open command palette"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/70 px-2.5 py-1.5 text-xs text-neutral-500 backdrop-blur transition-colors hover:bg-white hover:text-neutral-700"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="ml-1 hidden rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 sm:inline">
              ⌘K
            </kbd>
          </button>
        )}
      />

      <CommandDialogPopup>
        <Command>
          <CommandInput
            placeholder="Search products, jump to a page, or paste a link…"
            onChange={(e) => setQuery(e.target.value)}
          />

        <CommandList>
          {showTrackUrl ? (
            <CommandGroup>
              <CommandItem
                value={`track-url:${query.trim()}`}
                onClick={() =>
                  run(async () => {
                    const url = query.trim();
                    if (!user) {
                      router.push(`/tracker?url=${encodeURIComponent(url)}`);
                      return;
                    }
                    const fd = new FormData();
                    fd.append("url", url);
                    const res = (await addProdcut(fd)) as
                      | { error?: string; message?: string }
                      | undefined;
                    if (res?.error) toast.error(res.error);
                    else {
                      toast.success(res?.message || "Tracking started");
                      router.refresh();
                    }
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4 shrink-0 text-neutral-500" />
                <span>Track this URL</span>
                <span className="ml-auto truncate text-xs text-neutral-400 max-w-[180px]">
                  {query.trim()}
                </span>
              </CommandItem>
            </CommandGroup>
          ) : hasNoResults ? (
            <p className="px-2 py-6 text-center text-sm text-neutral-400">
              No results
            </p>
          ) : null}

          {filteredNav.length > 0 && (
            <CommandGroup>
              <CommandGroupLabel>Navigation</CommandGroupLabel>
              {filteredNav.map((n) => (
                <CommandItem
                  key={n.value}
                  value={n.value}
                  onClick={() => run(() => router.push(n.href))}
                >
                  {n.value === "home" ? (
                    <Home className="mr-2 h-4 w-4 shrink-0 text-neutral-500" />
                  ) : n.value === "tracker" ? (
                    <BarChart3 className="mr-2 h-4 w-4 shrink-0 text-neutral-500" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4 shrink-0 text-neutral-500" />
                  )}
                  <span>{n.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {filteredProducts.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandGroupLabel>Your products</CommandGroupLabel>
                {filteredProducts.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.name} ${p.id}`}
                    onClick={() => run(() => router.push(`/p/${p.id}`))}
                  >
                    <Package className="mr-2 h-4 w-4 shrink-0 text-neutral-500" />
                    <span className="truncate">{p.name}</span>
                    <span className="ml-auto text-xs text-neutral-400 tabular-nums">
                      {p.currency === "INR" ? "₹" : ""}
                      {p.current_price}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>

        <CommandFooter>
          <span>Navigate</span>
          <CommandShortcut>↑↓</CommandShortcut>
          <span>Open</span>
          <CommandShortcut>↵</CommandShortcut>
          <span>Close</span>
          <CommandShortcut>Esc</CommandShortcut>
        </CommandFooter>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
