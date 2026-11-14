"use client";

import { useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { executeAuth } from "@/lib/repo/authTransport";
import type { AuthOperation, AuthResult } from "@/lib/auth/types";
import { AuthFeedbackContext } from "@/components/auth/AuthFeedbackProvider";
import { useQueryClient } from "@tanstack/react-query";

// Load the next screen's code while the user enters credentials. Fetch no
// account data until the server has authenticated the new session.
let dashboardCode: Promise<unknown> | undefined;
function prepareLogin() {
  dashboardCode ??= Promise.all([
    import("@/components/start/HomeScreen"),
    import("@/components/layout/AppNav"),
  ]).catch(() => { dashboardCode = undefined; });
}

export function useAuth() {
  const router = useRouter();
  const client = useQueryClient();
  const feedbackContext = useContext(AuthFeedbackContext);
  if (!feedbackContext) throw new Error("AuthFeedbackProvider is required");
  const report = feedbackContext;
  const activeRequest = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  async function execute(operation: AuthOperation, input?: unknown) {
    if (activeRequest.current) return;
    activeRequest.current = true;
    setIsPending(true);
    setResult(null);
    const showFeedback = operation === "login" || operation === "magicLink" || operation === "logout";
    report(showFeedback ? { status: "pending", message: "common.working" } : null);
    try {
      const response = await executeAuth(operation, input);
      setResult(response);
      if (showFeedback) report(operation === "logout" && response.status === "success" ? null : { status: response.status, message: response.message ?? (response.status === "success" ? "login.success" : "common.authError") });
      if (response.status === "success" && response.navigate && operation !== "register") {
        client.clear(); // Account changes must never retain another user's query data.
        if (operation === "logout") window.location.replace(response.navigate);
        else if (response.external) window.location.assign(response.navigate);
        else router.push(response.navigate);
      }
      return response;
    } catch {
      const errorResponse: AuthResult = { status: "error", message: operation === "register" ? "register.networkError" : "common.authError" };
      setResult(errorResponse);
      if (showFeedback) report({ status: "error", message: "common.authError" });
      return errorResponse;
    }
    finally { activeRequest.current = false; setIsPending(false); }
  }

  return { execute, prepareLogin, isPending, result, clearResult: () => { setResult(null); report(null); } };
}
