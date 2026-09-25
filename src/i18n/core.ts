export type Lang = "sv" | "en";
export const LANGS: Lang[] = ["sv", "en"];
export const DEFAULT_LANG: Lang = "sv";

/** A piece of content in both languages. Used throughout src/data/org.ts. */
export interface L {
  sv: string;
  en: string;
}

export const l = (en: string, sv: string): L => ({ en, sv });
