"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@maple/core/ui/button";
import { Input, Select } from "@maple/core/ui/input";
import { Label } from "@maple/core/ui/label";
import { Card } from "@maple/core/ui/card";

type Company = {
  brandName: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  website: string | null;
  tagline: string | null;
};

type SettingsPayload = {
  anthropicApiKey: string | null; // masked, e.g. "••••Ax3f"
  aiParseModel: string;
  modelOptions: { id: string; label: string }[];
  company: Company | null;
};

const EMPTY_COMPANY: Company = {
  brandName: "", logoUrl: null, bannerUrl: null, primaryColor: "",
  addressLine1: "", addressLine2: "", phone: "", email: "", gstin: "", website: "", tagline: "",
};

export function SettingsForm() {
  const [current, setCurrent] = useState<SettingsPayload | null>(null);
  const [newKey, setNewKey] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [company, setCompany] = useState<Company>(EMPTY_COMPANY);
  const [companyBusy, setCompanyBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/settings");
    if (r.ok) {
      const j: SettingsPayload = await r.json();
      setCurrent(j);
      setModel(j.aiParseModel);
      if (j.company) setCompany({ ...EMPTY_COMPANY, ...j.company });
    }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    const body: Record<string, string> = { aiParseModel: model };
    if (newKey.trim()) body.anthropicApiKey = newKey.trim();
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (r.ok) {
      setNewKey("");
      toast.success("Settings saved");
      load();
    } else {
      const j = await r.json().catch(() => ({}));
      toast.error(j.error || "Could not save");
    }
  }

  async function clearKey() {
    if (!confirm("Remove the stored API key? The server will fall back to the ANTHROPIC_API_KEY environment variable.")) return;
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anthropicApiKey: "" }),
    });
    if (r.ok) { toast.success("Stored key removed"); load(); }
  }

  async function putCompany(patch: Partial<Company>, okMsg: string) {
    const r = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: patch }),
    });
    if (r.ok) {
      toast.success(okMsg);
      await load();
    } else {
      const j = await r.json().catch(() => ({}));
      toast.error(j.error || "Could not save");
    }
  }

  async function uploadImage(kind: "logo" | "banner", file: File) {
    setCompanyBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      fd.append("name", `${kind}-${file.name}`);
      const r = await fetch("/api/assets", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(j.error || "Upload failed"); return; }
      await putCompany(kind === "logo" ? { logoUrl: j.url } : { bannerUrl: j.url }, kind === "logo" ? "Logo updated" : "Banner updated");
    } finally {
      setCompanyBusy(false);
    }
  }

  async function saveCompany() {
    setCompanyBusy(true);
    try {
      const { logoUrl, bannerUrl, ...text } = company;
      void logoUrl; void bannerUrl; // images save on upload/remove, not here
      await putCompany(text, "Company details saved");
    } finally {
      setCompanyBusy(false);
    }
  }

  function setField(field: keyof Company, value: string) {
    setCompany((c) => ({ ...c, [field]: value }));
  }

  if (!current) return <div className="mt-8 h-40 animate-pulse rounded-lg border border-border bg-card" />;

  return (
    <div className="mt-6 space-y-5">
      <Card className="p-5">
        <div className="mb-4 text-xs font-bold uppercase tracking-wide text-primary">Branding &amp; company</div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Logo</Label>
              <div className="mt-1 flex items-center gap-3">
                {company.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logoUrl} alt="Company logo" className="h-12 w-12 rounded-md border border-border object-contain bg-white" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-[10px] text-muted-foreground">None</div>
                )}
                <input ref={logoInput} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage("logo", f); e.target.value = ""; }} />
                <Button type="button" variant="outline" size="sm" disabled={companyBusy} onClick={() => logoInput.current?.click()}>
                  {company.logoUrl ? "Replace" : "Upload"}
                </Button>
                {company.logoUrl && (
                  <button type="button" disabled={companyBusy} onClick={() => putCompany({ logoUrl: null }, "Logo removed")}
                    className="text-xs font-medium text-destructive hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Shown in the app header and on PDF proposals.</p>
            </div>
            <div>
              <Label>PDF banner</Label>
              <div className="mt-1 space-y-2">
                {company.bannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.bannerUrl} alt="PDF banner" className="w-full max-h-24 rounded-md border border-border object-cover" />
                )}
                <div className="flex items-center gap-3">
                  <input ref={bannerInput} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage("banner", f); e.target.value = ""; }} />
                  <Button type="button" variant="outline" size="sm" disabled={companyBusy} onClick={() => bannerInput.current?.click()}>
                    {company.bannerUrl ? "Replace" : "Upload"}
                  </Button>
                  {company.bannerUrl && (
                    <button type="button" disabled={companyBusy} onClick={() => putCompany({ bannerUrl: null }, "Banner removed")}
                      className="text-xs font-medium text-destructive hover:underline">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Wide image across the top of the proposal&apos;s first page.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Company name</Label>
              <Input value={company.brandName ?? ""} onChange={(e) => setField("brandName", e.target.value)} placeholder="Maple Furnishers" />
            </div>
            <div>
              <Label>Brand color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={company.primaryColor || "#7a2e2a"}
                  onChange={(e) => setField("primaryColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-card p-1"
                  aria-label="Brand color"
                />
                <Input value={company.primaryColor ?? ""} onChange={(e) => setField("primaryColor", e.target.value)} placeholder="#7a2e2a" className="font-mono" />
              </div>
            </div>
            <div>
              <Label>Address line 1</Label>
              <Input value={company.addressLine1 ?? ""} onChange={(e) => setField("addressLine1", e.target.value)} placeholder="B-3, W.H.S. Timber Market Kirti Nagar" />
            </div>
            <div>
              <Label>Address line 2</Label>
              <Input value={company.addressLine2 ?? ""} onChange={(e) => setField("addressLine2", e.target.value)} placeholder="Delhi-110015" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={company.phone ?? ""} onChange={(e) => setField("phone", e.target.value)} placeholder="9211819727" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={company.email ?? ""} onChange={(e) => setField("email", e.target.value)} placeholder="hello@maplefurnishers.com" />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input value={company.gstin ?? ""} onChange={(e) => setField("gstin", e.target.value)} placeholder="07AAAAA0000A1Z5" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={company.website ?? ""} onChange={(e) => setField("website", e.target.value)} placeholder="shop.maplefurnishers.com" />
            </div>
            <div className="sm:col-span-2">
              <Label>Tagline</Label>
              <Input value={company.tagline ?? ""} onChange={(e) => setField("tagline", e.target.value)} placeholder="Heritage luxury, bespoke craft" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveCompany} disabled={companyBusy}>{companyBusy ? "Saving…" : "Save company details"}</Button>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 text-xs font-bold uppercase tracking-wide text-primary">Anthropic API key</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Current key</span>
            <span className="font-mono">{current.anthropicApiKey ?? "not set"}</span>
          </div>
          <div>
            <Label>Replace with a new key</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder="sk-ant-…"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Stored encrypted in the database and never shown again in full. Leave blank to keep the current key.
            </p>
          </div>
          {current.anthropicApiKey && (
            <button onClick={clearKey} className="text-xs font-medium text-destructive hover:underline">
              Remove stored key (fall back to server environment)
            </button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 text-xs font-bold uppercase tracking-wide text-primary">Catalog parsing model</div>
        <Label>Model used to read catalog PDFs</Label>
        <Select value={model} onChange={(e) => setModel(e.target.value)}>
          {current.modelOptions.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </Select>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Handwritten rates read best on the most capable models. Sonnet or Haiku are fine for PDFs with clean printed text.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
      </div>
    </div>
  );
}
