"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompletionSummary } from "@/hooks/useCompletionSummary";
import { useSessionStore } from "@/stores/sessionStore";
import { CompleteScreen } from "./CompleteScreen";

export function CompleteRoute({ id, showStreak }: { id: string; showStreak: boolean }) {
  const router = useRouter();
  const summary = useCompletionSummary(id);
  useEffect(() => {
    useSessionStore.getState().setFinishing(false);
    if (summary.isPending || summary.isError) return;
    if (!summary.data) router.replace("/study");
    else if (!summary.data.session.endedAt) router.replace(`/session/${summary.data.session.id}`);
  }, [summary.data, summary.isPending, summary.isError, router]);
  if (!summary.data?.session.endedAt) return null;
  return <CompleteScreen summary={summary.data} showStreak={showStreak} />;
}
