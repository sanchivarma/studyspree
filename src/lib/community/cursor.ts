import { z } from "zod";
export const communityCursorSchema = z.object({ snapshotAt: z.iso.datetime({ offset: true }), fingerprint: z.string().regex(/^[a-f0-9]{32}$/), at: z.iso.datetime({ offset: true }), id: z.uuid(), score: z.number().int() }).strict();
export function validateCommunityCursor(cursor: string) { return communityCursorSchema.parse(JSON.parse(cursor)); }
