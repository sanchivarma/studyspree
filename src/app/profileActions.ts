"use server";

import { z } from "zod";
import { ProfileAccessError, serverProfileRepository as directory } from "@/lib/profiles/serverRepository";
import { mediaKindSchema, profileEditSchema, usernameSchema } from "@/lib/profiles/schemas";

async function result<T>(operation: () => Promise<T>) {
  try { return { ok: true as const, value: await operation() }; }
  catch (error) { return { ok: false as const, code: error instanceof ProfileAccessError ? error.code : "unavailable" as const }; }
}
export async function readOwnProfile() {
  return result(async () => await directory.isLocal() ? null : directory.getOwn());
}
export async function editOwnProfile(input: unknown) {
  return result(async () => {
    const parsed = profileEditSchema.safeParse(input);
    if (!parsed.success) throw new ProfileAccessError("invalid");
    return await directory.isLocal() ? null : directory.update(parsed.data);
  });
}
export async function readPublicProfile(username: string) {
  return result(async () => {
    if (!usernameSchema.safeParse(username).success) return null;
    return await directory.isLocal() ? null : directory.getPublic(username);
  });
}
export async function setProfileFollow(input: unknown) {
  return result(async () => {
    const parsed = z.object({ username: usernameSchema, following: z.boolean() }).strict().safeParse(input);
    if (!parsed.success) throw new ProfileAccessError("invalid");
    if (await directory.isLocal()) throw new ProfileAccessError("unavailable");
    return directory.follow(parsed.data.username, parsed.data.following);
  });
}
export async function uploadProfileImage(form: FormData) {
  return result(async () => {
    if ([...form.keys()].some(key => !["kind", "file"].includes(key)) || form.getAll("file").length !== 1 || form.getAll("kind").length !== 1) throw new ProfileAccessError("invalid");
    const kind = mediaKindSchema.safeParse(form.get("kind"));
    const file = form.get("file");
    if (!kind.success || !(file instanceof File)) throw new ProfileAccessError("invalid");
    if (await directory.isLocal()) throw new ProfileAccessError("unavailable");
    return directory.upload(kind.data, file);
  });
}
