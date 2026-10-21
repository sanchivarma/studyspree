import type { Dictionary, Locale } from "./locale";

const loaders = {
  en: () => import("./en").then(module => module.default),
  de: () => import("./de").then(module => module.default),
  fr: () => import("./fr").then(module => module.default),
  pl: () => import("./pl").then(module => module.default),
  it: () => import("./it").then(module => module.default),
} satisfies Record<Locale, () => Promise<Dictionary>>;

// Dictionaries contain public application copy. Cache their loads, never user data.
const pending = new Map<Locale, Promise<Dictionary>>();
export function loadDictionary(locale: Locale): Promise<Dictionary> {
  const existing = pending.get(locale);
  if (existing) return existing;
  const requested = locale === "en" ? loaders.en() : Promise.all([loadDictionary("en"), loaders[locale]()])
    .then(([english, dictionary]) => Object.fromEntries(Object.entries(english).map(([namespace, fallback]) => [
      namespace, { ...fallback, ...dictionary[namespace as keyof Dictionary] },
    ])) as Dictionary);
  const result = requested.catch((error: unknown) => {
    pending.delete(locale);
    throw error;
  });
  pending.set(locale, result);
  return result;
}
