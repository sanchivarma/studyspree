"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicAuthConfig } from "./publicConfig";

export function createBrowserAuthClient() {
  const config = getPublicAuthConfig();
  if (!config) throw new Error("Supabase is not configured");
  return createBrowserClient(config.url, config.key);
}
