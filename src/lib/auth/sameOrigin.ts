/** Next's internal URL can use localhost even when the browser uses the LAN host. */
export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const target = new URL(request.url);
    const host = request.headers.get("host") ?? target.host;
    const expected = new URL(`${target.protocol}//${host}`);
    return expected.host === host && origin === expected.origin;
  } catch { return false; }
}
