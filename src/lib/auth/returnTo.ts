export const authReturnCookie = "ss_auth_return";

/** Restrict post-auth navigation to application pages, including shared links. */
export function safeAuthReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value, "https://studyspree.invalid");
    const allowed = /^\/(?:study|stats|settings|calendar|contacts|profile|spaces|buddies|groups|conversations|schedule|leaderboards|partners|feed)?$/.test(url.pathname)
      || /^\/(?:rooms|session|conversations|groups|feed)\/[a-f0-9-]{36}(?:\/complete)?$/.test(url.pathname)
      || /^\/invite\/[a-zA-Z0-9_-]{16,256}$/.test(url.pathname);
    return url.origin === "https://studyspree.invalid" && allowed ? url.pathname + url.search : null;
  } catch { return null; }
}
