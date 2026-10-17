export const effectSlugs = ["cafe", "wind", "rain", "thunderstorm", "brown-noise", "white-noise"] as const;
export type EffectSlug = typeof effectSlugs[number];
export type EffectVolumes = Partial<Record<EffectSlug, number>>;
export const backgroundEffects = effectSlugs.map(slug => ({
  slug, src: slug === "rain" ? "/audio/effect-rain-v3.mp3" : ["cafe", "wind", "thunderstorm"].includes(slug) ? `/audio/effect-${slug}-v2.mp3` : `/audio/effect-${slug}-v1.wav`, labelKey: `ambience.${slug}` as const,
}));
