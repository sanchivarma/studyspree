import enprofile from "./profile/en.json";
import deprofile from "./profile/de.json";
import frprofile from "./profile/fr.json";
import plprofile from "./profile/pl.json";
import itprofile from "./profile/it.json";
import itstatsRange from "./statsRange/it.json";
import plstatsRange from "./statsRange/pl.json";
import frstatsRange from "./statsRange/fr.json";
import destatsRange from "./statsRange/de.json";
import enstatsRange from "./statsRange/en.json";
import itdashboard from "./dashboard/it.json";
import pldashboard from "./dashboard/pl.json";
import frdashboard from "./dashboard/fr.json";
import dedashboard from "./dashboard/de.json";
import endashboard from "./dashboard/en.json";
import itcharacters from "./characters/it.json";
import plcharacters from "./characters/pl.json";
import frcharacters from "./characters/fr.json";
import decharacters from "./characters/de.json";
import encharacters from "./characters/en.json";
import itonboarding from "./onboarding/it.json";
import plonboarding from "./onboarding/pl.json";
import fronboarding from "./onboarding/fr.json";
import deonboarding from "./onboarding/de.json";
import enonboarding from "./onboarding/en.json";
import itambience from "./ambience/it.json";
import plambience from "./ambience/pl.json";
import frambience from "./ambience/fr.json";
import deambience from "./ambience/de.json";
import enambience from "./ambience/en.json";
import itwebcam from "./webcam/it.json";
import plwebcam from "./webcam/pl.json";
import frwebcam from "./webcam/fr.json";
import dewebcam from "./webcam/de.json";
import enwebcam from "./webcam/en.json";
import itcomeback from "./comeback/it.json";
import plcomeback from "./comeback/pl.json";
import frcomeback from "./comeback/fr.json";
import decomeback from "./comeback/de.json";
import encomeback from "./comeback/en.json";
import encommon from "./common/en.json";
import enlogin from "./login/en.json";
import enregister from "./register/en.json";
import enrecovery from "./recovery/en.json";
import enhome from "./home/en.json";
import enstudy from "./study/en.json";
import ensession from "./session/en.json";
import encomplete from "./complete/en.json";
import enstats from "./stats/en.json";
import enscene from "./scene/en.json";
import ensettings from "./settings/en.json";
import endev from "./dev/en.json";
import decommon from "./common/de.json";
import delogin from "./login/de.json";
import deregister from "./register/de.json";
import derecovery from "./recovery/de.json";
import dehome from "./home/de.json";
import destudy from "./study/de.json";
import desession from "./session/de.json";
import decomplete from "./complete/de.json";
import destats from "./stats/de.json";
import descene from "./scene/de.json";
import desettings from "./settings/de.json";
import dedev from "./dev/de.json";
import frcommon from "./common/fr.json";
import frlogin from "./login/fr.json";
import frregister from "./register/fr.json";
import frrecovery from "./recovery/fr.json";
import frhome from "./home/fr.json";
import frstudy from "./study/fr.json";
import frsession from "./session/fr.json";
import frcomplete from "./complete/fr.json";
import frstats from "./stats/fr.json";
import frscene from "./scene/fr.json";
import frsettings from "./settings/fr.json";
import frdev from "./dev/fr.json";
import plcommon from "./common/pl.json";
import pllogin from "./login/pl.json";
import plregister from "./register/pl.json";
import plrecovery from "./recovery/pl.json";
import plhome from "./home/pl.json";
import plstudy from "./study/pl.json";
import plsession from "./session/pl.json";
import plcomplete from "./complete/pl.json";
import plstats from "./stats/pl.json";
import plscene from "./scene/pl.json";
import plsettings from "./settings/pl.json";
import pldev from "./dev/pl.json";
import itcommon from "./common/it.json";
import itlogin from "./login/it.json";
import itregister from "./register/it.json";
import itrecovery from "./recovery/it.json";
import ithome from "./home/it.json";
import itstudy from "./study/it.json";
import itsession from "./session/it.json";
import itcomplete from "./complete/it.json";
import itstats from "./stats/it.json";
import itscene from "./scene/it.json";
import itsettings from "./settings/it.json";
import itdev from "./dev/it.json";

export const locales = ["en", "de", "fr", "pl", "it"] as const;
export type Locale = (typeof locales)[number];

const en = { ...encommon, ...enlogin, ...enregister, ...enrecovery, ...enhome, ...enstudy, ...ensession, ...encomplete, ...enstats, ...enscene, ...ensettings, ...endev, ...encomeback, ...enwebcam, ...enambience, ...enonboarding, ...encharacters, ...endashboard, ...enstatsRange, ...enprofile };
export type Dictionary = typeof en;
export type TranslationKey = {
  [Namespace in keyof Dictionary]: `${Namespace}.${keyof Dictionary[Namespace] & string}`
}[keyof Dictionary];
export const dictionaries = {
  en,
  de: { ...decommon, ...delogin, ...deregister, ...derecovery, ...dehome, ...destudy, ...desession, ...decomplete, ...destats, ...descene, ...desettings, ...dedev, ...decomeback, ...dewebcam, ...deambience, ...deonboarding, ...decharacters, ...dedashboard, ...destatsRange, ...deprofile },
  fr: { ...frcommon, ...frlogin, ...frregister, ...frrecovery, ...frhome, ...frstudy, ...frsession, ...frcomplete, ...frstats, ...frscene, ...frsettings, ...frdev, ...frcomeback, ...frwebcam, ...frambience, ...fronboarding, ...frcharacters, ...frdashboard, ...frstatsRange, ...frprofile },
  pl: { ...plcommon, ...pllogin, ...plregister, ...plrecovery, ...plhome, ...plstudy, ...plsession, ...plcomplete, ...plstats, ...plscene, ...plsettings, ...pldev, ...plcomeback, ...plwebcam, ...plambience, ...plonboarding, ...plcharacters, ...pldashboard, ...plstatsRange, ...plprofile },
  it: { ...itcommon, ...itlogin, ...itregister, ...itrecovery, ...ithome, ...itstudy, ...itsession, ...itcomplete, ...itstats, ...itscene, ...itsettings, ...itdev, ...itcomeback, ...itwebcam, ...itambience, ...itonboarding, ...itcharacters, ...itdashboard, ...itstatsRange, ...itprofile },
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
