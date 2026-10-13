import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { getAuthConfig } from "@/lib/auth/config";
import { authRepository } from "@/lib/repo/authRepository";
import { hasDevAdmin } from "@/lib/auth/devAdmin";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ authError?: string }> }) {
  if (await authRepository.getProfile()) redirect("/home");
  return <AuthScreen isConfigured={Boolean(getAuthConfig())} hasDevLogin={hasDevAdmin()} hasCallbackError={(await searchParams).authError === "1"} />;
}
