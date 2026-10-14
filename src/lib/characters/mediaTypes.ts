import type { CharacterSlug } from "./registry";

export type SceneMedia = { poster: boolean; webm: boolean; mp4: boolean };
export type SceneMediaManifest = Record<CharacterSlug, SceneMedia>;
