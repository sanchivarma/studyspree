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
  const saved = useSession(id);
  const isFinishing = useSessionStore((state) => state.isFinishing);
  const session = active.data?.id === id ? active.data : saved.data;
  useEffect(() => {
    if ((isFinishing && !session?.endedAt) || active.isPending || saved.isPending) return;
    if (session?.endedAt) router.replace(`/session/${session.id}/complete`);
    else if (active.data && active.data.id !== id) router.replace(`/session/${active.data.id}`);
    else if (!session) router.replace("/study");
  }, [active.data, active.isPending, saved.isPending, session, router, id, isFinishing]);
  if (session && !session.endedAt) return <SessionScreen key={session.id} session={session} />;
  return null;
}
