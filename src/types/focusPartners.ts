import { z } from "zod";
export const characterHistorySchema = z.array(z.object({ slug: z.string(), totalSeconds: z.number().nonnegative(), sessionCount: z.number().int().nonnegative() }));
export type CharacterHistory = z.infer<typeof characterHistorySchema>;
