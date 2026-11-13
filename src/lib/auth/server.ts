import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAuthConfig } from "./config";
import type { Database } from "@/types/database";

export async function createAuthClient() {
  const config = getAuthConfig();
  if (!config) throw new Error("Supabase is not configured");
  const cookieStore = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(8000) }) },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot write cookies. Middleware handles refresh. */ }
      },
    },
  });
}
