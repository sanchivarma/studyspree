import encommon from "./common/en.json";
import enlogin from "./login/en.json";
import enregister from "./register/en.json";
import enrecovery from "./recovery/en.json";
import enhome from "./home/en.json";
import enstudy from "./study/en.json";
import ensession from "./session/en.json";
import encomplete from "./complete/en.json";
import decommon from "./common/de.json";
import delogin from "./login/de.json";
import deregister from "./register/de.json";
import derecovery from "./recovery/de.json";
import dehome from "./home/de.json";
import destudy from "./study/de.json";
import desession from "./session/de.json";
import decomplete from "./complete/de.json";
import frcommon from "./common/fr.json";
import frlogin from "./login/fr.json";
import frregister from "./register/fr.json";
import frrecovery from "./recovery/fr.json";
import frhome from "./home/fr.json";
import frstudy from "./study/fr.json";
import frsession from "./session/fr.json";
import frcomplete from "./complete/fr.json";
import plcommon from "./common/pl.json";
import pllogin from "./login/pl.json";
import plregister from "./register/pl.json";
import plrecovery from "./recovery/pl.json";
import plhome from "./home/pl.json";
import plstudy from "./study/pl.json";
import plsession from "./session/pl.json";
import plcomplete from "./complete/pl.json";
import itcommon from "./common/it.json";
import itlogin from "./login/it.json";
import itregister from "./register/it.json";
import itrecovery from "./recovery/it.json";
import ithome from "./home/it.json";
import itstudy from "./study/it.json";
import itsession from "./session/it.json";
import itcomplete from "./complete/it.json";

export const locales = ["en", "de", "fr", "pl", "it"] as const;
export type Locale = (typeof locales)[number];

const en = { ...encommon, ...enlogin, ...enregister, ...enrecovery, ...enhome, ...enstudy, ...ensession, ...encomplete };
export type Dictionary = typeof en;
export type TranslationKey = {
  [Namespace in keyof Dictionary]: `${Namespace}.${keyof Dictionary[Namespace] & string}`
}[keyof Dictionary];
export const dictionaries = {
  en,
  de: { ...decommon, ...delogin, ...deregister, ...derecovery, ...dehome, ...destudy, ...desession, ...decomplete },
  fr: { ...frcommon, ...frlogin, ...frregister, ...frrecovery, ...frhome, ...frstudy, ...frsession, ...frcomplete },
  pl: { ...plcommon, ...pllogin, ...plregister, ...plrecovery, ...plhome, ...plstudy, ...plsession, ...plcomplete },
  it: { ...itcommon, ...itlogin, ...itregister, ...itrecovery, ...ithome, ...itstudy, ...itsession, ...itcomplete },
} satisfies Record<Locale, Dictionary>;

export const languageNames: Record<Locale, string> = { en: "English", de: "Deutsch", fr: "Français", pl: "Polski", it: "Italiano" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.some((locale) => locale === value);
}

export function translate(locale: Locale, key: TranslationKey, params: Record<string, string | number> = {}): string {
  const [namespace, name] = key.split(".") as [keyof Dictionary, string];
  const dictionary = dictionaries[isLocale(locale) ? locale : "en"];
  const section: Record<string, string> | undefined = dictionary[namespace];
  const fallback: Record<string, string> | undefined = dictionaries.en[namespace];
  const message = section?.[name] ?? fallback?.[name];
  return typeof message === "string" ? message.replace(/\{(\w+)\}/g, (match, parameter: string) => String(params[parameter] ?? match)) : key;
}
