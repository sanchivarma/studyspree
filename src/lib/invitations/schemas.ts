import { z } from "zod";
import { locales } from "@/translations";
export const invitationRequestSchema = z.object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()), locale: z.enum(locales), requestId: z.uuid() }).strict();
export type InvitationRequest = z.infer<typeof invitationRequestSchema>;
export const invitationResultSchema = z.object({ delivery: z.enum(["sent", "captured"]) }).strict();
export const invitationErrorSchema = z.enum(["unauthorized", "invalid", "notConfigured", "rateLimited", "duplicate", "unavailable"]);
export type InvitationErrorCode = z.infer<typeof invitationErrorSchema>;
