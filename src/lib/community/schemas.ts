import { z } from "zod";
const id = z.uuid();
const title = z.string().trim().min(1).max(100);
const body = z.string().trim().min(1).max(4000);
export const areas = ["tasks", "notifications", "feedback", "groups", "spaces", "room", "buddies", "conversations", "messages", "feed", "schedule", "partners", "search", "recipients", "plans", "preferences", "awards", "leaderboards"] as const;
export const areaSchema = z.enum(areas);
export type CommunityArea = z.infer<typeof areaSchema>;
export const communityQuerySchema = z.object({ id: id.optional(), groupId: id.optional(), q: z.string().trim().max(100).optional(), filter: z.string().max(30).optional(), cursor: z.string().max(2048).nullable().optional(), date: z.iso.date().optional(), from: z.iso.datetime({ offset: true }).optional(), to: z.iso.datetime({ offset: true }).optional(), metric: z.enum(["time", "streak"]).optional(), period: z.enum(["week", "all"]).optional() }).strict();
export type CommunityQuery = z.infer<typeof communityQuerySchema>;
export const attachmentSchema = z.object({ path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp|gif|mp3|webm|ogg|pdf)$/), name: z.string().min(1).max(100), mime: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif", "audio/mpeg", "audio/webm", "audio/ogg", "application/pdf"]), size: z.number().int().min(1).max(10485760) }).strict();
export type Attachment = z.infer<typeof attachmentSchema>;
const command = <T extends string, S extends z.ZodRawShape>(action: T, data: S) => z.object({ action: z.literal(action), data: z.object(data).strict() }).strict();
const member = { id, targetId: id };
const toggle = { id, value: z.boolean() };
export const communityCommandSchema = z.discriminatedUnion("action", [
    command("room.kick",{id,targetId:id}),
    command("task.create", { title: z.string().trim().min(1).max(300), date: z.iso.date() }), command("task.update", { id, done: z.boolean() }), command("task.delete", { id }),
    command("notification.read", { id: id.optional() }), command("feedback.create", { kind: z.enum(["issue", "idea"]), body }),
    command("preferences", { allowMessages: z.boolean().optional(), leaderboardOptIn: z.boolean().optional() }),
    command("block.set", { targetId: id, value: z.boolean() }), command("report.create", { kind: z.enum(["person", "post", "message", "buddy", "room", "group"]), targetId: id, reason: z.string().trim().min(1).max(1000) }),
    command("group.create", { title, body: z.string().trim().max(2000), private: z.boolean() }), command("group.update", { id, title, body: z.string().trim().max(2000) }), command("group.join", { id }), command("group.leave", { id }), command("group.approve", member), command("group.remove", member), command("group.transfer", member), command("group.role", { ...member, role: z.enum(["member", "moderator"]) }),
    command("room.create", { title, body: z.string().trim().max(1000), category: z.enum(["pomodoro", "deep", "chill", "cram"]), private: z.boolean(), capacity: z.number().int().min(1).max(1000), groupId: id.optional() }), command("room.update", { id, title, body: z.string().trim().max(1000), capacity: z.number().int().min(1).max(1000) }),
    command("room.join", { id }), command("room.heartbeat", { id }), command("room.leave", { id }), command("room.share", toggle), command("room.status", { id, body: z.string().trim().max(200) }),
    command("room.pin", { ...toggle, targetId: id, reason: z.string().trim().max(200).optional() }), command("room.invite", { id, uses: z.number().int().min(1).max(1000), hours: z.number().int().min(1).max(168) }), command("room.accept", { token: z.string().regex(/^[a-f0-9]{64}$/) }),
    command("partner.set", { targetId: id, favorite: z.boolean(), notify: z.boolean() }),
    command("buddy.save", { title, body, subjects: z.array(z.string().trim().min(1).max(40)).max(10), published: z.boolean() }), command("buddy.remove", {}),
    command("thread.direct", { targetId: id }), command("thread.create", { title, members: z.array(id).min(1).max(49).refine(values => new Set(values).size === values.length) }), command("thread.leave", { id }),
    command("message.send", { id, body, clientId: id, parentId: id.optional() }), command("message.edit", { id, body }), command("message.remove", { id }), command("message.save", toggle),
    command("post.create", { body, groupId: id.optional(), parentId: id.optional(), attachments: z.array(attachmentSchema).max(4).optional() }), command("post.edit", { id, body }), command("post.remove", { id }), command("post.react", { id, emoji: z.enum(["heart", "support", "celebrate"]).nullable() }), command("post.save", toggle),
    command("event.create", { title, startsAt: z.iso.datetime({ offset: true }), minutes: z.union([z.literal(30), z.literal(60)]), capacity: z.number().int().min(1).max(1000), groupId: id.optional() }), command("event.book", { id }), command("event.unbook", { id }), command("event.cancel", { id }),
]);
export type CommunityCommand = z.infer<typeof communityCommandSchema>;
export const personSchema = z.object({ id, username: z.string(), displayName: z.string(), avatarPath: z.string().nullable() });
export const itemSchema = z.object({ id, title: z.string(), body: z.string(), createdAt: z.iso.datetime({ offset: true }), ownerId: id.nullable(), person: personSchema.nullable(), data: z.record(z.string(), z.json()) });
export type CommunityItem = z.infer<typeof itemSchema>;
export const communityStateSchema = z.object({ items: z.array(itemSchema), resource: itemSchema.nullable(), context: z.record(z.string(), z.json()), viewerId: id, available: z.boolean(), nextCursor: z.string().nullable() });
export type CommunityState = z.infer<typeof communityStateSchema>;
export const mutationResultSchema = z.object({ id, token: z.string().optional() });
export const communityRequestSchema = z.discriminatedUnion("operation", [
    z.object({ operation: z.literal("read"), area: areaSchema, query: communityQuerySchema }).strict(),
    z.object({ operation: z.literal("mutate"), command: communityCommandSchema }).strict(),
]);
