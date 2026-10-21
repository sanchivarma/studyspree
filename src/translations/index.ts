import en from "./en";
import de from "./de";
import fr from "./fr";
import pl from "./pl";
import it from "./it";
import { formatTranslation } from "./format";
import { isLocale, type Locale, type TranslationKey } from "./locale";
export { locales, languageNames, isLocale } from "./locale";
export type { Locale, Dictionary, TranslationKey } from "./locale";

export const dictionaries = { en, de, fr, pl, it };

export function translate(locale: Locale, key: TranslationKey, params: Record<string, string | number> = {}): string {
  return formatTranslation(dictionaries[isLocale(locale) ? locale : "en"], key, params, en);
}
