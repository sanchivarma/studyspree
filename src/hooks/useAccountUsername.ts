"use client";

import { useContext } from "react";
import { AccountUsernameContext } from "@/components/layout/AccountModeProvider";

export function useAccountUsername() {
  return useContext(AccountUsernameContext);
}
