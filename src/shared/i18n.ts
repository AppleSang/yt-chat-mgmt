/**
 * Minimal i18n engine. English is the default; add new languages by
 * creating a dict in `locales/` and registering it in `LOCALES`.
 */
import { en } from "./locales/en";
import type { Dict } from "./locales/en";
import { vi } from "./locales/vi";
import type { LanguageCode } from "./types";

export type { Dict } from "./locales/en";
export type { LanguageCode } from "./types";

const LOCALES: Record<LanguageCode, Dict> = { en, vi };

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" }
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

let current: LanguageCode = DEFAULT_LANGUAGE;

export const isLanguageCode = (v: unknown): v is LanguageCode =>
  typeof v === "string" && v in LOCALES;

export const setLanguage = (code: unknown): LanguageCode => {
  current = isLanguageCode(code) ? code : DEFAULT_LANGUAGE;
  return current;
};

export const getLanguage = (): LanguageCode => current;

type Params = Record<string, string | number>;

export const t = (key: keyof Dict, params?: Params): string => {
  const dict = LOCALES[current] || en;
  let out: string = dict[key] ?? en[key] ?? String(key);
  if (params) {
    for (const k of Object.keys(params)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(params[k]));
    }
  }
  return out;
};
