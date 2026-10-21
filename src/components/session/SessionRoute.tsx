"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useSession } from "@/hooks/useSession";
import { useSessionStore } from "@/stores/sessionStore";
import { SessionScreen } from "./SessionScreen";

export function SessionRoute({ id }: { id: string }) {
  const router = useRouter();
  const active = useActiveSession();
  const saved = useSession(id, active.isSuccess && active.data?.id !== id);
  const isFinishing = useSessionStore((state) => state.isFinishing);
  const session = active.data?.id === id ? active.data : saved.data;
  useEffect(() => {
    // The Finish mutation owns this navigation until CompleteScreen mounts.
    // A saved-query refresh must not start a competing replace to the same URL.
    if (isFinishing || active.isPending || (active.data?.id !== id && saved.isPending)) return;
    if (session?.endedAt) router.replace(`/session/${session.id}/complete`);
    else if (!active.data || active.data.id !== id) router.replace("/");
  }, [active.data, active.isPending, saved.isPending, session, router, id, isFinishing]);
  if (active.data?.id === id && !active.data.endedAt) return <SessionScreen key={active.data.id} session={active.data} />;
  return null;
}
