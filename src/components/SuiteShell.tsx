"use client";
import React from "react";
import type { SessionUser } from "../lib/session";
import { ROLE_LABEL } from "../lib/rbac";

// Standalone shell for the Quotations tool. The cross-tool sidebar from maple-suite
// was intentionally dropped — this app ships on its own. When it later rejoins the
// ecosystem, links to sibling tools can be added back here (by subdomain).
export function SuiteShell({
  user,
  current,
  brand,
  children,
}: {
  user: SessionUser;
  current: string;
  brand?: { name: string; logoUrl?: string | null };
  children: React.ReactNode;
}) {
  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          {brand?.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-7 w-auto" />
          ) : (
            <span className="font-serif text-xl text-primary">{brand?.name ?? "Maple Furnishers"}</span>
          )}
          <span className="text-sm font-semibold capitalize text-muted-foreground">{current.replace("-", " ")}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {(user.perms.includes("*") || user.role === "admin") && (
            <a href="/settings" className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              Settings
            </a>
          )}
          <div className="text-right leading-tight">
            <div className="font-medium text-foreground">{user.name}</div>
            <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[user.role] ?? user.role}</div>
          </div>
          <button onClick={logout} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
            Sign out
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
