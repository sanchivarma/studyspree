import "server-only";

export function getAuthConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export function getSiteUrl() {
  const configured = process.env.SITE_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  throw new Error("SITE_URL is required");
}
