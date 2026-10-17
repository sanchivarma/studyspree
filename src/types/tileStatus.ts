import { z } from "zod";
export const tileStatusSchema = z.object({ id: z.string(), text: z.string().max(200), createdAt: z.iso.datetime({ offset: true }) });
export const tileHistorySchema = z.object({ items: z.array(tileStatusSchema), nextCursor: z.string().nullable() });
export type TileStatus = z.infer<typeof tileStatusSchema>;
export type TileHistoryPage = z.infer<typeof tileHistorySchema>;
