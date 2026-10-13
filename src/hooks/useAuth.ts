"use client";

import { useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticate } from "@/app/(auth)/actions";
import type { AuthOperation, AuthResult } from "@/lib/auth/types";
import { AuthFeedbackContext } from "@/components/auth/AuthFeedbackProvider";

export function useAuth() {
  const router = useRouter();
  const report = useContext(AuthFeedbackContext);
  if (!report) throw new Error("AuthFeedbackProvider is required");
  const activeRequest = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  async function execute(operation: AuthOperation, input?: unknown) {
    if (activeRequest.current) return;
    activeRequest.current = true;
    setIsPending(true);
    setResult(null);
    report(operation === "login" ? { status: "pending", message: "common.working" } : null);
    try {
      const response = await authenticate(operation, input);
      setResult(response);
      if (operation === "login") report({ status: response.status, message: response.message ?? (response.status === "success" ? "login.success" : "common.authError") });
      if (response.status === "success" && response.navigate) {
        if (response.external) window.location.assign(response.navigate);
        else { router.push(response.navigate); router.refresh(); }
      }
    } catch {
      setResult({ status: "error", message: "common.authError" });
      if (operation === "login") report({ status: "error", message: "common.authError" });
    }
    finally { activeRequest.current = false; setIsPending(false); }
  }

  return { execute, isPending, result, clearResult: () => { setResult(null); report(null); } };
}
