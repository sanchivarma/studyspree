import { z } from "zod";
export const tileSchema = z.object({
    mirrored: z.boolean().default(true), isVisible: z.boolean().default(true),
    status: z.string().trim().max(200).default(""),
    history: z.array(z.object({ text: z.string().max(200), createdAt: z.iso.datetime() }).strict()).max(20).default([]),
}).strict();
export const tilePatchSchema = z.object({ mirrored: z.boolean().optional(), isVisible: z.boolean().optional(), status: z.string().trim().max(200).optional() }).strict();
export type PersonalTile = z.infer<typeof tileSchema>;
export type TilePatch = z.infer<typeof tilePatchSchema>;
