"use client";

import React, { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import { toast as sonnerToast } from "sonner";

import { QuoteData, QuoteItem, QuoteRoom, Draft, UnitType, DiscountType, GstMode, TotalsResult } from "@maple/core/lib/types";
import { money, computeTotals, safeParse, newItem, newRoom, makeId, todayISODate, toNumber } from "@maple/core/lib/utils";
import { TEMPLATES } from "@maple/core/lib/constants";
import { MasterProposalPdf } from "./pdf-catalog";

import { Button } from "@maple/core/ui/button";
import { Input, Select, Textarea } from "@maple/core/ui/input";
import { Label } from "@maple/core/ui/label";
import { Badge } from "@maple/core/ui/badge";
import { Card } from "@maple/core/ui/card";
import { cn } from "@maple/core/lib/cn";

const LS_KEY_DRAFTS = "mapleQuotation.drafts.v1";
const LS_KEY_LAST = "mapleQuotation.last.v2";
const LS_KEY_TERMS = "mapleQuotation.terms.v1";

type TabId = "client" | "rooms" | "finance" | "payment" | "drafts" | "saved";
const TABS: { id: TabId; label: string }[] = [
  { id: "client", label: "Overview" },
  { id: "rooms", label: "Rooms & Items" },
  { id: "finance", label: "Finance & T&C" },
  { id: "payment", label: "Settlement" },
  { id: "drafts", label: "Drafts" },
  { id: "saved", label: "Saved" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 text-xs font-bold uppercase tracking-wide text-primary">{title}</div>
      {children}
    </Card>
  );
}

function LivePreviewPanel({ data, computed, terms }: { data: QuoteData; computed: TotalsResult; terms: string[] }) {
  if (!data.client.name) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 p-8 text-center">
        <div className="mb-3 h-7 w-6 rounded border border-border bg-card" />
        <p className="max-w-[220px] text-[11px] font-medium text-muted-foreground">Fill in client details to see the live preview</p>
      </div>
    );
  }
  return (
    <div style={{ background: "white", color: "#000", padding: 24, minHeight: "100%", fontSize: 11, lineHeight: 1.6, border: "2px solid #000" }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "4px solid #000", paddingBottom: 16, marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.02em" }}>MAPLE FURNISHERS</div>
        <div style={{ fontSize: 9, textAlign: "right", fontWeight: 600 }}>
          <div>B-3, W.H.S. Timber Market Kirti Nagar</div><div>Delhi-110015</div><div>9211819727</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, border: "2px solid #000", padding: 12 }}>
        <div>
          <div style={{ fontSize: 9, textTransform: "uppercase", marginBottom: 4, fontWeight: 800 }}>Prepared For</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{data.client.name || "—"}</div>
          <div style={{ fontWeight: 600 }}>{data.client.phone}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, textTransform: "uppercase", marginBottom: 4, fontWeight: 800 }}>Ref No.</div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{data.quote.number}</div>
          <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600 }}>{data.quote.date}</div>
        </div>
      </div>
      {data.rooms.map((room) => (
        <div key={room.id} style={{ marginBottom: 24 }}>
          <div style={{ background: "#000", color: "white", padding: "8px 12px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            {room.name || "Room"} — {room.items.length} items
          </div>
          {room.items.map((item) => {
            const total = (item.price || 0) * (item.unitValue || 1) * (item.quantity || 1);
            return (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "2px solid #000" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 12 }}>{item.category || "Item"}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>{item.description}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, marginTop: 4 }}>QTY: {item.quantity} × ₹{item.price?.toLocaleString()}</div>
                </div>
                <div style={{ fontWeight: 900, fontSize: 14 }}>₹{total.toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ marginTop: 24, borderTop: "4px solid #000", paddingTop: 16 }}>
        {computed.totals.lines.map((line) => (
          <div key={line.key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontWeight: line.emphasis ? 900 : 700, fontSize: line.emphasis ? 14 : 11, textTransform: "uppercase" }}>
            <span>{line.label}</span><span>₹{line.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
      {terms.length > 0 && (
        <div style={{ marginTop: 32, padding: 16, border: "2px solid #000" }}>
          <div style={{ fontWeight: 900, fontSize: 11, textTransform: "uppercase", marginBottom: 12, letterSpacing: "0.05em", borderBottom: "2px solid #000", paddingBottom: 8 }}>Terms &amp; Conditions</div>
          {terms.map((t, i) => <div key={i} style={{ fontSize: 10, marginBottom: 6, lineHeight: 1.5, fontWeight: 600 }}>{i + 1}. {t}</div>)}
        </div>
      )}
    </div>
  );
}

export default function QuotationBuilderPage() {
  const [activeTab, setActiveTab] = useState<TabId>("client");
  const [data, setData] = useState<QuoteData>({
    version: 2,
    client: { name: "", phone: "", address: "" },
    quote: { number: "MF/2026/DRAFT", date: todayISODate(), validityDays: 15, siteName: "", salesPerson: "Senior Consultant" },
    rooms: [newRoom("General Area")],
    charges: { packingPercent: 0, loadingCharge: 0, gstPercent: 18, gstMode: "excluded", splitCgstSgst: true, overallDiscountValue: 0, overallDiscountType: "flat" },
    payment: { upiId: "maple@bank", bankName: "Heritage Bank", accountName: "Maple Furnishers", accountNumber: "", ifsc: "" },
    updatedAt: Date.now(),
  });
  const [terms, setTerms] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [history, setHistory] = useState<QuoteData[]>([]);
  const [future, setFuture] = useState<QuoteData[]>([]);
  const [serverQuotes, setServerQuotes] = useState<{ id: string; number: string; total: number; status: string; createdAt: string; client: { name: string } | null }[]>([]);

  function toast(msg: string, type: string = "success") {
    if (type === "error") sonnerToast.error(msg);
    else sonnerToast.success(msg);
  }

  const updateData = (newData: QuoteData | ((prev: QuoteData) => QuoteData)) => {
    setHistory((h) => [...h.slice(-49), data]);
    setFuture([]);
    setData((prev) => (typeof newData === "function" ? (newData as (p: QuoteData) => QuoteData)(prev) : newData));
  };
  function undo() {
    if (!history.length) return;
    setFuture((f) => [data, ...f]);
    setData(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    toast("Undone");
  }
  function redo() {
    if (!future.length) return;
    setHistory((h) => [...h, data]);
    setData(future[0]);
    setFuture((f) => f.slice(1));
    toast("Redone");
  }

  const computed = useMemo(() => computeTotals(data), [data]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === "s") { e.preventDefault(); saveDraft(); }
      if (e.ctrlKey && e.key === "p") { e.preventDefault(); onGeneratePdf(); }
      if (e.ctrlKey && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.shiftKey && e.key === "z") { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, history, future]);

  useEffect(() => { localStorage.setItem(LS_KEY_LAST, JSON.stringify(data)); }, [data]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get("q");
    if (qParam) {
      try {
        const decoded = JSON.parse(atob(qParam));
        if (decoded.version === 2) { setData(decoded); toast("Shared quote loaded"); return; }
      } catch {}
    }
    const last = safeParse<QuoteData>(localStorage.getItem(LS_KEY_LAST));
    if (last && last.version === 2) setData(last);
    else setData((prev) => ({ ...prev, quote: { ...prev.quote, number: `MF/2026/Q-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}` } }));
    setDrafts(safeParse<Draft[]>(localStorage.getItem(LS_KEY_DRAFTS)) || []);
    setTerms(safeParse<string[]>(localStorage.getItem(LS_KEY_TERMS)) || [
      "50% Advance at the time of booking.",
      "40% After completion of woodwork structure.",
      "10% Before delivery of items.",
      "GST will be extra as applicable.",
      "Transportation and loading extra if not mentioned.",
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveDraft() {
    const name = prompt("Enter draft name:", data.client.name || "Untitled Quote");
    if (!name) return;
    const updated = [{ id: makeId(), name, savedAt: Date.now(), data }, ...drafts];
    setDrafts(updated);
    localStorage.setItem(LS_KEY_DRAFTS, JSON.stringify(updated));
    toast("Draft saved");
  }
  function deleteDraft(id: string) {
    if (!confirm("Delete this draft?")) return;
    const updated = drafts.filter((d) => d.id !== id);
    setDrafts(updated);
    localStorage.setItem(LS_KEY_DRAFTS, JSON.stringify(updated));
    toast("Draft deleted");
  }
  function updateRoom(i: number, patch: Partial<QuoteRoom>) {
    updateData((prev) => ({ ...prev, rooms: prev.rooms.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) }));
  }
  function deleteRoom(i: number) {
    if (data.rooms.length <= 1) return;
    if (!confirm("Delete this entire room?")) return;
    updateData((prev) => ({ ...prev, rooms: prev.rooms.filter((_, idx) => idx !== i) }));
  }
  function updateItem(ri: number, ii: number, patch: Partial<QuoteItem>) {
    updateData((prev) => ({ ...prev, rooms: prev.rooms.map((r, i) => (i !== ri ? r : { ...r, items: r.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) })) }));
  }
  function handleImageUpload(ri: number, ii: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => updateItem(ri, ii, { imageUrl: evt.target?.result as string });
    reader.readAsDataURL(file);
  }
  function deleteItem(ri: number, ii: number) {
    updateData((prev) => {
      const rooms = prev.rooms.map((r, i) => (i !== ri ? r : { ...r, items: r.items.filter((_, j) => j !== ii) }));
      return { ...prev, rooms };
    });
  }
  function addRoom() { updateData((prev) => ({ ...prev, rooms: [...prev.rooms, newRoom("")] })); }
  function addItem(ri: number, template?: Partial<QuoteItem>) {
    updateData((prev) => ({ ...prev, rooms: prev.rooms.map((r, i) => (i !== ri ? r : { ...r, items: [...r.items, newItem(template)] })) }));
  }

  async function onGeneratePdf() {
    toast("Generating PDF…");
    const logo = await fetch("/api/brand").then((r) => r.json()).then((b) => b.logoUrl as string | undefined).catch(() => undefined);
    const blob = await pdf(<MasterProposalPdf data={data} computed={computed} terms={terms} logo={logo} />).toBlob();
    window.open(URL.createObjectURL(blob), "_blank");
  }

  async function onImportExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const JSZip = (await import("jszip")).default;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, string | number>[];
        const zip = await JSZip.loadAsync(file);
        const mediaFolder = zip.folder("xl/media");
        const images: string[] = [];
        if (mediaFolder) {
          const mediaFiles = Object.keys(mediaFolder.files).sort((a, b) => (parseInt(a.match(/\d+/)?.[0] || "0") - parseInt(b.match(/\d+/)?.[0] || "0")));
          for (const path of mediaFiles) {
            const fileData = await mediaFolder.file(path.split("/").pop()!)?.async("base64");
            if (fileData) images.push(`data:image/${path.split(".").pop()?.toLowerCase() || "png"};base64,${fileData}`);
          }
        }
        const newRooms: QuoteRoom[] = [newRoom("Imported Inventory")];
        const meta: Record<string, string> = {};
        rows.forEach((row, idx) => {
          if (row["Client Name"] || row["client_name"]) meta.clientName = String(row["Client Name"] || row["client_name"]);
          if (row["Phone"] || row["phone"]) meta.phone = String(row["Phone"] || row["phone"]);
          if (row["Address"] || row["address"]) meta.address = String(row["Address"] || row["address"]);
          if (row["Site"] || row["site"] || row["Project"]) meta.siteName = String(row["Site"] || row["site"] || row["Project"]);
          if (row["Quote No"] || row["quote_no"]) meta.quoteNo = String(row["Quote No"] || row["quote_no"]);
          newRooms[0].items.push(newItem({
            category: String(row.Category || row.category || row.Item || "New Item"),
            description: String(row.Description || row.description || ""),
            price: toNumber(row.Price || row.price || row.Rate || 0),
            quantity: toNumber(row.Quantity || row.quantity || row.Qty || 1),
            unitType: (row.Unit || row.unit || "nos") as UnitType,
            material: String(row.Material || row.material || ""),
            imageUrl: images[idx] || "",
          }));
        });
        updateData((prev) => ({
          ...prev,
          client: { ...prev.client, name: meta.clientName || prev.client.name, phone: meta.phone || prev.client.phone, address: meta.address || prev.client.address },
          quote: { ...prev.quote, number: meta.quoteNo || prev.quote.number, siteName: meta.siteName || prev.quote.siteName },
          rooms: [...prev.rooms, ...newRooms],
        }));
        toast(`Imported ${rows.length} items`);
      } catch (err) { console.error(err); toast("Excel import failed", "error"); }
    };
    reader.readAsBinaryString(file);
  }

  async function loadServerQuotes() {
    try { const r = await fetch("/api/quotations"); if (r.ok) setServerQuotes(await r.json()); } catch {}
  }
  async function onSave() {
    if (!data.client.name) { toast("Add a client name first", "error"); return; }
    const res = await fetch("/api/quotations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: data.quote.number, total: computed.totals.grandTotal, status: "saved", data, client: { name: data.client.name, phone: data.client.phone, address: data.client.address } }) });
    if (res.ok) { toast("Saved to system ✓"); loadServerQuotes(); } else { const j = await res.json().catch(() => ({})); toast(j.error || "Save failed", "error"); }
  }
  async function deleteServerQuote(id: string) {
    if (!confirm("Delete this saved quotation?")) return;
    await fetch(`/api/quotations/${id}`, { method: "DELETE" }); loadServerQuotes();
  }
  useEffect(() => { if (activeTab === "saved") loadServerQuotes(); }, [activeTab]);

  function shareQuote() {
    const url = `${window.location.origin}${window.location.pathname}?q=${btoa(JSON.stringify(data))}`;
    navigator.clipboard.writeText(url);
    toast("Share link copied");
  }

  const applyTemplate = (type: 1 | 2 | 3) => {
    if (!confirm("Apply this template? Current data will be replaced.")) return;
    const td: QuoteData = { ...data, updatedAt: Date.now() };
    const mkRoom = (name: string, items: QuoteItem[]): QuoteRoom => ({ id: makeId(), name, roomDiscountValue: 0, roomDiscountType: "flat", moodBoard: [], items });
    if (type === 1) td.rooms = [mkRoom("Living Room", [
      newItem({ category: "Sofa Set", description: "Premium fabric 3+2 seater", price: 85000, quantity: 1, unitType: "set" }),
      newItem({ category: "TV Console", description: "Wall mounted with storage", price: 35000, quantity: 1, unitType: "nos" }),
      newItem({ category: "Coffee Table", description: "Marble top center table", price: 22000, quantity: 1, unitType: "nos" }),
      newItem({ category: "Display Unit", description: "Glass door cabinet", price: 45000, quantity: 1, unitType: "nos" }),
    ])];
    else if (type === 2) td.rooms = ["Living Room", "Master Bedroom", "Kitchen", "Bathroom"].map((n) => mkRoom(n, [
      newItem({ category: `${n} Item 1`, price: 50000, quantity: 1, unitType: "nos" }),
      newItem({ category: `${n} Item 2`, price: 30000, quantity: 1, unitType: "nos" }),
    ]));
    else td.rooms = [mkRoom("Master Bedroom", [
      newItem({ category: "King Bed", description: "Engineered wood with storage", price: 180000, quantity: 1, unitType: "nos" }),
      newItem({ category: "Wardrobe", description: "4-door sliding wardrobe", price: 95000, quantity: 1, unitType: "nos" }),
      newItem({ category: "Side Tables", description: "Pair of matching tables", price: 35000, quantity: 1, unitType: "nos" }),
    ])];
    updateData(td);
    setShowTemplates(false);
    toast("Template applied");
  };

  const inputField = (label: string, node: React.ReactNode) => (<div><Label>{label}</Label>{node}</div>);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl text-foreground">Quotations</h2>
          <Badge variant="neutral">{data.quote.number}</Badge>
          <span className="flex items-center gap-1.5 text-xs text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Live editing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" onClick={undo} title="Undo (Ctrl+Z)">↺</Button>
          <Button variant="ghost" size="icon" onClick={redo} title="Redo (Ctrl+Shift+Z)">↻</Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>Templates</Button>
          <Button variant="outline" size="sm" onClick={shareQuote}>Share</Button>
          <Button variant="outline" size="sm" onClick={saveDraft}>Save draft</Button>
          <Button variant="secondary" size="sm" onClick={onSave}>Save</Button>
          <Button size="sm" onClick={onGeneratePdf}>Generate PDF</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border px-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn("border-b-2 px-3 py-2.5 text-sm font-medium transition-colors", activeTab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[1fr_360px]">
        <div className="overflow-y-auto p-6">
          {activeTab === "client" && (
            <div className="mx-auto max-w-3xl space-y-5">
              <Section title="Client information">
                <div className="grid grid-cols-2 gap-4">
                  {inputField("Client full name", <Input value={data.client.name} onChange={(e) => updateData((p) => ({ ...p, client: { ...p.client, name: e.target.value } }))} placeholder="e.g. Vimal Gupta" />)}
                  {inputField("Contact phone", <Input value={data.client.phone} onChange={(e) => updateData((p) => ({ ...p, client: { ...p.client, phone: e.target.value } }))} placeholder="+91" />)}
                  <div className="col-span-2">{inputField("Project site / delivery address", <Textarea rows={3} value={data.client.address} onChange={(e) => updateData((p) => ({ ...p, client: { ...p.client, address: e.target.value } }))} placeholder="Full address…" />)}</div>
                </div>
              </Section>
              <Section title="Proposal configuration">
                <div className="grid grid-cols-2 gap-4">
                  {inputField("Quote identifier", <Input value={data.quote.number} onChange={(e) => updateData((p) => ({ ...p, quote: { ...p.quote, number: e.target.value } }))} />)}
                  {inputField("Submission date", <Input type="date" value={data.quote.date} onChange={(e) => updateData((p) => ({ ...p, quote: { ...p.quote, date: e.target.value } }))} />)}
                  {inputField("Validity (days)", <Input type="number" value={data.quote.validityDays} onChange={(e) => updateData((p) => ({ ...p, quote: { ...p.quote, validityDays: toNumber(e.target.value) } }))} />)}
                  {inputField("Sales executive", <Input value={data.quote.salesPerson} onChange={(e) => updateData((p) => ({ ...p, quote: { ...p.quote, salesPerson: e.target.value } }))} />)}
                  <div className="col-span-2">{inputField("Project / site name", <Input value={data.quote.siteName} onChange={(e) => updateData((p) => ({ ...p, quote: { ...p.quote, siteName: e.target.value } }))} placeholder="e.g. Skyline Residency" />)}</div>
                </div>
              </Section>
            </div>
          )}

          {activeTab === "rooms" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Project inventory</h3>
                  <p className="text-sm text-muted-foreground">Allocation by room &amp; category</p>
                </div>
                <div className="flex gap-2">
                  <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-border bg-card px-3 text-xs font-medium hover:bg-accent">
                    Import Excel<input type="file" className="hidden" accept=".xlsx,.xls" onChange={onImportExcel} />
                  </label>
                  <Button size="sm" onClick={addRoom}>+ Create room</Button>
                </div>
              </div>

              {data.rooms.map((room, ri) => (
                <Card key={room.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
                    <div className="flex flex-1 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{ri + 1}</span>
                      <input value={room.name} onChange={(e) => updateRoom(ri, { name: e.target.value })} placeholder="Enter room name…"
                        className="flex-1 border-none bg-transparent text-base font-semibold text-foreground focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{room.items.length} items</Badge>
                      <Select className="h-8 w-44 text-xs" value="" onChange={(e) => { const t = TEMPLATES.find((x) => x.label === e.target.value); if (t) addItem(ri, t); }}>
                        <option value="">Quick add template…</option>
                        {TEMPLATES.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => addItem(ri)}>+ Item</Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => deleteRoom(ri)}>✕</Button>
                    </div>
                  </div>

                  {room.items.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">No items yet. Add your first item to this room.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {room.items.map((item, ii) => (
                        <div key={item.id} className="p-4">
                          <div className="flex gap-4">
                            <div className="group/img relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                              {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-muted-foreground/40 text-lg">▦</div>}
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/70 opacity-0 transition-opacity group-hover/img:opacity-100">
                                <label className="cursor-pointer text-[9px] font-bold text-white hover:underline">FILE<input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(ri, ii, e)} /></label>
                                <button onClick={() => { const u = prompt("Enter image URL:"); if (u) updateItem(ri, ii, { imageUrl: u }); }} className="text-[9px] font-bold text-white hover:underline">LINK</button>
                              </div>
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <input value={item.category} onChange={(e) => updateItem(ri, ii, { category: e.target.value })} placeholder="Item category…"
                                className="w-full border-none bg-transparent text-sm font-semibold text-foreground focus:outline-none" />
                              <textarea value={item.description} onChange={(e) => updateItem(ri, ii, { description: e.target.value })} placeholder="Brief description or notes…"
                                className="h-12 w-full resize-none border-none bg-transparent text-xs leading-relaxed text-muted-foreground focus:outline-none" />
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="tabular-nums text-base font-bold text-foreground">{money((item.price || 0) * (item.unitValue || 1) * (item.quantity || 1))}</div>
                              <button onClick={() => deleteItem(ri, ii)} className="mt-1 text-[11px] font-medium text-destructive hover:underline">Remove</button>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                            <div><Label className="text-[10px]">Material</Label><Input className="h-8 text-xs" value={item.material} onChange={(e) => updateItem(ri, ii, { material: e.target.value })} /></div>
                            <div><Label className="text-[10px]">Fabric</Label><Input className="h-8 text-xs" value={item.fabric} onChange={(e) => updateItem(ri, ii, { fabric: e.target.value })} /></div>
                            <div><Label className="text-[10px]">Unit rate ₹</Label><Input className="h-8 text-xs" type="number" value={item.price} onChange={(e) => updateItem(ri, ii, { price: toNumber(e.target.value) })} /></div>
                            <div><Label className="text-[10px]">Unit</Label><Select className="h-8 text-xs" value={item.unitType} onChange={(e) => updateItem(ri, ii, { unitType: e.target.value as UnitType })}><option value="nos">NOS</option><option value="set">SET</option><option value="sqft">SQFT</option><option value="rft">RFT</option></Select></div>
                            <div><Label className="text-[10px]">U.Val</Label><Input className="h-8 text-xs" type="number" value={item.unitValue} onChange={(e) => updateItem(ri, ii, { unitValue: toNumber(e.target.value) })} /></div>
                            <div><Label className="text-[10px]">Qty</Label><Input className="h-8 text-xs" type="number" value={item.quantity} onChange={(e) => updateItem(ri, ii, { quantity: toNumber(e.target.value) })} /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Room discount</span>
                      <Input className="h-8 w-20 text-xs" type="number" value={room.roomDiscountValue} onChange={(e) => updateRoom(ri, { roomDiscountValue: toNumber(e.target.value) })} />
                      <Select className="h-8 w-24 text-xs" value={room.roomDiscountType} onChange={(e) => updateRoom(ri, { roomDiscountType: e.target.value as DiscountType })}><option value="flat">₹ Flat</option><option value="percent">% Off</option></Select>
                    </div>
                    <div className="text-right text-sm"><span className="mr-2 text-muted-foreground">Room net:</span><span className="font-bold text-primary tabular-nums">{money(computed.summaryByRoom[ri]?.net)}</span></div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "finance" && (
            <div className="mx-auto max-w-2xl space-y-5">
              <Section title="Financial adjustments">
                <div className="grid grid-cols-2 gap-4">
                  {inputField("Global discount", <div className="flex gap-2"><Input type="number" value={data.charges.overallDiscountValue} onChange={(e) => updateData((p) => ({ ...p, charges: { ...p.charges, overallDiscountValue: toNumber(e.target.value) } }))} /><Select className="w-28" value={data.charges.overallDiscountType} onChange={(e) => updateData((p) => ({ ...p, charges: { ...p.charges, overallDiscountType: e.target.value as DiscountType } }))}><option value="flat">Flat ₹</option><option value="percent">% Off</option></Select></div>)}
                  {inputField("GST", <div className="flex gap-2"><Input type="number" placeholder="Rate %" value={data.charges.gstPercent} onChange={(e) => updateData((p) => ({ ...p, charges: { ...p.charges, gstPercent: toNumber(e.target.value) } }))} /><Select className="w-28" value={data.charges.gstMode} onChange={(e) => updateData((p) => ({ ...p, charges: { ...p.charges, gstMode: e.target.value as GstMode } }))}><option value="excluded">Extra</option><option value="included">Inclusive</option></Select></div>)}
                  {inputField("Packing & handling (%)", <Input type="number" value={data.charges.packingPercent} onChange={(e) => updateData((p) => ({ ...p, charges: { ...p.charges, packingPercent: toNumber(e.target.value) } }))} />)}
                  {inputField("Logistics / loading (₹)", <Input type="number" value={data.charges.loadingCharge} onChange={(e) => updateData((p) => ({ ...p, charges: { ...p.charges, loadingCharge: toNumber(e.target.value) } }))} />)}
                </div>
                <label className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/30 p-4">
                  <span><span className="block text-sm font-medium text-foreground">Split GST into CGST + SGST</span><span className="text-xs text-muted-foreground">For regional (intra-state) compliance</span></span>
                  <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={data.charges.splitCgstSgst} onChange={(e) => updateData((p) => ({ ...p, charges: { ...p.charges, splitCgstSgst: e.target.checked } }))} />
                </label>
              </Section>
              <Section title="Terms & conditions">
                <div className="space-y-2">
                  {terms.map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-semibold text-muted-foreground">{i + 1}</span>
                      <Textarea className="min-h-0 h-10 py-2" value={t} onChange={(e) => { const n = [...terms]; n[i] = e.target.value; setTerms(n); }} />
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setTerms((p) => p.filter((_, idx) => idx !== i))}>✕</Button>
                    </div>
                  ))}
                  <button onClick={() => setTerms((p) => [...p, "New condition…"])} className="w-full rounded-md border border-dashed border-border py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:bg-accent">+ Append new term</button>
                </div>
              </Section>
            </div>
          )}

          {activeTab === "payment" && (
            <div className="mx-auto max-w-xl space-y-5">
              <Section title="Settlement accounts">
                <div className="space-y-4">
                  {inputField("Digital payments (UPI ID / VPA)", <Input value={data.payment.upiId} onChange={(e) => updateData((p) => ({ ...p, payment: { ...p.payment, upiId: e.target.value } }))} placeholder="e.g. maplefurnishers@axis" />)}
                  <div className="h-px bg-border" />
                  <div className="grid grid-cols-2 gap-4">
                    {inputField("Bank institution", <Input value={data.payment.bankName} onChange={(e) => updateData((p) => ({ ...p, payment: { ...p.payment, bankName: e.target.value } }))} />)}
                    {inputField("Account holder", <Input value={data.payment.accountName} onChange={(e) => updateData((p) => ({ ...p, payment: { ...p.payment, accountName: e.target.value } }))} />)}
                    {inputField("Account number", <Input value={data.payment.accountNumber} onChange={(e) => updateData((p) => ({ ...p, payment: { ...p.payment, accountNumber: e.target.value } }))} />)}
                    {inputField("IFSC branch code", <Input value={data.payment.ifsc} onChange={(e) => updateData((p) => ({ ...p, payment: { ...p.payment, ifsc: e.target.value } }))} />)}
                  </div>
                </div>
              </Section>
            </div>
          )}

          {activeTab === "saved" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Saved in system</h3>
                <p className="text-sm text-muted-foreground">Quotations stored in the database — linked to clients and visible across tools.</p>
              </div>
              {serverQuotes.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nothing saved yet. Use “Save” in the top bar.</div>
              ) : (
                <Card className="overflow-hidden p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Number</th><th className="px-4 py-3">Client</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Saved</th><th></th></tr></thead>
                    <tbody className="[&_td]:px-4 [&_td]:py-3 [&_tr]:border-t [&_tr]:border-border/70">
                      {serverQuotes.map((q) => (
                        <tr key={q.id}>
                          <td className="font-medium text-foreground">{q.number}</td>
                          <td className="text-muted-foreground">{q.client?.name || "—"}</td>
                          <td className="text-right tabular-nums">{money(q.total)}</td>
                          <td className="text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-3">
                              <button onClick={() => { setData((q as unknown as { data: QuoteData }).data); setActiveTab("client"); toast("Loaded into builder"); }} className="text-xs font-medium text-primary hover:underline">Load</button>
                              <button onClick={() => deleteServerQuote(q.id)} className="text-muted-foreground/50 hover:text-destructive">×</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}

          {activeTab === "drafts" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Saved drafts</h3>
                <p className="text-sm text-muted-foreground">Stored locally in this browser</p>
              </div>
              {drafts.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No drafts yet.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {drafts.map((d) => (
                    <Card key={d.id} className="group relative p-4">
                      <button onClick={() => { if (confirm("Load draft?")) setData(d.data); }} className="w-full text-left">
                        <div className="mb-3 flex items-start justify-between">
                          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">▦</span>
                          <div className="text-right"><div className="text-sm font-bold text-primary">{money(computeTotals(d.data).totals.grandTotal)}</div><div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{d.data.rooms.length} rooms</div></div>
                        </div>
                        <div className="truncate text-sm font-semibold text-foreground">{d.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{new Date(d.savedAt).toLocaleDateString()} · {new Date(d.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </button>
                      <button onClick={() => deleteDraft(d.id)} className="absolute right-3 top-3 text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">✕</button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right summary panel */}
        <aside className="hidden min-h-0 flex-col overflow-y-auto border-l border-border bg-muted/20 xl:flex">
          <div className="space-y-5 p-5">
            <Card className="overflow-hidden p-0">
              <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Financial summary</div>
              <div className="space-y-2.5 p-4">
                {computed.totals.lines.filter((l) => !l.isLast).map((line) => (
                  <div key={line.key} className="flex items-center justify-between text-sm">
                    <span className={line.emphasis ? "font-semibold text-foreground" : "text-muted-foreground"}>{line.label}</span>
                    <span className={cn("tabular-nums", line.emphasis ? "font-semibold text-foreground" : "text-foreground/80")}>{money(line.value)}</span>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between border-t border-border pt-3"><span className="text-sm font-semibold text-foreground">Grand Total</span><span className="text-lg font-bold text-primary tabular-nums">{money(computed.totals.grandTotal)}</span></div>
              </div>
            </Card>

            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Proposal preview</span>
                <button onClick={onGeneratePdf} className="text-[10px] font-bold uppercase tracking-wide text-primary hover:underline">Export ↗</button>
              </div>
              <div className="p-4">
                {!data.client.name ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">Fill in client details to see preview</div>
                ) : (
                  <button onClick={onGeneratePdf} className="block w-full overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-border" style={{ aspectRatio: "3 / 4.2" }}>
                    <div style={{ transformOrigin: "top left", transform: "scale(0.62)", width: "161.3%", height: "161.3%" }}>
                      <LivePreviewPanel data={data} computed={computed} terms={terms} />
                    </div>
                  </button>
                )}
              </div>
            </Card>
          </div>
        </aside>
      </div>

      {/* Templates modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowTemplates(false)}>
          <Card className="w-full max-w-lg p-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <div><h3 className="text-base font-semibold text-foreground">Proposal templates</h3><p className="text-xs uppercase tracking-wide text-muted-foreground">Pre-configured inventory packages</p></div>
              <Button variant="ghost" size="icon" onClick={() => setShowTemplates(false)}>✕</Button>
            </div>
            <div className="space-y-3 p-5">
              {[
                { type: 1, title: "Living Room Package", desc: "Sofa Set, TV Console, Coffee Table, Display Unit", items: 4 },
                { type: 2, title: "Full Home Renovation", desc: "Living, Master Bedroom, Kitchen, Bathroom", items: 12 },
                { type: 3, title: "Master Bedroom Set", desc: "King Bed, 4-Door Wardrobe, Side Tables", items: 3 },
              ].map((t) => (
                <div key={t.type} className="rounded-lg border border-border p-4 transition-colors hover:border-primary">
                  <div className="mb-1 flex items-center justify-between"><h4 className="text-sm font-semibold text-foreground">{t.title}</h4><Badge>{t.items} items</Badge></div>
                  <p className="mb-3 text-xs text-muted-foreground">Includes {t.desc}.</p>
                  <Button size="sm" className="w-full" onClick={() => applyTemplate(t.type as 1 | 2 | 3)}>Apply template</Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
