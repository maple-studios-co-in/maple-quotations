"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import type { QuoteRoom } from "@maple/core/lib/types";
import { newItem, newRoom, money, toNumber } from "@maple/core/lib/utils";
import { Button } from "@maple/core/ui/button";
import { Input } from "@maple/core/ui/input";
import { Badge } from "@maple/core/ui/badge";
import { Card } from "@maple/core/ui/card";

// AI catalog import: upload a catalog PDF, review what the model read
// (especially handwritten rates), fix anything, then add the rooms to the quote.
// The review step is the trust boundary — nothing reaches the quote unreviewed.

type ParsedItem = {
  name: string;
  quantity: number;
  dimensions: string;
  rate: number | null;
  ratePerPiece: boolean;
  notes: string[];
  pending: boolean;
  confidence: "high" | "low";
  imageUrl?: string;
};
type ParsedRoom = { name: string; items: ParsedItem[] };

type Phase = "idle" | "parsing" | "review";

/** Per-piece price for the builder: "18K per pc" x8 stays 18000; a whole-lot
 *  "55K" for qty 2 becomes 27500 per piece so qty x price reproduces the total. */
function perPieceRate(item: ParsedItem): number {
  if (item.rate == null) return 0;
  if (item.ratePerPiece || item.quantity <= 1) return item.rate;
  return Math.round(item.rate / item.quantity);
}

