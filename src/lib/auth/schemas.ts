import { z } from "zod";

export const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,30}$/);
export const passwordSchema = z.string().min(8).max(64);
export const loginSchema = z.object({ username: usernameSchema, password: z.string().min(1).max(64) }).strict();
export const registrationSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.email().max(254), username: usernameSchema, password: passwordSchema,
}).strict();
export const profileSchema = z.object({
  id: z.uuid(), username: usernameSchema, first_name: z.string(), last_name: z.string(),
  selected_character: z.enum(["rain-desk", "night-shift", "balcony-dusk", "dorm-bunk"]), show_streak: z.boolean(),
});
export type AuthProfile = z.infer<typeof profileSchema>;
