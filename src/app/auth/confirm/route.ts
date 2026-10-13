import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAuthClient } from "@/lib/auth/server";
import { getAuthConfig } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = z.enum(["signup", "email", "recovery"]).safeParse(request.nextUrl.searchParams.get("type"));
  if (getAuthConfig() && tokenHash && type.success) {
    const client = await createAuthClient();
    const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: type.data });
    if (!error) return NextResponse.redirect(new URL(type.data === "recovery" ? "/reset-password" : "/home", request.url));
  }
  return NextResponse.redirect(new URL("/?authError=1", request.url));
}
