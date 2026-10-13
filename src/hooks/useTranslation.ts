"use client";

import { useContext } from "react";
import { LanguageContext } from "@/components/layout/LanguageProvider";

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}
