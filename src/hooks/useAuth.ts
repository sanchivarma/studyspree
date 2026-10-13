"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authenticate } from "@/app/(auth)/actions";
import type { AuthOperation, AuthResult } from "@/lib/auth/types";

export function useAuth() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<AuthResult | null>(null);

  async function execute(operation: AuthOperation, input?: unknown) {
    if (isPending) return;
    setIsPending(true);
    setResult(null);
    try {
      const response = await authenticate(operation, input);
      setResult(response);
      if (response.status === "success" && response.navigate) {
        if (response.external) window.location.assign(response.navigate);
        else { router.push(response.navigate); router.refresh(); }
      }
    } catch { setResult({ status: "error", message: "common.authError" }); }
    finally { setIsPending(false); }
  }

  return { execute, isPending, result, clearResult: () => setResult(null) };
}
