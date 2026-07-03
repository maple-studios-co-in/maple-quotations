"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import type { QuoteItem, UnitType } from "@maple/core/lib/types";
import { newItem, money } from "@maple/core/lib/utils";
import { Button } from "@maple/core/ui/button";
import { Input } from "@maple/core/ui/input";
import { Badge } from "@maple/core/ui/badge";
import { Card } from "@maple/core/ui/card";

// "Add from library": search saved products and drop them into a room as items.

type LibraryProduct = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  specification: string | null;
  material: string | null;
  unitType: string;
  defaultRate: number | null;
  imageUrl: string | null;
  updatedAt: string;
};

const UNIT_TYPES: UnitType[] = ["nos", "set", "sqft", "rft", "lft", "mtr"];

function asUnitType(u: string): UnitType {
  return (UNIT_TYPES as string[]).includes(u) ? (u as UnitType) : "nos";
}

/** Data URLs keep the existing PDF pipeline working (it embeds images inline). */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await fetch(url).then((r) => (r.ok ? r.blob() : null));
    if (!blob) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function ProductPicker({ onAdd }: { onAdd: (items: QuoteItem[]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<LibraryProduct[]>([]);
  // Keyed by id but storing the product itself, so selections made under one
  // search survive when the results change under a different search.
  const [selected, setSelected] = useState<Map<string, LibraryProduct>>(new Map());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/products?q=${encodeURIComponent(query.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list: LibraryProduct[]) => setProducts(Array.isArray(list) ? list : []))
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [open, query]);

  function toggle(product: LibraryProduct) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(product.id)) next.delete(product.id);
      else next.set(product.id, product);
      return next;
    });
  }

  function close() {
    setOpen(false);
    setQuery("");
    setSelected(new Map());
  }

  async function confirmAdd() {
    const picked = [...selected.values()];
    if (!picked.length) return;
    setAdding(true);
    const items: QuoteItem[] = [];
    for (const p of picked) {
      const item = newItem({
        category: p.name,
        specification: p.specification || "",
        material: p.material || "",
        price: p.defaultRate ?? 0,
        quantity: 1,
        unitType: asUnitType(p.unitType),
      });
      if (p.imageUrl) {
        const dataUrl = await toDataUrl(p.imageUrl);
        if (dataUrl) item.imageUrl = dataUrl;
      }
      items.push(item);
    }
    setAdding(false);
    onAdd(items);
    close();
    toast.success(`Added ${items.length} ${items.length === 1 ? "item" : "items"} from the library`);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>+ Library</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
          <Card className="flex max-h-[80vh] w-full max-w-2xl flex-col p-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">Add from product library</h3>
                <p className="text-xs text-muted-foreground">Saved products from manual entry and AI catalog imports.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={close}>✕</Button>
            </div>
            <div className="border-b border-border p-4">
              <Input
                autoFocus
                placeholder="Search by code, name, category or specification…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Searching…</div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {query.trim() ? "No products match this search." : "The library is empty. Import a catalog or add products to fill it."}
                </div>
              ) : (
                <div className="divide-y divide-border/70 rounded-md border border-border">
                  {products.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent/40">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p)}
                      />
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded border border-border object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground/40">▦</div>
                      )}
                      <Badge variant="neutral" className="shrink-0">{p.code}</Badge>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">{p.name}</div>
                        {p.specification && <div className="truncate text-[11px] text-muted-foreground">{p.specification}</div>}
                      </div>
                      <span className="shrink-0 text-right text-xs font-semibold tabular-nums">
                        {p.defaultRate != null ? money(p.defaultRate) : "—"}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border p-4">
              <span className="text-xs text-muted-foreground">{selected.size} selected</span>
              <Button size="sm" disabled={!selected.size || adding} onClick={confirmAdd}>
                {adding ? "Adding…" : "Add to room"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
