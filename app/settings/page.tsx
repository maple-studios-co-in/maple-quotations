import { redirect } from "next/navigation";
import { getSession } from "@maple/core/lib/auth";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings · Maple Quotations" };

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  const isAdmin = user.perms.includes("*") || user.role === "admin";
  if (!isAdmin) redirect("/");
  return (
    <div className="mx-auto max-w-2xl overflow-y-auto p-6">
      <h2 className="font-serif text-2xl text-foreground">Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        AI configuration for catalog parsing. Values saved here override the server environment.
      </p>
      <SettingsForm />
    </div>
  );
}
