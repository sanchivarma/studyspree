/** Next's internal URL can use localhost even when the browser uses the LAN host. */
export function requestOrigin(request: Request): string {
  const target = new URL(request.url);
  const host = request.headers.get("host") ?? target.host;
  const expected = new URL(`${target.protocol}//${host}`);
  if (expected.host !== host) throw new Error("Invalid request host");
  return expected.origin;
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === requestOrigin(request);
  } catch { return false; }
}
