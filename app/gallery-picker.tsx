"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@maple/core/ui/button";
import { Input } from "@maple/core/ui/input";
import { Card } from "@maple/core/ui/card";

// Image gallery: pick a stored product image for a quote item, or upload new ones.

type GalleryAsset = {
  id: string;
  kind: string;
  name: string;
  mime: string;
  createdAt: string;
  url: string;
};

export function GalleryPicker({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (dataUrl: string) => void }) {
  const [query, setQuery] = useState("");
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/assets?kind=product&q=${encodeURIComponent(query.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list: GalleryAsset[]) => setAssets(Array.isArray(list) ? list : []))
        .catch(() => setAssets([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [open, query, refreshKey]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("kind", "product");
    body.append("name", file.name);
    try {
      const res = await fetch("/api/assets", { method: "POST", body });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error);
      setRefreshKey((k) => k + 1);
      toast.success("Image uploaded to the gallery");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(a: GalleryAsset) {
    if (!confirm(`Delete "${a.name}" from the gallery? Products using it lose their image.`)) return;
    const res = await fetch(`/api/assets/${a.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { toast.error("Could not delete this image"); return; }
    setRefreshKey((k) => k + 1);
  }

  async function pick(a: GalleryAsset) {
    setPicking(a.id);
    try {
      const blob = await fetch(a.url).then((r) => (r.ok ? r.blob() : null));
      if (!blob) throw new Error();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject());
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      onSelect(dataUrl);
      onClose();
    } catch {
      toast.error("Could not load this image");
    } finally {
      setPicking(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <Card className="flex max-h-[80vh] w-full max-w-2xl flex-col p-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-base font-semibold text-foreground">Image gallery</h3>
            <p className="text-xs text-muted-foreground">Product photos saved from catalog imports and uploads.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-accent">
              {uploading ? "Uploading…" : "Upload"}
              <input type="file" className="hidden" accept="image/*" disabled={uploading} onChange={onUpload} />
            </label>
            <Button variant="ghost" size="icon" onClick={onClose}>✕</Button>
          </div>
        </div>
        <div className="border-b border-border p-4">
          <Input autoFocus placeholder="Search images by name…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : assets.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {query.trim() ? "No images match this search." : "No images yet. Upload one or import a catalog."}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {assets.map((a) => (
                <div key={a.id} className="group relative aspect-square">
                  <button
                    type="button"
                    disabled={picking !== null}
                    onClick={() => pick(a)}
                    className="h-full w-full overflow-hidden rounded border border-border disabled:opacity-60"
                    title={a.name}
                  >
                    <img src={a.url} alt={a.name} className="h-full w-full object-cover" />
                  </button>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 truncate rounded-b bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {a.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(a)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
                    title="Delete from gallery"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
