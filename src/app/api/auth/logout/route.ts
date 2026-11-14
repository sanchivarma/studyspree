import { authEndpoint } from "@/lib/auth/api";
export const runtime = "nodejs";
export const POST = authEndpoint("logout");
