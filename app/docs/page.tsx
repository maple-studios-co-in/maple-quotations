import Link from "next/link";
import { DOCS } from "@maple/core/lib/docs";

export const metadata = { title: "Docs · Maple Quotations" };

export default function DocsIndex() {
  return (
    <div>
      <h1 className="font-serif text-3xl text-foreground">Documentation</h1>
      <p className="mt-2 text-muted-foreground">Guides for using and building on Maple Quotations.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {DOCS.map((d) => (
          <Link key={d.slug} href={`/docs/${d.slug}`}
            className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {d.audience === "user" ? "For everyone" : "For developers"}
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">{d.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
