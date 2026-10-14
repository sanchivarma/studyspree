import { redirect } from "next/navigation";
import { CompleteRoute } from "@/components/session/CompleteRoute";
import { authRepository } from "@/lib/repo/authRepository";

export default async function CompletePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  return <CompleteRoute id={(await params).id} />;
}
