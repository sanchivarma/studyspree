import { localPreviewAudio } from "./localPreview";

export const effectSlugs = ["cafe", "wind", "rain", "thunderstorm", "brown-noise", "white-noise", "medieval-warrior", "medieval-walk", "medieval-knight", "ocean", "library", "castle", "piano-nocturne", "piano-gymnopedie", "piano-moonlight", "ambient-432hz", "ambient-528hz", "ambient-963hz"] as const;
export type EffectSlug = typeof effectSlugs[number];
export type EffectVolumes = Partial<Record<EffectSlug, number>>;
const effectSources = {
  cafe: "/audio/effect-cafe-v3.mp3",
  wind: "/audio/effect-wind-v2.mp3",
  rain: "/audio/effect-rain-v3.mp3",
  thunderstorm: "/audio/effect-thunderstorm-v2.mp3",
  "brown-noise": "/audio/effect-brown-noise-v1.wav",
  "white-noise": "/audio/effect-white-noise-v1.wav",
  "medieval-warrior": `/api/local-audio/${localPreviewAudio["medieval-warrior"].file}`,
  "medieval-walk": `/api/local-audio/${localPreviewAudio["medieval-walk"].file}`,
  "medieval-knight": `/api/local-audio/${localPreviewAudio["medieval-knight"].file}`,
  ocean: "/audio/effect-ocean-v1.mp3",
  library: "/audio/effect-library-v2.mp3",
  castle: "/audio/effect-castle-v1.mp3",
  "piano-nocturne": "/audio/piano-chopin-nocturne-op9-no2-v1.mp3",
  "piano-gymnopedie": "/audio/piano-satie-gymnopedie-no1-v1.mp3",
  "piano-moonlight": "/audio/piano-beethoven-moonlight-i-v1.mp3",
  "ambient-432hz": "/audio/ambient-432hz-v1.wav",
  "ambient-528hz": "/audio/ambient-528hz-v1.wav",
  "ambient-963hz": "/audio/ambient-963hz-v1.wav",
} satisfies Record<EffectSlug, string>;
export const backgroundEffects = effectSlugs.filter(slug => process.env.NODE_ENV !== "production" || !Object.hasOwn(localPreviewAudio, slug)).map(slug => ({
  slug, src: effectSources[slug], labelKey: `ambience.${slug}` as const,
}));

// Retired options are removed on read without resetting unrelated preferences.
export const retiredEffectSlugs: ReadonlySet<string> = new Set(["medieval", "medieval-flute", "medieval-lyre", "buddhist-chant", "om-chant", "tibetan-chant"]);
export function removeRetiredEffects(value: unknown): unknown {
  return Array.isArray(value) ? value.filter(item => !retiredEffectSlugs.has(item)) : value;
}
export function removeRetiredEffectVolumes(value: unknown): unknown {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([key]) => !retiredEffectSlugs.has(key))) : value;
}
