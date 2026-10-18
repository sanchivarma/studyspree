import { z } from "zod";
import { characterSlugs } from "@/types/characters";

export const patchResources = ["tasks", "groups", "spaces", "rooms", "buddy-listings", "scheduled-sessions"] as const;
export type PatchResource = typeof patchResources[number];
const title = z.string().trim().min(1).max(100);
const shapes = {
  tasks: z.object({ title: z.string().trim().min(1).max(300).optional(), date: z.iso.date().optional(), position: z.number().int().min(0).max(100000).optional(), done: z.boolean().optional() }).strict(),
  groups: z.object({ title: title.optional(), body: z.string().trim().max(2000).optional() }).strict(),
  rooms: z.object({ title: title.optional(), body: z.string().trim().max(1000).optional(), capacity: z.number().int().min(1).max(1000).optional() }).strict(),
  "buddy-listings": z.object({ title: title.optional(), body: z.string().trim().min(1).max(4000).optional(), subjects: z.array(z.string().trim().min(1).max(40)).max(10).optional(), category: z.enum(["student", "professional", "other"]).optional(), timezone: z.string().min(1).max(100).optional(), availability: z.string().trim().max(500).optional(), published: z.boolean().optional() }).strict(),
  "scheduled-sessions": z.object({ title: title.optional(), startsAt: z.iso.datetime({ offset: true }).optional(), endsAt: z.iso.datetime({ offset: true }).optional(), minutes: z.union([z.literal(30), z.literal(60)]).optional(), capacity: z.number().int().min(1).max(1000).optional(), mode: z.enum(["people", "private-characters"]).optional(), timezone: z.string().min(1).max(100).optional(), characterSlugs: z.array(z.enum(characterSlugs)).max(characterSlugs.length).optional() }).strict(),
};

/** Normalize external names without filling absent values: the database locks
 * the owner row and merges the patch atomically with its latest contents. */
export function parseResourcePatch(resource: PatchResource, input: unknown) {
  const patch = { ...z.record(z.string(), z.unknown()).parse(input) };
  const rename = (from: string, to: string) => {
    if (!Object.hasOwn(patch, from)) return;
    if (Object.hasOwn(patch, to)) throw new Error("Conflicting patch fields");
    patch[to] = patch[from]; delete patch[from];
  };
  if (resource === "groups" || resource === "spaces" || resource === "rooms") rename("name", "title");
  if (resource !== "tasks" && resource !== "scheduled-sessions") rename("description", "body");
  if (resource === "tasks") rename("localDate", "date");
  if (resource === "scheduled-sessions") rename("schedulingTimezone", "timezone");
  if (resource === "buddy-listings" && Object.hasOwn(patch, "status")) {
    if (Object.hasOwn(patch, "published")) throw new Error("Conflicting patch fields");
    patch.published = z.enum(["open", "closed"]).parse(patch.status) === "open"; delete patch.status;
  }
  const parsed = shapes[resource === "spaces" ? "rooms" : resource].parse(patch);
  if (!Object.keys(parsed).length) throw new Error("Empty patch");
  return parsed;
}
