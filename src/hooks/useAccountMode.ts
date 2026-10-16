"use client";
import { useContext } from "react";
import { AccountModeContext } from "@/components/layout/AccountModeProvider";
export function useAccountMode() {
  const mode = useContext(AccountModeContext);
  if (!mode) throw new Error("AccountModeProvider is required");
  return mode;
}
