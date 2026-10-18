export const effectSlugs = ["cafe", "wind", "rain", "thunderstorm", "brown-noise", "white-noise", "medieval", "medieval-flute", "medieval-lyre", "library", "castle"] as const;
export type EffectSlug = typeof effectSlugs[number];
export type EffectVolumes = Partial<Record<EffectSlug, number>>;
const effectSources = {
  cafe: "/audio/effect-cafe-v3.mp3",
  wind: "/audio/effect-wind-v2.mp3",
  rain: "/audio/effect-rain-v3.mp3",
  thunderstorm: "/audio/effect-thunderstorm-v2.mp3",
  "brown-noise": "/audio/effect-brown-noise-v1.wav",
  "white-noise": "/audio/effect-white-noise-v1.wav",
  medieval: "/audio/effect-medieval-v2.mp3",
  "medieval-flute": "/audio/effect-medieval-flute-v1.mp3",
  "medieval-lyre": "/audio/effect-medieval-lyre-v1.mp3",
  library: "/audio/effect-library-v2.mp3",
  castle: "/audio/effect-castle-v1.mp3",
} satisfies Record<EffectSlug, string>;
export const backgroundEffects = effectSlugs.map(slug => ({
  slug, src: effectSources[slug], labelKey: `ambience.${slug}` as const,
}));
