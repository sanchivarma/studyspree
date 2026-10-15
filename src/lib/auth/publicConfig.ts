import { z } from "zod";

const httpUrl = z.url().refine(value => ["http:", "https:"].includes(new URL(value).protocol));
export function parsePublicAuthConfig(url: string | undefined, key: string | undefined) {
  if (!url && !key) return null; // Offline preview is deliberately supported.
  const parsed = z.object({ url: httpUrl, key: z.string().trim().min(1) }).safeParse({ url, key });
  if (!parsed.success) throw new Error("Set a valid Supabase URL and public key together.");
  if (parsed.data.key.startsWith("sb_secret_")) throw new Error("A server secret cannot be used as the Supabase public key.");
  if (parsed.data.key.split(".").length === 3) {
    try {
      const payload: unknown = JSON.parse(atob(parsed.data.key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
      if (z.object({ role: z.literal("service_role") }).safeParse(payload).success) throw new Error("Server key in public configuration");
    } catch { throw new Error("Use a Supabase publishable or anon key for public configuration."); }
  }
  return parsed.data;
}
export function getPublicAuthConfig() {
  return parsePublicAuthConfig(process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
