import "server-only";
import { z } from "zod";
import { authRepository } from "@/lib/repo/authRepository";
import { hasSameOrigin } from "./sameOrigin";
import { now } from "@/lib/clock";
import type { AuthOperation, AuthResult } from "./types";

const limited = new Map<string, { count: number; until: number }>();

export function authEndpoint(operation: AuthOperation) {
  return async (request: Request) => {
    const started = performance.now();
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    function respond(result: AuthResult, status: number) {
      headers.set("Server-Timing", `auth;dur=${(performance.now() - started).toFixed(1)}`);
      return Response.json(result, { status, headers });
    }
    if (!hasSameOrigin(request)) return respond({ status: "error", message: "common.authError" }, 403);
    // Supabase enforces durable auth limits too. This bounds repeated public API lookups.
    const timestamp = now().getTime();
    const key = `${operation}:${request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local"}`;
    for (const [entry, value] of limited) if (value.until <= timestamp) limited.delete(entry);
    const bucket = limited.get(key) ?? { count: 0, until: timestamp + 60000 };
    if (bucket.count >= 30) { headers.set("Retry-After", "60"); return respond({ status: "error", message: "register.rateLimited" }, 429); }
    bucket.count++; limited.set(key, bucket);
    try {
      if (!request.headers.get("content-type")?.includes("application/json")) throw new SyntaxError();
      const body = await request.text();
      if (body.length > 4096) throw new SyntaxError();
      const result = await authRepository.execute(operation, JSON.parse(body));
      const status = result.status === "success" ? 200 : result.fieldErrors ? 422 : result.message === "login.invalidCredentials" ? 401 : result.message === "common.invalidFields" ? 400 : result.message === "register.rateLimited" ? 429 : 503;
      return respond(result, status);
    } catch (error) {
      return respond({ status: "error", message: error instanceof SyntaxError || error instanceof z.ZodError ? "common.invalidFields" : "common.authError" }, error instanceof SyntaxError || error instanceof z.ZodError ? 400 : 503);
    }
  };
}
