import { redirect } from "next/navigation";
import { SessionRoute } from "@/components/session/SessionRoute";
import { authRepository } from "@/lib/repo/authRepository";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  return <SessionRoute id={(await params).id} />;
}
