import type { Dictionary, TranslationKey } from "./locale";

export function formatTranslation(
  dictionary: Dictionary,
  key: TranslationKey,
  params: Record<string, string | number> = {},
  fallback: Dictionary = dictionary,
): string {
  const [namespace, name] = key.split(".") as [keyof Dictionary, string];
  const section: Record<string, string> | undefined = dictionary[namespace];
  const english: Record<string, string> | undefined = fallback[namespace];
  const message = section?.[name] ?? english?.[name];
  return typeof message === "string"
    ? message.replace(/\{(\w+)\}/g, (match, parameter: string) => String(params[parameter] ?? match))
    : key;
}
