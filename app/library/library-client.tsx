"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { money, toNumber } from "@maple/core/lib/utils";
import type { UnitType } from "@maple/core/lib/types";
import { Button } from "@maple/core/ui/button";
import { Input, Select, Textarea } from "@maple/core/ui/input";
import { Label } from "@maple/core/ui/label";
import { Badge } from "@maple/core/ui/badge";
import { Card } from "@maple/core/ui/card";
import { cn } from "@maple/core/lib/cn";

// Management page for the product library and the image gallery. The pickers in
// the builder (+ Library, GALLERY) read from the same APIs; this is where you
// curate what they offer.

type Product = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  specification: string | null;
  material: string | null;
  unitType: UnitType;
  defaultRate: number | null;
  imageUrl: string | null;
  updatedAt: string;
};

type GalleryAsset = { id: string; name: string; url: string; createdAt: string };

type Draft = {
  id?: string;
  name: string;
  category: string;
  specification: string;
  material: string;
  unitType: UnitType;
  defaultRate: string;
  imageDataUrl?: string; // newly chosen image
  imageUrl?: string | null; // existing image
};

const EMPTY: Draft = { name: "", category: "", specification: "", material: "", unitType: "nos", defaultRate: "" };

export function LibraryClient() {
  const [tab, setTab] = useState<"products" | "gallery">("products");
  return (
    <div className="mt-5">
      <div className="flex gap-1 border-b border-border">
        {(["products", "gallery"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("border-b-2 px-3 py-2 text-sm font-medium capitalize transition-colors",
              tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>
      {tab === "products" ? <ProductsTab /> : <GalleryTab />}
    </div>
  );
}

function ProductsTab() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);

  function load(q = query) {
    setLoading(true);
    fetch(`/api/products?q=${encodeURIComponent(q.trim())}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Product[]) => setProducts(Array.isArray(list) ? list : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function remove(p: Product) {
    if (!confirm(`Delete ${p.code} · ${p.name} from the library? Quotes already using it are unaffected.`)) return;
    const r = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Product deleted"); load(); } else toast.error("Could not delete");
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Search by code, name, category or specification…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button size="sm" onClick={() => setDraft({ ...EMPTY })}>+ New product</Button>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />
      ) : products.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nothing here yet. Products arrive automatically from AI catalog imports, or add one manually.
        </div>
      ) : (
        <Card className="divide-y divide-border/70 p-0">
          {products.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded border border-border object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground/40">▦</div>
              )}
              <Badge variant="neutral">{p.code}</Badge>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{p.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {[p.category, p.specification, p.material].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold tabular-nums">{p.defaultRate != null ? money(p.defaultRate) : "—"}</div>
                <div className="text-[10px] uppercase text-muted-foreground">per {p.unitType}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDraft({
                  id: p.id, name: p.name, category: p.category ?? "", specification: p.specification ?? "",
                  material: p.material ?? "", unitType: p.unitType, defaultRate: p.defaultRate != null ? String(p.defaultRate) : "",
                  imageUrl: p.imageUrl,
                })}>Edit</Button>
                <button onClick={() => remove(p)} className="text-muted-foreground/60 hover:text-destructive">✕</button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {draft && <ProductModal draft={draft} onClose={() => setDraft(null)} onSaved={() => { setDraft(null); load(); }} />}
    </div>
  );
}

function ProductModal({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setD((prev) => ({ ...prev, imageDataUrl: ev.target?.result as string }));
    reader.readAsDataURL(f);
  }

  async function save() {
    if (!d.name.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    const body: Record<string, unknown> = {
      name: d.name.trim(),
      category: d.category.trim() || null,
      specification: d.specification.trim() || null,
      material: d.material.trim() || null,
      unitType: d.unitType,
      defaultRate: d.defaultRate.trim() ? toNumber(d.defaultRate) : null,
    };
    if (d.imageDataUrl) body.imageDataUrl = d.imageDataUrl;
    const r = d.id
      ? await fetch(`/api/products/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (r.ok) { toast.success(d.id ? "Product updated" : "Product created"); onSaved(); }
    else { const j = await r.json().catch(() => ({})); toast.error(j.error || "Could not save"); }
  }

  const preview = d.imageDataUrl || d.imageUrl;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="w-full max-w-lg p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h3 className="text-base font-semibold text-foreground">{d.id ? "Edit product" : "New product"}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>✕</Button>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-4">
            {preview ? (
              <img src={preview} alt="" className="h-16 w-16 rounded border border-border object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-border text-muted-foreground/40">▦</div>
            )}
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={pickImage} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              {preview ? "Replace image" : "Add image"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Name</Label><Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="e.g. DINING CHAIR" /></div>
            <div><Label>Category</Label><Input value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} /></div>
            <div><Label>Material</Label><Input value={d.material} onChange={(e) => setD({ ...d, material: e.target.value })} /></div>
            <div className="col-span-2"><Label>Specification</Label><Textarea rows={2} value={d.specification} onChange={(e) => setD({ ...d, specification: e.target.value })} placeholder="e.g. L 450 x W 450, Seat Ht 450 mm" /></div>
            <div><Label>Default rate (₹)</Label><Input type="number" value={d.defaultRate} onChange={(e) => setD({ ...d, defaultRate: e.target.value })} /></div>
            <div><Label>Unit</Label><Select value={d.unitType} onChange={(e) => setD({ ...d, unitType: e.target.value as UnitType })}>
              <option value="nos">NOS</option><option value="set">SET</option><option value="sqft">SQFT</option><option value="rft">RFT</option>
            </Select></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save product"}</Button>
        </div>
      </Card>
    </div>
  );
}

function GalleryTab() {
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function load(q = query) {
    setLoading(true);
    fetch(`/api/assets?kind=product&q=${encodeURIComponent(q.trim())}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: GalleryAsset[]) => setAssets(Array.isArray(list) ? list : []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("kind", "product");
        fd.append("name", f.name.replace(/\.[^.]+$/, ""));
        const r = await fetch("/api/assets", { method: "POST", body: fd });
        if (!r.ok) { const j = await r.json().catch(() => ({})); toast.error(j.error || `Upload failed: ${f.name}`); }
      }
      toast.success(files.length > 1 ? `Uploaded ${files.length} images` : "Image uploaded");
      load();
    } finally {
      setUploading(false);
    }
  }

  async function remove(a: GalleryAsset) {
    if (!confirm(`Delete "${a.name}" from the gallery? Products linked to it lose their image.`)) return;
    const r = await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Image deleted"); load(); } else toast.error("Could not delete");
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <Input placeholder="Search images by name…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={upload} />
        <Button size="sm" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? "Uploading…" : "Upload images"}</Button>
      </div>
      {loading ? (
        <div className="h-32 animate-pulse rounded-lg border border-border bg-card" />
      ) : assets.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No images yet. AI catalog imports add product photos here automatically.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {assets.map((a) => (
            <div key={a.id} className="group relative overflow-hidden rounded-md border border-border bg-card">
              <img src={a.url} alt={a.name} className="aspect-square w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {a.name}
              </div>
              <button onClick={() => remove(a)}
                className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
