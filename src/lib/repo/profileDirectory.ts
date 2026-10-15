import { editOwnProfile, readOwnProfile, readPublicProfile, setProfileFollow, uploadProfileImage } from "@/app/profileActions";
import type { MediaKind, OwnProfile, ProfileEdit, PublicProfile } from "@/lib/profiles/schemas";
import { repo } from "./index";
import type { Repository } from "./types";

export interface ProfileDirectoryRepository {
  getOwn(): Promise<OwnProfile>;
  update(input: ProfileEdit): Promise<OwnProfile>;
  getPublic(username: string): Promise<PublicProfile | null>;
  follow(username: string, following: boolean): Promise<PublicProfile | null>;
  upload(kind: MediaKind, file: File): Promise<OwnProfile>;
}
function unwrap<T>(result: { ok: true; value: T } | { ok: false; code: string }): T {
  if (!result.ok) throw new Error(result.code);
  return result.value;
}
export function createProfileDirectory(local: Pick<Repository, "getDirectoryProfile" | "updateDirectoryProfile" | "updateProfile">): ProfileDirectoryRepository {
  return {
    async getOwn() { return unwrap(await readOwnProfile()) ?? local.getDirectoryProfile(); },
    async update(input) {
      const saved = unwrap(await editOwnProfile(input));
      if (!saved) return local.updateDirectoryProfile(input);
      // Until the session repository moves server-side, keep its greeting
      // preference aligned with the account name edited here.
      await local.updateProfile({ displayName: saved.displayName });
      return saved;
    },
    async getPublic(username) { return unwrap(await readPublicProfile(username)); },
    async follow(username, following) { return unwrap(await setProfileFollow({ username, following })); },
    async upload(kind, file) {
      const form = new FormData(); form.set("kind", kind); form.set("file", file);
      return unwrap(await uploadProfileImage(form));
    },
  };
}
// Keep the account transport out of the session repository's import graph.
// The signed development preview gets an explicit local response from actions.
export const profileDirectory = createProfileDirectory(repo);
