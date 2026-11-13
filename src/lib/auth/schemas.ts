import { z } from "zod";
import { themeSlugs } from "@/lib/themes/registry";
import { upgradeThemeNames } from "@/lib/repo/upgradeThemes";

export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/);
export const passwordSchema = z.string().min(8).max(64);
export const loginSchema = z.object({ username: usernameSchema, password: z.string().min(1).max(64) }).strict();
export const registrationSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)), username: usernameSchema, password: passwordSchema,
}).strict();
export const registrationFormSchema = registrationSchema.extend({ confirmPassword: z.string() })
  .refine(value => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords must match" });
export type RegistrationField = keyof z.infer<typeof registrationFormSchema>;
export type RegistrationErrors = Partial<Record<RegistrationField, import("@/translations").TranslationKey>>;
export function registrationErrors(error: z.ZodError): RegistrationErrors {
  const messages = {
    firstName: "register.firstNameInvalid", lastName: "register.lastNameInvalid", email: "register.emailInvalid",
    username: "register.usernameInvalid", password: "register.passwordInvalid", confirmPassword: "register.passwordMismatch",
  } as const;
  return Object.fromEntries(error.issues.flatMap(issue => {
    const field = String(issue.path[0]);
    return field in messages ? [[field, messages[field as RegistrationField]]] : [];
  }));
}
export const profileSchema = z.preprocess(upgradeThemeNames, z.object({
  id: z.uuid(), username: usernameSchema, first_name: z.string(), last_name: z.string(),
  selected_theme: z.enum(themeSlugs), show_streak: z.boolean(),
  display_name: z.string().default(""), timezone: z.string().default("UTC"),
  reduce_motion: z.boolean().default(false), onboarding_complete: z.boolean().default(false),
}));
export type AuthProfile = z.infer<typeof profileSchema>;
export const magicLinkSchema = z.string().trim().max(254).pipe(z.email());
export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  timezone: z.string().refine(value => { try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; } }),
  selectedTheme: z.enum(themeSlugs),
  showStreak: z.boolean(), reduceMotion: z.boolean(),
}).strict();
export type OnboardingInput = z.infer<typeof onboardingSchema>;
