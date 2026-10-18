export const effectSlugs = ["cafe", "wind", "rain", "thunderstorm", "brown-noise", "white-noise", "ocean", "library", "castle"] as const;
export type EffectSlug = typeof effectSlugs[number];
export type EffectVolumes = Partial<Record<EffectSlug, number>>;
const effectSources = {
  cafe: "/audio/effect-cafe-v3.mp3",
  wind: "/audio/effect-wind-v2.mp3",
  rain: "/audio/effect-rain-v3.mp3",
  thunderstorm: "/audio/effect-thunderstorm-v2.mp3",
  "brown-noise": "/audio/effect-brown-noise-v1.wav",
  "white-noise": "/audio/effect-white-noise-v1.wav",
  ocean: "/audio/effect-ocean-v1.mp3",
  library: "/audio/effect-library-v2.mp3",
  castle: "/audio/effect-castle-v1.mp3",
} satisfies Record<EffectSlug, string>;
export const backgroundEffects = effectSlugs.map(slug => ({
  slug, src: effectSources[slug], labelKey: `ambience.${slug}` as const,
}));

// Retired options are removed on read without resetting unrelated preferences.
export const retiredEffectSlugs: ReadonlySet<string> = new Set(["medieval", "medieval-flute", "medieval-lyre"]);
export function removeRetiredEffects(value: unknown): unknown {
  return Array.isArray(value) ? value.filter(item => !retiredEffectSlugs.has(item)) : value;
}
export function removeRetiredEffectVolumes(value: unknown): unknown {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter(([key]) => !retiredEffectSlugs.has(key))) : value;
}
