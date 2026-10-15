"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicAuthConfig } from "./publicConfig";
import type { Database } from "@/types/database";

export function createBrowserAuthClient() {
  const config = getPublicAuthConfig();
  if (!config) throw new Error("Supabase is not configured");
  return createBrowserClient<Database>(config.url, config.key);
}
