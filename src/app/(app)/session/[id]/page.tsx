import { redirect } from "next/navigation";
import { z } from "zod";
import { SessionScreen } from "@/components/session/SessionScreen";
import { authRepository } from "@/lib/repo/authRepository";

export default async function SessionPage({ searchParams }: { searchParams: Promise<{ task?: string | string[] }> }) {
  const profile = await authRepository.getProfile();
  if (!profile) redirect("/");
  const task = z.string().trim().max(200).safeParse((await searchParams).task);
  return <SessionScreen slug={profile.selected_character} task={task.success ? task.data : undefined} />;
}
