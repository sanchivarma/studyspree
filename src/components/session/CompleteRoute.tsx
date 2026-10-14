"use client";
import { CompleteScreen } from "./CompleteScreen";

export function CompleteRoute({ id, showStreak }: { id: string; showStreak: boolean }) {
  return <CompleteScreen id={id} showStreak={showStreak} />;
}
