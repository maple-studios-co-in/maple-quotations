import { getSession } from "@maple/core/lib/auth";
import QuotationBuilderPage from "./builder";
import { Landing } from "./landing";

// Root route: the quotation builder for signed-in users, the public landing
// page for everyone else. Middleware leaves "/" open; APIs stay protected.
export default async function Home() {
  const user = await getSession();
  return user ? <QuotationBuilderPage /> : <Landing />;
}
