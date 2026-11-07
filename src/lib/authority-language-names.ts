const names = {
  pt: { pt: "Português", en: "Inglês", es: "Espanhol", de: "Alemão", fr: "Francês", it: "Italiano" },
  en: { pt: "Portuguese", en: "English", es: "Spanish", de: "German", fr: "French", it: "Italian" },
  es: { pt: "Portugués", en: "Inglés", es: "Español", de: "Alemán", fr: "Francés", it: "Italiano" },
  de: { pt: "Portugiesisch", en: "Englisch", es: "Spanisch", de: "Deutsch", fr: "Französisch", it: "Italienisch" },
  fr: { pt: "Portugais", en: "Anglais", es: "Espagnol", de: "Allemand", fr: "Français", it: "Italien" },
  it: { pt: "Portoghese", en: "Inglese", es: "Spagnolo", de: "Tedesco", fr: "Francese", it: "Italiano" },
} as const;

export function authorityLanguageName(language: keyof typeof names, value: keyof typeof names.pt): string {
  return names[language][value];
}