export function CatalogImport({ onImport }: { onImport: (rooms: QuoteRoom[]) => void }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rooms, setRooms] = useState<ParsedRoom[]>([]);
  const [meta, setMeta] = useState<{ model: string; input: number; output: number } | null>(null);
  const [error, setError] = useState("");
  const [ratesFile, setRatesFile] = useState<File | null>(null);
  const [cleanFile, setCleanFile] = useState<File | null>(null);

  async function onParse() {
    if (!ratesFile) return;
    setPhase("parsing");
    setError("");
    const body = new FormData();
    body.append("file", ratesFile);
    if (cleanFile) body.append("imagesFile", cleanFile);
    try {
      const res = await fetch("/api/ai/parse-catalog", { method: "POST", body });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Parsing failed");
      const parsed: ParsedRoom[] = (j.catalog?.rooms || []).map((r: ParsedRoom) => ({
        ...r,
        items: r.items.map((it) => ({ ...it, rate: it.rate, quantity: it.quantity || 1 })),
      }));
      if (!parsed.length) throw new Error("No rooms found in this PDF.");
      setRooms(parsed);
      setMeta({ model: j.model, input: j.usage?.input ?? 0, output: j.usage?.output ?? 0 });
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Parsing failed");
      setPhase("idle");
    }
  }

  function updateItem(ri: number, ii: number, patch: Partial<ParsedItem>) {
    setRooms((prev) => prev.map((r, i) => (i !== ri ? r : { ...r, items: r.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) })));
  }
  function removeItem(ri: number, ii: number) {
    setRooms((prev) => prev.map((r, i) => (i !== ri ? r : { ...r, items: r.items.filter((_, j) => j !== ii) })));
  }

  function confirmImport() {
    const quoteRooms: QuoteRoom[] = rooms
      .filter((r) => r.items.length)
      .map((r) => ({
        ...newRoom(r.name),
        items: r.items.map((it) =>
          newItem({
            category: it.name,
            description: it.notes.join("; "),
            specification: it.dimensions,
            imageUrl: it.imageUrl || "",
            price: perPieceRate(it),
            quantity: it.quantity,
            unitType: "nos",
            unitValue: 1,
          })
        ),
      }));
    onImport(quoteRooms);
    const itemCount = quoteRooms.reduce((s, r) => s + r.items.length, 0);
    toast.success(`Imported ${itemCount} items across ${quoteRooms.length} rooms`);

    // Fire-and-forget: grow the product library from the reviewed items.
    // The quote import above already happened — never block or undo it.
    const libraryItems = rooms.flatMap((r) =>
      r.items.map((it) => ({
        name: it.name,
        specification: it.dimensions,
        material: undefined,
        rate: perPieceRate(it) || undefined,
        imageDataUrl: it.imageUrl,
      }))
    );
    fetch("/api/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: libraryItems }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const j = await res.json();
        toast.success(`Saved to product library (${j.created} new, ${j.updated} updated)`);
      })
      .catch(() => toast.error("Could not save items to the product library"));

    setOpen(false);
    setPhase("idle");
    setRooms([]);
  }

  const flagged = rooms.reduce((s, r) => s + r.items.filter((it) => it.pending || it.confidence === "low" || it.rate == null).length, 0);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Import catalog (AI)</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => phase !== "parsing" && setOpen(false)}>
          <Card className="flex max-h-[85vh] w-full max-w-3xl flex-col p-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-base font-semibold text-foreground">Import from catalog PDF</h3>
                <p className="text-xs text-muted-foreground">
                  {phase === "review"
                    ? "Review what was read before it touches the quote. Handwritten rates deserve a second look."
                    : "Upload a project catalog. The AI reads each page: items, dimensions, and handwritten rates."}
                </p>
              </div>
              <Button variant="ghost" size="icon" disabled={phase === "parsing"} onClick={() => setOpen(false)}>✕</Button>
            </div>

            {phase === "idle" && (
              <div className="space-y-4 p-6">
                {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
                <label className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border p-5 text-center hover:bg-accent/40">
                  <span className="text-sm font-medium text-foreground">
                    {ratesFile ? `Rates catalog: ${ratesFile.name}` : "1. Rates catalog PDF (required)"}
                  </span>
                  <span className="text-xs text-muted-foreground">The one with rates on it — scanned pages with handwriting work. Up to 30MB.</span>
                  <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { setRatesFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                </label>
                <label className="flex min-h-[90px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-border/70 p-5 text-center hover:bg-accent/40">
                  <span className="text-sm font-medium text-foreground">
                    {cleanFile ? `Clean catalog: ${cleanFile.name}` : "2. Clean client PDF for photos (optional)"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    The original catalog without handwriting. Item photos are cropped from this when provided, otherwise from the rates PDF.
                  </span>
                  <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { setCleanFile(e.target.files?.[0] ?? null); e.target.value = ""; }} />
                </label>
                <div className="flex items-center justify-between gap-3">
                  {cleanFile ? (
                    <button onClick={() => setCleanFile(null)} className="text-xs font-medium text-muted-foreground hover:text-destructive">Remove clean PDF</button>
                  ) : <span />}
                  <Button size="sm" disabled={!ratesFile} onClick={onParse}>Parse catalog</Button>
                </div>
              </div>
            )}

            {phase === "parsing" && (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-8 text-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-foreground">Reading the catalog…</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Large catalogs can take a few minutes. Keep this tab open.
                </p>
              </div>
            )}

            {phase === "review" && (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="neutral">{rooms.length} rooms</Badge>
                    <Badge variant="neutral">{rooms.reduce((s, r) => s + r.items.length, 0)} items</Badge>
                    {flagged > 0 && <Badge variant="warning">{flagged} need a look</Badge>}
                    {meta && <span className="ml-auto">{meta.model} · {meta.input.toLocaleString()} in / {meta.output.toLocaleString()} out tokens</span>}
                  </div>
                  <div className="space-y-5">
                    {rooms.map((room, ri) => (
                      <div key={ri}>
                        <div className="mb-2 rounded bg-muted px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground">{room.name}</div>
                        <div className="divide-y divide-border/70 rounded-md border border-border">
                          {room.items.map((it, ii) => {
                            const needsLook = it.pending || it.confidence === "low" || it.rate == null;
                            return (
                              <div key={ii} className={`flex flex-wrap items-center gap-3 px-3 py-2.5 ${needsLook ? "bg-amber-50" : ""}`}>
                                {it.imageUrl ? (
                                  <img src={it.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded border border-border object-cover" />
                                ) : (
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground/40">▦</div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-medium text-foreground">{it.name}</div>
                                  <div className="truncate text-[11px] text-muted-foreground">
                                    {it.dimensions}
                                    {it.notes.length > 0 && ` · ${it.notes.join("; ")}`}
                                  </div>
                                </div>
                                {it.pending && <Badge variant="warning">pending</Badge>}
                                {it.confidence === "low" && !it.pending && <Badge variant="warning">check rate</Badge>}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase text-muted-foreground">₹/pc</span>
                                  <Input
                                    className="h-8 w-24 text-xs tabular-nums"
                                    type="number"
                                    value={perPieceRate(it) || ""}
                                    placeholder="0"
                                    onChange={(e) => updateItem(ri, ii, { rate: toNumber(e.target.value), ratePerPiece: true, pending: false })}
                                  />
                                  <span className="text-[10px] uppercase text-muted-foreground">Qty</span>
                                  <Input
                                    className="h-8 w-14 text-xs tabular-nums"
                                    type="number"
                                    value={it.quantity}
                                    onChange={(e) => updateItem(ri, ii, { quantity: Math.max(1, toNumber(e.target.value)) })}
                                  />
                                  <span className="w-20 text-right text-xs font-semibold tabular-nums">{money(perPieceRate(it) * it.quantity)}</span>
                                  <button onClick={() => removeItem(ri, ii)} className="ml-1 text-muted-foreground/50 hover:text-destructive">✕</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border p-4">
                  <p className="text-xs text-muted-foreground">Items with a highlighted row have no confirmed rate yet. Edit or remove them before importing.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setPhase("idle"); setRooms([]); }}>Start over</Button>
                    <Button size="sm" onClick={confirmImport}>Add to quote</Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
