import { NextResponse } from "next/server";
import { connectedDevAccountEmail } from "@/lib/auth/connectedDevAccount";
import { getDevAdminProfile, loginDevAdmin } from "@/lib/auth/devAdmin";
import { safeAuthReturnTo } from "@/lib/auth/returnTo";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!connectedDevAccountEmail() || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return new Response(null, { status: 404 });
  const preview = await getDevAdminProfile();
  if (!preview) return NextResponse.redirect(new URL("/login", url));
  const result = await loginDevAdmin({ username: preview.username, password: process.env.DEV_ADMIN_PASSWORD });
  if (result?.status !== "success") return Response.json({ error: "unavailable" }, { status: 503 });
  const next = safeAuthReturnTo(url.searchParams.get("next")) ?? "/";
  const response = NextResponse.redirect(new URL(result.navigate === "/onboarding" ? "/onboarding" : next, url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
