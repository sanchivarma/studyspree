import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicAuthConfig } from "@/lib/auth/publicConfig";
import { authReturnCookie, safeAuthReturnTo } from "@/lib/auth/returnTo";

export async function middleware(request: NextRequest) {
  const authConfig = getPublicAuthConfig();
  let response = NextResponse.next({ request });
  if (!authConfig) return response; // Server page guards still protect offline preview.
  const client = createServerClient(authConfig.url, authConfig.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const identity = await client.auth.getClaims();
  const path = request.nextUrl.pathname;
  const publicPage = path === "/login" || path.startsWith("/auth/") || path === "/reset-password" || path.startsWith("/api/")
    || (process.env.NODE_ENV === "development" && path === "/dev");
  const offlinePreview = process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_LOCAL_REPO !== "false" && request.cookies.has("ss_dev_admin");
  if (!publicPage && !offlinePreview && (identity.error || !identity.data?.claims)) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    const returnTo = safeAuthReturnTo(path + request.nextUrl.search);
    if (returnTo) redirect.cookies.set(authReturnCookie, returnTo, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 1800, secure: process.env.NODE_ENV === "production" });
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|themes/|characters/|audio/).*)"] };
