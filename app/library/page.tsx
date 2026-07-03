import { redirect } from "next/navigation";
import { getSession } from "@maple/core/lib/auth";
import { LibraryClient } from "./library-client";

export const metadata = { title: "Library · Maple Quotations" };

export default async function LibraryPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto max-w-5xl p-6">
      <h2 className="font-serif text-2xl text-foreground">Product library</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything imported or saved so far — reusable in any quote via “+ Library”. Images live in the gallery.
      </p>
      <LibraryClient />
    </div>
  );
}
