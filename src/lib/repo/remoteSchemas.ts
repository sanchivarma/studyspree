import { themeSlugs } from "@/lib/themes/registry";
import { z } from "zod";
import { profileSchema } from "./local";
import { companionSchema } from "@/lib/characters/schemas";
import { historyQuerySchema } from "@/lib/stats/history";
import { tilePatchSchema } from "@/lib/personalTile/schemas";
const empty = <T extends string>(op: T) => z.object({ op: z.literal(op) }).strict();
const dates = { from: z.iso.date(), to: z.iso.date() };
// Zod defaults belong to complete reads, never to partial writes.
export const profilePatchSchema = profileSchema.partial().transform((parsed) => parsed);
const profilePatch = z.record(z.string(), z.unknown()).transform((raw, ctx) => {
    const validated = profilePatchSchema.safeParse(raw);
    if (!validated.success) {
        for (const issue of validated.error.issues)
            ctx.addIssue({ ...issue });
        return z.NEVER;
    }
    return Object.fromEntries(Object.entries(validated.data).filter(([key]) => Object.hasOwn(raw, key)));
});
export const repositoryRequestSchema = z.discriminatedUnion("op", [
    empty("profile"), empty("active"), empty("total"), empty("summary"), empty("streak"), empty("awards"), empty("tile"), empty("directory"), empty("dashboard"),
    z.object({ op: z.literal("updateProfile"), patch: profilePatch }).strict(),
    z.object({ op: z.literal("updateDirectory"), input: z.unknown() }).strict(),
    z.object({ op: z.literal("start"), input: z.object({ plannedMinutes: z.union([z.literal(5), z.literal(15), z.literal(25), z.literal(50)]).nullable(), themeSlug: z.enum(themeSlugs), task: z.string().trim().max(500).nullable(), companions: companionSchema.optional() }).strict() }).strict(),
    z.object({ op: z.literal("finish"), id: z.uuid(), reason: z.enum(["completed", "stopped_early", "abandoned"]) }).strict(),
    z.object({ op: z.literal("heartbeat"), id: z.uuid() }).strict(),
    z.object({ op: z.literal("session"), id: z.uuid() }).strict(),
    z.object({ op: z.literal("companions"), id: z.uuid(), companions: companionSchema }).strict(),
    z.object({ op: z.literal("sessions"), limit: z.number().int().min(0).max(1000), offset: z.number().int().min(0).max(1000000) }).strict(),
    z.object({ op: z.literal("history"), query: historyQuerySchema }).strict(),
    z.object({ op: z.literal("days"), ...dates }).strict(),
    z.object({ op: z.literal("updateTile"), patch: tilePatchSchema }).strict(),
]);
export function hasClientDuration(value: unknown): boolean {
    if (!value || typeof value !== "object")
        return false;
    return Object.entries(value).some(([key, item]) => ["actualSeconds", "actual_seconds", "duration", "elapsed"].includes(key) || hasClientDuration(item));
}
export const summarySchema = z.object({ totalSeconds: z.number().nonnegative(), sessionCount: z.number().int().nonnegative(), firstSessionDate: z.iso.date().nullable() });
export const daySchema = z.object({ date: z.iso.date(), totalSeconds: z.number().nonnegative(), sessionCount: z.number().int().nonnegative() });
