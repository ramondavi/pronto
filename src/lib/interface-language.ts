export const supportedLanguages = ["pt", "en", "es", "de", "fr", "it"] as const;
export type InterfaceLanguage = typeof supportedLanguages[number];
export const languageLabels: Record<InterfaceLanguage, string> = { pt: "Português", en: "English", es: "Español", de: "Deutsch", fr: "Français", it: "Italiano" };

export function normalizeLanguage(value: string | null | undefined): InterfaceLanguage {
  const code = value?.toLowerCase().split("-")[0];
  return supportedLanguages.find((language) => language === code) ?? "pt";
}
