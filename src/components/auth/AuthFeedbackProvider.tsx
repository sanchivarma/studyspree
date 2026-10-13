"use client";

import { createContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import { CircleAlert, CircleCheck, Clock3, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/translations";

type Feedback = { status: "pending" | "error" | "success"; message: TranslationKey };

export const AuthFeedbackContext = createContext<Dispatch<SetStateAction<Feedback | null>> | null>(null);

export function AuthFeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const pathname = usePathname();
  const { t } = useTranslation();
  const Icon = feedback?.status === "error" ? CircleAlert : feedback?.status === "success" ? CircleCheck : Clock3;

  return <AuthFeedbackContext.Provider value={setFeedback}>
    {children}
    {feedback && !pathname.startsWith("/session") && <div
      data-testid="auth-feedback"
      className={cn("fixed right-4 bottom-20 left-4 z-50 flex items-start gap-3 rounded-2xl border bg-surface p-4 text-body text-foreground shadow-xl md:left-auto md:w-[400px] md:bottom-6",
        feedback.status === "error" ? "border-destructive/60" : feedback.status === "success" ? "border-success/60" : "border-border")}
    >
      <Icon aria-hidden="true" className={cn("mt-1 size-5 shrink-0", feedback.status === "error" ? "text-destructive" : feedback.status === "success" ? "text-success" : "text-accent")} />
      <p key={`${feedback.status}:${feedback.message}`} role={feedback.status === "error" ? "alert" : "status"} aria-atomic="true" className="flex-1 py-1">{t(feedback.message)}</p>
      {feedback.status !== "pending" && <button type="button" aria-label={t("common.dismiss")} onClick={() => setFeedback(null)} className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-xl text-text-muted hover:text-foreground">
        <X aria-hidden="true" className="size-4" />
      </button>}
    </div>}
  </AuthFeedbackContext.Provider>;
}
