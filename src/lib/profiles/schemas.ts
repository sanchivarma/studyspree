import { z } from "zod";

export const usernameSchema = z.string().regex(/^[a-z0-9_]{3,30}$/);
const text = (max: number) => z.string().trim().max(max);
const tags = z.array(text(40).min(1)).max(10).refine(values => new Set(values.map(v => v.toLowerCase())).size === values.length);
export const socialSchema = z.object({ label: text(30).min(1), url: z.url().max(300).refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}) }).strict();
export const profileEditSchema = z.object({
  displayName: text(100).min(1), bio: text(500), countryCode: z.string().regex(/^$|^[A-Z]{2}$/),
  occupation: text(100), interests: tags, lookingFor: tags,
  socials: z.array(socialSchema).max(5), isPublic: z.boolean(),
}).strict();
export const mediaKindSchema = z.enum(["avatar", "banner"]);
export const mediaPathSchema = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/);
export const publicProfileSchema = profileEditSchema.omit({ isPublic: true }).extend({
  id: z.uuid(), username: usernameSchema, joinedAt: z.iso.datetime({ offset: true }),
  avatarPath: mediaPathSchema.nullable(), bannerPath: mediaPathSchema.nullable(),
  followers: z.number().int().nonnegative(), following: z.number().int().nonnegative(),
  isFollowing: z.boolean(), isSelf: z.boolean(),
}).strict();
export const ownProfileSchema = publicProfileSchema.extend({ isPublic: z.boolean(), isLocal: z.boolean() });
export type ProfileEdit = z.infer<typeof profileEditSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type OwnProfile = z.infer<typeof ownProfileSchema>;
export type MediaKind = z.infer<typeof mediaKindSchema>;

// Never allow executable SVG/HTML or trust the browser's MIME label alone.
export function validateProfileImage(bytes: Uint8Array, mime: string, kind: MediaKind): "png" | "jpg" | "webp" {
  if (!bytes.length || bytes.length > (kind === "avatar" ? 2 : 5) * 1024 * 1024) throw new Error("Invalid image size");
  const head = Array.from(bytes.slice(0, 12));
  if (mime === "image/png" && [137,80,78,71,13,10,26,10].every((v, i) => head[i] === v)) return "png";
  if (mime === "image/jpeg" && head[0] === 255 && head[1] === 216 && head[2] === 255) return "jpg";
  if (mime === "image/webp" && String.fromCharCode(...head.slice(0,4)) === "RIFF" && String.fromCharCode(...head.slice(8,12)) === "WEBP") return "webp";
  throw new Error("Invalid image format");
}
