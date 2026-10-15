import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/auth/server";
import { getAuthConfig } from "@/lib/auth/config";
import { authenticatedDestination } from "@/lib/auth/destination";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (getAuthConfig() && code) {
    const client = await createAuthClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = request.nextUrl.searchParams.get("next") === "/reset-password" ? "/reset-password" : await authenticatedDestination();
      return NextResponse.redirect(new URL(next, request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?authError=1", request.url));
}
