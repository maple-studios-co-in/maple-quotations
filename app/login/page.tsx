"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@maplefurnishers.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (res.ok) {
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("next") || "/";
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="text-center">
          <div className="font-serif text-2xl text-primary">Maple Furnishers</div>
          <div className="text-xs text-muted-foreground">Quotations · sign in</div>
        </div>
        {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</div>}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username"
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password"
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30" />
        </div>
        <button disabled={busy} type="submit"
          className="h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
