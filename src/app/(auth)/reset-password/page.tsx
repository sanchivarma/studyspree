import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getAuthConfig } from "@/lib/auth/config";
import { createAuthClient } from "@/lib/auth/server";

export default async function ResetPasswordPage() {
  if (!getAuthConfig()) redirect("/");
  const client = await createAuthClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/");
  return <ResetPasswordForm />;
}
