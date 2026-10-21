import "server-only";
import { randomUUID } from "node:crypto";
import { createAuthClient } from "@/lib/auth/server";
import { getDevAdminProfile } from "@/lib/auth/devAdmin";
import { mediaKindSchema, ownProfileSchema, profileEditSchema, publicProfileSchema, usernameSchema, validateProfileImage } from "./schemas";
import type { MediaKind, ProfileEdit } from "./schemas";

export class ProfileAccessError extends Error {
  constructor(public readonly code: "unauthorized" | "invalid" | "unavailable") { super(code); }
}
async function identity() {
  const client = await createAuthClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new ProfileAccessError("unauthorized");
  return { client, id: data.user.id };
}
type Identity = Awaited<ReturnType<typeof identity>>;

async function visibleProfile(client: Identity["client"], username: string) {
  const response = await client.rpc("read_visible_profile", { p_username: username });
  if (response.error) throw new ProfileAccessError("unavailable");
  return response.data === null ? null : publicProfileSchema.parse(response.data);
}

async function ownProfile({ client, id }: Identity) {
  const [account, card] = await Promise.all([
    client.from("profiles").select("username").eq("id", id).single(),
    client.from("profile_cards").select("is_public").eq("user_id", id).single(),
  ]);
  if (account.error || card.error) throw new ProfileAccessError("unavailable");
  const visible = await visibleProfile(client, account.data.username);
  if (!visible) throw new ProfileAccessError("unavailable");
  return ownProfileSchema.parse({ ...visible, isPublic: card.data.is_public, isLocal: false });
}

export const serverProfileRepository = {
  async isLocal() { return Boolean(await getDevAdminProfile()); },
  async getOwn() {
    return ownProfile(await identity());
  },
  async getPublic(username: string) {
    const parsed = usernameSchema.safeParse(username);
    if (!parsed.success) return null;
    const { client } = await identity();
    return visibleProfile(client, parsed.data);
  },
  async update(input: ProfileEdit) {
    const parsed = profileEditSchema.safeParse(input);
    if (!parsed.success) throw new ProfileAccessError("invalid");
    const actor = await identity();
    const { client, id } = actor;
    const p = parsed.data;
    const response = await client.from("profile_cards").update({ display_name: p.displayName, bio: p.bio,
      country_code: p.countryCode, occupation: p.occupation, interests: p.interests,
      looking_for: p.lookingFor, socials: p.socials, is_public: p.isPublic }).eq("user_id", id).select("user_id").single();
    if (response.error) throw new ProfileAccessError("unavailable");
    return ownProfile(actor);
  },
  async follow(username: string, following: boolean) {
    if (!usernameSchema.safeParse(username).success || typeof following !== "boolean") throw new ProfileAccessError("invalid");
    const { client, id } = await identity();
    const target = await visibleProfile(client, username);
    if (!target || target.isSelf) throw new ProfileAccessError("invalid");
    if (following) {
      const result = await client.from("profile_follows").insert({ follower_id: id, following_id: target.id });
      if (result.error && result.error.code !== "23505") throw new ProfileAccessError("unavailable");
    } else {
      const result = await client.from("profile_follows").delete().eq("follower_id", id).eq("following_id", target.id);
      if (result.error) throw new ProfileAccessError("unavailable");
    }
    return visibleProfile(client, username);
  },
  async upload(kind: MediaKind, file: File) {
    if (!mediaKindSchema.safeParse(kind).success || !(file instanceof File)) throw new ProfileAccessError("invalid");
    // Bound memory before reading the body. MIME is checked against magic bytes too.
    if (file.size > (kind === "avatar" ? 2 : 5) * 1024 * 1024) throw new ProfileAccessError("invalid");
    const actor = await identity();
    const { client, id } = actor;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let extension: string;
    try { extension = validateProfileImage(bytes, file.type, kind); } catch { throw new ProfileAccessError("invalid"); }
    const column = kind === "avatar" ? "avatar_path" : "banner_path";
    const previous = await client.from("profile_cards").select("avatar_path,banner_path").eq("user_id", id).single();
    if (previous.error) throw new ProfileAccessError("unavailable");
    const path = `${id}/${randomUUID()}.${extension}`;
    const result = await client.storage.from("profile-media").upload(path, bytes, { contentType: file.type, upsert: false });
    if (result.error) throw new ProfileAccessError("unavailable");
    const saved = await client.from("profile_cards").update(kind === "avatar" ? { avatar_path: path } : { banner_path: path }).eq("user_id", id).select("user_id").single();
    if (saved.error) {
      await client.storage.from("profile-media").remove([path]);
      throw new ProfileAccessError("unavailable");
    }
    const old = previous.data[column];
    if (old) await client.storage.from("profile-media").remove([old]);
    return ownProfile(actor);
  },
};
