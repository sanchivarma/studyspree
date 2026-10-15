import "server-only";
import { getPublicAuthConfig } from "./publicConfig";

export function getAuthConfig() {
  return getPublicAuthConfig();
}

export function isLocalAuth() {
  const config = getAuthConfig();
  return config ? ["localhost", "127.0.0.1", "[::1]"].includes(new URL(config.url).hostname) : process.env.NODE_ENV === "development";
}

export function getSiteUrl() {
  const configured = process.env.SITE_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  throw new Error("SITE_URL is required");
}
