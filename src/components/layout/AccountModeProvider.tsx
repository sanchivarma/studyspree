"use client";
import { createContext, type ReactNode } from "react";
export type AccountMode = "preview" | "account";
export const AccountModeContext = createContext<AccountMode | null>(null);
export function AccountModeProvider({ mode, children }: { mode: AccountMode; children: ReactNode }) {
  return <AccountModeContext.Provider value={mode}>{children}</AccountModeContext.Provider>;
}
