import "server-only";
import { z } from "zod";
import { getAuthConfig, getSiteUrl } from "@/lib/auth/config";
import { createAuthClient } from "@/lib/auth/server";
import { loginSchema, passwordSchema, profileSchema, registrationSchema } from "@/lib/auth/schemas";
import type { AuthProfile } from "@/lib/auth/schemas";
import type { AuthOperation, AuthResult } from "@/lib/auth/types";
import { getDevAdminProfile, loginDevAdmin, clearDevAdminSession } from "@/lib/auth/devAdmin";

export interface AuthRepository {
  getProfile(): Promise<AuthProfile | null>;
  execute(operation: AuthOperation, input: unknown): Promise<AuthResult>;
}

export const authRepository: AuthRepository = {
  async getProfile() {
    const preview = await getDevAdminProfile();
    if (preview) return preview;
    if (!getAuthConfig()) return null;
    const client = await createAuthClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return null;
    const profile = await client.from("profiles").select("id,username,first_name,last_name,selected_character,show_streak").eq("id", data.user.id).single();
    const parsed = profileSchema.safeParse(profile.data);
    return parsed.success ? parsed.data : null;
  },

  async execute(operation, input) {
    if (operation === "login") {
      const preview = await loginDevAdmin(input);
      if (preview) return preview;
    }
    if (operation === "logout" && await clearDevAdminSession()) return { status: "success", navigate: "/" };
    if (!getAuthConfig()) return { status: "error", message: "common.authUnavailable" };
    const client = await createAuthClient();
    switch (operation) {
      case "login": {
        const parsed = loginSchema.safeParse(input);
        if (!parsed.success) return { status: "error", message: "common.invalidFields" };
        const secret = process.env.SUPABASE_USERNAME_LOOKUP_SECRET;
        if (!secret) return { status: "error", message: "common.authUnavailable" };
        const lookup = await client.rpc("lookup_login_email", { p_username: parsed.data.username, p_lookup_secret: secret });
        if (lookup.error) return { status: "error", message: "common.authError" };
        // Unknown usernames receive the same auth attempt and response as bad passwords.
        const email = z.email().safeParse(lookup.data);
        const result = await client.auth.signInWithPassword({ email: email.success ? email.data : "unknown@invalid.example", password: parsed.data.password });
        return result.error ? { status: "error", message: "common.authError" } : { status: "success", navigate: "/home" };
      }
      case "register": {
        const parsed = registrationSchema.safeParse(input);
        if (!parsed.success) return { status: "error", message: "common.invalidFields" };
        const { firstName, lastName, email, username, password } = parsed.data;
        const result = await client.auth.signUp({ email, password, options: {
          data: { first_name: firstName, last_name: lastName, username },
          emailRedirectTo: `${getSiteUrl()}/auth/callback`,
        } });
        if (result.error) return { status: "error", message: "common.authError" };
        return result.data.session ? { status: "success", navigate: "/home" } : { status: "success", message: "register.checkEmail" };
      }
      case "google":
      case "facebook": {
        const result = await client.auth.signInWithOAuth({ provider: operation, options: { redirectTo: `${getSiteUrl()}/auth/callback` } });
        return result.error || !result.data.url ? { status: "error", message: "common.authError" } : { status: "success", navigate: result.data.url, external: true };
      }
      case "reset": {
        const email = z.email().max(254).safeParse(input);
        if (!email.success) return { status: "error", message: "common.invalidFields" };
        const result = await client.auth.resetPasswordForEmail(email.data, { redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password` });
        return result.error ? { status: "error", message: "common.authError" } : { status: "success", message: "recovery.sent" };
      }
      case "updatePassword": {
        const password = passwordSchema.safeParse(input);
        if (!password.success) return { status: "error", message: "common.invalidFields" };
        const identity = await client.auth.getUser();
        if (identity.error || !identity.data.user) return { status: "error", message: "common.authError" };
        const result = await client.auth.updateUser({ password: password.data });
        return result.error ? { status: "error", message: "common.authError" } : { status: "success", message: "recovery.saved", navigate: "/home" };
      }
      case "logout": {
        const result = await client.auth.signOut();
        return result.error ? { status: "error", message: "common.authError" } : { status: "success", navigate: "/" };
      }
      default: {
        const exhaustive: never = operation;
        throw new Error(`Unsupported auth operation: ${exhaustive}`);
      }
    }
  },
};
