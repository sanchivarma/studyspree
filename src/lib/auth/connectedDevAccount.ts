import "server-only";
import { getPublicAuthConfig } from "./publicConfig";

/** Explicit local opt-in; production and remote Supabase never use this. */
export function connectedDevAccountEmail(): string | null {
  if (process.env.NODE_ENV !== "development" || process.env.DEV_ADMIN_USE_SUPABASE !== "true") return null;
  const config = getPublicAuthConfig();
  const username = process.env.DEV_ADMIN_USERNAME;
  if (!config || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(config.url).hostname) || !username || !/^[a-z0-9_]{3,30}$/.test(username)) return null;
  return `${username}@local.studyspree.test`;
}
