import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { now } from "@/lib/clock";
import { loginSchema, usernameSchema, profileSchema, type AuthProfile } from "./schemas";
import type { AuthResult } from "./types";

const COOKIE_NAME = "ss_dev_admin";
const sessionSchema = z.object({ id: z.uuid(), username: usernameSchema, expiresAt: z.number().finite() }).strict();

function getConfig() {
  // This check is mandatory: development credentials never authenticate in production.
  if (process.env.NODE_ENV !== "development") return null;
  const username = usernameSchema.safeParse(process.env.DEV_ADMIN_USERNAME);
  const password = process.env.DEV_ADMIN_PASSWORD;
  const secret = process.env.DEV_ADMIN_SESSION_SECRET;
  return username.success && password && secret && secret.length >= 32 ? { username: username.data, password, secret } : null;
}

export function hasDevAdmin() { return Boolean(getConfig()); }

function matches(left: string, right: string) {
  return timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}

export async function loginDevAdmin(input: unknown): Promise<AuthResult | null> {
  const config = getConfig();
  const parsed = loginSchema.safeParse(input);
  if (!config || !parsed.success || !matches(parsed.data.username, config.username)) return null;
  if (!matches(parsed.data.password, config.password)) return { status: "error", message: "login.invalidCredentials" };
  const payload = Buffer.from(JSON.stringify({ id: randomUUID(), username: config.username, expiresAt: now().getTime() + 86400000 })).toString("base64url");
  const signature = createHmac("sha256", config.secret).update(payload).digest("base64url");
  (await cookies()).set(COOKIE_NAME, `${payload}.${signature}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400 });
  return { status: "success", navigate: "/" };
}

export async function getDevAdminProfile(): Promise<AuthProfile | null> {
  const config = getConfig();
  if (!config) return null;
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || parts[0].length > 2048) return null;
  const [payload, signature] = parts;
  const expected = createHmac("sha256", config.secret).update(payload).digest("base64url");
  if (!matches(signature, expected)) return null;
  try {
    const session = sessionSchema.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    if (!session.success || session.data.expiresAt <= now().getTime() || session.data.username !== config.username) return null;
    return profileSchema.parse({ id: session.data.id, username: session.data.username, first_name: "", last_name: "", selected_theme: "rain-desk", show_streak: false, onboarding_complete: true });
  } catch { return null; }
}

export async function clearDevAdminSession() {
  if (process.env.NODE_ENV !== "development") return false;
  const cookieStore = await cookies();
  const exists = Boolean(cookieStore.get(COOKIE_NAME));
  cookieStore.delete(COOKIE_NAME);
  return exists;
}
