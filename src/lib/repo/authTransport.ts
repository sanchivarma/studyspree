import type { AuthOperation, AuthResult } from "@/lib/auth/types";
import { authenticate } from "@/app/(auth)/actions";

async function post(path: string, input: unknown): Promise<AuthResult> {
  const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store", signal: AbortSignal.timeout(15000) });
  return await response.json() as AuthResult;
}

export async function executeAuth(operation: AuthOperation, input?: unknown): Promise<AuthResult> {
  if (operation === "register") {
    const username = typeof input === "object" && input !== null && "username" in input ? input.username : undefined;
    const available = await post("/api/auth/username", { username });
    if (available.status === "error") return available;
    return post("/api/auth/register", input);
  }
  if (operation === "login") return post("/api/auth/login", input);
  if (operation === "logout") return post("/api/auth/logout", {});
  return authenticate(operation, input);
}
