import { redirect } from "next/navigation";
import { getSession } from "@maple/core/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Maple Quotations" };

// Already signed in? There's nothing to do here — go to the builder.
export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect("/");
  return <LoginForm />;
}
