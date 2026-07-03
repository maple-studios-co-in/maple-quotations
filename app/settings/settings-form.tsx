"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@maple/core/ui/button";
import { Input, Select } from "@maple/core/ui/input";
import { Label } from "@maple/core/ui/label";
import { Card } from "@maple/core/ui/card";

type SettingsPayload = {
  anthropicApiKey: string | null; // masked, e.g. "••••Ax3f"
  aiParseModel: string;
  modelOptions: { id: string; label: string }[];
};

export function SettingsForm() {
  const [current, setCurrent] = useState<SettingsPayload | null>(null);
  const [newKey, setNewKey] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/settings");
    if (r.ok) {
      const j: SettingsPayload = await r.json();
      setCurrent(j);
      setModel(j.aiParseModel);
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

  if (!current) return <div className="mt-8 h-40 animate-pulse rounded-lg border border-border bg-card" />;

  return (
    <div className="mt-6 space-y-5">
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
