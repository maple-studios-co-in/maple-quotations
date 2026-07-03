import type { Metadata } from "next";
import { Outfit, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { getSession } from "@maple/core/lib/auth";
import { SuiteShell } from "@maple/core/components/SuiteShell";
import { getBrand } from "@maple/core/lib/brand";
import { ToolDisabled } from "@maple/core/components/ToolDisabled";
import { isEnabled } from "@maple/core/lib/flags";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", weight: "400", subsets: ["latin"] });
export const metadata: Metadata = { title: "Quotations · Maple Furnishers" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The middleware gates protected routes and redirects signed-out users to /login,
  // so here we simply render the shell for authed users and bare children (e.g. the
  // /login page) otherwise — no redirect, which would loop on /login itself.
  const user = await getSession();
  return (
    <html lang="en" className={`${outfit.variable} ${instrument.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full">
        {user ? <AuthedShell>{children}</AuthedShell> : children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

async function AuthedShell({ children }: { children: React.ReactNode }) {
  const user = (await getSession())!;
  const brand = await getBrand();
  const toolOn = await isEnabled("tool.quotations");
  return toolOn ? (
    <SuiteShell user={user} brand={brand} current="quotations">{children}</SuiteShell>
  ) : (
    <ToolDisabled label="Quotations" />
  );
}
