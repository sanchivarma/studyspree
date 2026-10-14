import type { ThemeSlug } from "./registry";

export type SceneMedia = { poster: boolean; webm: boolean; mp4: boolean };
export type SceneMediaManifest = Record<ThemeSlug, SceneMedia>;
