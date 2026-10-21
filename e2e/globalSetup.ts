import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { FullConfig } from "@playwright/test";

/** Build development routes before browser deadlines begin. Every browser
 * context still starts cold, without cookies, study data or cached bundles. */
export default async function globalSetup(config: FullConfig) {
  const base = new URL(String(config.projects[0].use.baseURL ?? "http://localhost:3000"));
  if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) return;
  const environment = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const value = (key: string) => environment.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1].trim().replace(/^["']|["']$/g, "") ?? "";
  const username = value("DEV_ADMIN_USERNAME"), secret = value("DEV_ADMIN_SESSION_SECRET");
  const payload = Buffer.from(JSON.stringify({ id: randomUUID(), username, expiresAt: Date.now() + 600000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  const headers = username && secret.length >= 32 ? { Cookie: `ss_dev_admin=${payload}.${signature}` } : undefined;
  for (const path of ["/login", "/", "/study", "/session/verification-warmup", "/session/verification-warmup/complete", "/settings", "/stats"]) {
    const response = await fetch(new URL(path, base), { headers, redirect: "follow", signal: AbortSignal.timeout(120000) });
    await response.arrayBuffer();
    if (!response.ok) throw new Error(`Verification route could not start: ${path} (${response.status})`);
  }
}
