import Link from "next/link";

// Public landing for signed-out visitors. Brand system preserved from the app
// shell (Outfit + Instrument Serif, warm oklch theme, maple-red primary).
// Static by design: hover/active states only, one CSS entrance on the hero.

const CTA_PRIMARY =
  "inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:translate-y-px";
const CTA_GHOST =
  "inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent active:translate-y-px";

/** A real render of the document the tool produces, with data from an actual
 *  project rate sheet. Not a mock dashboard: this is the output itself. */
function ProposalPreview() {
  const rows = [
    { item: "Dining Table", spec: "Marble top, wooden body", amount: "₹85,000" },
    { item: "Dining Chair × 8", spec: "L 450 × W 450 mm", amount: "₹1,44,000" },
    { item: "Formal Sofa", spec: "L 2600 × W 750 mm", amount: "₹1,14,000" },
  ];
  return (
    <div className="rounded-sm border-2 border-foreground bg-white p-6 text-[11px] leading-relaxed text-black shadow-[0_24px_60px_-24px_oklch(0.36_0.11_28_/_0.35)]">
      <div className="flex items-start justify-between border-b-4 border-black pb-3">
        <div className="text-sm font-black tracking-tight">MAPLE FURNISHERS</div>
        <div className="text-right text-[8px] font-semibold leading-tight">
          <div>B-3, W.H.S. Timber Market Kirti Nagar</div>
          <div>Delhi-110015</div>
        </div>
      </div>
      <div className="mt-3 flex justify-between border-2 border-black p-2.5">
        <div>
          <div className="text-[8px] font-extrabold uppercase">Prepared for</div>
          <div className="text-[13px] font-extrabold">Asha Rao</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-extrabold uppercase">Ref no.</div>
          <div className="text-[13px] font-extrabold">MF/2026/Q-042</div>
        </div>
      </div>
      <div className="mt-4 bg-black px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
        Living Dining Kitchen · 3 items
      </div>
      {rows.map((r) => (
        <div key={r.item} className="flex items-baseline justify-between border-b-2 border-black py-2">
          <div>
            <div className="text-[11px] font-extrabold">{r.item}</div>
            <div className="text-[9px] font-semibold text-black/70">{r.spec}</div>
          </div>
          <div className="text-[12px] font-black tabular-nums">{r.amount}</div>
        </div>
      ))}
      <div className="mt-3 space-y-1 border-t-4 border-black pt-2 font-bold uppercase">
        <div className="flex justify-between text-[9px]"><span>Subtotal</span><span className="tabular-nums">₹3,43,000</span></div>
        <div className="flex justify-between text-[9px]"><span>CGST (9%)</span><span className="tabular-nums">₹30,870</span></div>
        <div className="flex justify-between text-[9px]"><span>SGST (9%)</span><span className="tabular-nums">₹30,870</span></div>
        <div className="flex justify-between text-[12px] font-black"><span>Grand total</span><span className="tabular-nums">₹4,04,740</span></div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Nav: one line, 64px */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="font-serif text-xl text-primary">Maple Quotations</span>
          <nav className="flex items-center gap-2">
            <Link href="/docs" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Read the docs
            </Link>
            <Link href="/login" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:translate-y-px">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero: asymmetric split, real document preview on the right */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-16 md:grid-cols-[1.1fr_0.9fr] md:pt-24">
        <div className="landing-fade-up">
          <h1 className="font-serif text-4xl leading-[1.05] tracking-tight md:text-6xl">
            Room-wise quotations, ready to send.
          </h1>
          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-muted-foreground">
            Build furniture proposals room by room. Live totals, GST handled, and a branded PDF ready for sign-off.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className={CTA_PRIMARY}>Sign in</Link>
            <Link href="/docs" className={CTA_GHOST}>Read the docs</Link>
          </div>
        </div>
        <div className="landing-fade-up mx-auto w-full max-w-sm md:max-w-none" style={{ animationDelay: "120ms" }}>
          <ProposalPreview />
        </div>
      </section>

      {/* How it works: numbered rows, not three equal cards */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-3xl tracking-tight">From site visit to signed proposal</h2>
          <div className="mt-10 divide-y divide-border">
            {[
              {
                n: "1",
                title: "Add rooms and items",
                body: "Start from templates for wardrobes, kitchens, and sofas, or import a rate sheet from Excel with images included.",
              },
              {
                n: "2",
                title: "Tune the money",
                body: "Discounts at item, room, or quote level. GST inclusive or extra, split into CGST and SGST when you need it.",
              },
              {
                n: "3",
                title: "Send it",
                body: "A branded PDF proposal for the client, or a rate-sheet workbook in the format your team already uses.",
              },
            ].map((s) => (
              <div key={s.n} className="grid gap-3 py-8 md:grid-cols-[80px_240px_1fr] md:gap-8">
                <div className="font-serif text-5xl text-primary/30">{s.n}</div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="max-w-[52ch] text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature bento: 5 items, 2+3, mixed backgrounds */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-3xl tracking-tight">Built around how furniture is actually quoted</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-6">
          {/* Live totals: real mini-render of the summary panel */}
          <div className="rounded-lg border border-border bg-card p-6 md:col-span-4">
            <h3 className="text-base font-semibold">Live totals while you type</h3>
            <p className="mt-1 max-w-[48ch] text-sm text-muted-foreground">
              Every rate, quantity, and discount rolls up instantly. No spreadsheet formulas to break.
            </p>
            <div className="mt-5 max-w-sm space-y-2 rounded-md border border-border bg-background p-4 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal (gross)</span><span className="tabular-nums">₹3,43,000</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Less: room discounts</span><span className="tabular-nums">-₹12,000</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Packing (3%)</span><span className="tabular-nums">₹9,930</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><span>Grand total</span><span className="tabular-nums text-primary">₹3,99,517</span></div>
            </div>
          </div>
          <div className="rounded-lg bg-primary p-6 text-primary-foreground md:col-span-2">
            <h3 className="text-base font-semibold">GST, both ways</h3>
            <p className="mt-1 text-sm text-primary-foreground/80">
              Quote with tax extra or inclusive. Split CGST and SGST for intra-state billing with one switch.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 md:col-span-2">
            <h3 className="text-base font-semibold">Excel import</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Drop in a rate sheet and items arrive with categories, rates, and embedded images intact.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-accent/60 p-6 md:col-span-2">
            <h3 className="text-base font-semibold">Drafts and sharing</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Autosaved while you work. Share a link that opens the exact quote you built.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 md:col-span-2">
            <h3 className="text-base font-semibold">Clients on record</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Saved quotes link to a client record, so the next proposal starts from history.
            </p>
          </div>
        </div>
      </section>

      {/* The output format: full-width band, real columns */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-serif text-3xl tracking-tight">Exports match the sheet your team already uses</h2>
          <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">
            One click produces the rate-sheet workbook: items grouped by room, with the summary block for packing, loading, and GST at the end.
          </p>
          <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  {["Category", "Description", "Specification", "Unit", "Price", "Qty", "Total"].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-muted/50 text-[11px] font-bold uppercase tracking-wide">
                  <td colSpan={7} className="px-4 py-2">405 · Living Dining Kitchen</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">Dining Table</td>
                  <td className="px-4 py-3 text-muted-foreground">Marble top, wooden body</td>
                  <td className="px-4 py-3 text-muted-foreground">L 2250 × W 1050 × H 750 mm</td>
                  <td className="px-4 py-3">NOS</td>
                  <td className="px-4 py-3 tabular-nums">85,000</td>
                  <td className="px-4 py-3 tabular-nums">1</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">85,000</td>
                </tr>
                <tr className="border-t border-border/60">
                  <td className="px-4 py-3 font-medium">Dining Chair</td>
                  <td className="px-4 py-3 text-muted-foreground">Upholstered, set of 8</td>
                  <td className="px-4 py-3 text-muted-foreground">L 450 × W 450, Seat 450 mm</td>
                  <td className="px-4 py-3">NOS</td>
                  <td className="px-4 py-3 tabular-nums">18,000</td>
                  <td className="px-4 py-3 tabular-nums">8</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">1,44,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="font-serif text-4xl tracking-tight">Start your next proposal.</h2>
        <div className="mt-8 flex justify-center">
          <Link href="/login" className={CTA_PRIMARY}>Sign in</Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground">
          <span>Maple Furnishers, Kirti Nagar, Delhi</span>
          <Link href="/docs" className="transition-colors hover:text-foreground">Read the docs</Link>
        </div>
      </footer>
    </div>
  );
}
