"use server";

import { z } from "zod";
import { authRepository } from "@/lib/repo/authRepository";
import type { AuthResult } from "@/lib/auth/types";

const operationSchema = z.enum(["login", "register", "reset", "updatePassword", "logout", "google", "facebook"]);

export async function authenticate(operation: unknown, input: unknown): Promise<AuthResult> {
  const parsed = operationSchema.safeParse(operation);
  if (!parsed.success) return { status: "error", message: "common.invalidFields" };
  try { return await authRepository.execute(parsed.data, input); }
  catch { return { status: "error", message: "common.authError" }; }
}
