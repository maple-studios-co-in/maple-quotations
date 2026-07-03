import Link from "next/link";
import { DOCS } from "@maple/core/lib/docs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/docs" className="font-serif text-xl text-primary">Maple Quotations · Docs</Link>
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">Open the app →</Link>
        </div>
      </header>
      <div className="mx-auto flex max-w-5xl gap-10 px-6 py-10">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-10 space-y-1">
            {DOCS.map((d) => (
              <Link key={d.slug} href={`/docs/${d.slug}`}
                className="block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                {d.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
