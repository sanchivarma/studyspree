"use client";
import { createContext, type ReactNode } from "react";
export type AccountMode = "preview" | "account";
export const AccountModeContext = createContext<AccountMode | null>(null);
export const AccountUsernameContext = createContext<string | undefined>(undefined);
export function AccountModeProvider({ mode, username, children }: { mode: AccountMode; username: string; children: ReactNode }) {
  return <AccountModeContext.Provider value={mode}><AccountUsernameContext.Provider value={username}>{children}</AccountUsernameContext.Provider></AccountModeContext.Provider>;
}
