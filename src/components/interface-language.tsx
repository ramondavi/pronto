"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type InterfaceLanguage, normalizeLanguage } from "@/lib/interface-language";
import { usePathname, useRouter } from "next/navigation";
import { showPanelChange } from "@/components/panel-change-toast";

const preferenceKey = "pronto-interface-language";
const languageChanged = { pt: "Idioma alterado", en: "Language changed", es: "Idioma cambiado", de: "Sprache geändert", fr: "Langue modifiée", it: "Lingua modificata" } as const;

type LanguageContextValue = { language: InterfaceLanguage; deviceLanguage: InterfaceLanguage; hasPreference: boolean; setLanguage: (language: InterfaceLanguage) => void };
const LanguageContext = createContext<LanguageContextValue>({ language: "pt", deviceLanguage: "pt", hasPreference: false, setLanguage: () => undefined });

export function InterfaceLanguageProvider({ children, initialLanguage, initialDeviceLanguage, initialPreference }: { children: React.ReactNode; initialLanguage: InterfaceLanguage; initialDeviceLanguage: InterfaceLanguage; initialPreference: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [language, updateLanguage] = useState<InterfaceLanguage>(initialLanguage);
  const [deviceLanguage, setDeviceLanguage] = useState<InterfaceLanguage>(initialDeviceLanguage);
  const [hasPreference, setHasPreference] = useState(initialPreference);

  useEffect(() => {
    const detected = normalizeLanguage(navigator.languages?.[0] ?? navigator.language);
    const saved = localStorage.getItem(preferenceKey);
    setDeviceLanguage(detected);
    setHasPreference(Boolean(saved) || initialPreference);
    updateLanguage(saved ? normalizeLanguage(saved) : initialPreference ? initialLanguage : detected);
  }, [initialLanguage, initialPreference]);

  useEffect(() => { document.documentElement.lang = document.querySelector('[data-staff-panel="true"]') ? "pt-BR" : language === "pt" ? "pt-BR" : language; }, [language, pathname]);

  function setLanguage(next: InterfaceLanguage) {
    if (next === language) return;
    const previous = language;
    updateLanguage(next);
    setHasPreference(true);
    localStorage.setItem(preferenceKey, next);
    document.cookie = `pronto-language=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
    showPanelChange(languageChanged[next], () => { updateLanguage(previous); localStorage.setItem(preferenceKey, previous); document.cookie = `pronto-language=${previous}; Path=/; Max-Age=31536000; SameSite=Lax`; router.refresh(); });
  }

  return <LanguageContext.Provider value={{ language, deviceLanguage, hasPreference, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useInterfaceLanguage() { return useContext(LanguageContext); }

export function PanelInterfaceLanguageScope({ staff, children }: { staff: boolean; children: React.ReactNode }) {
  const preference = useInterfaceLanguage();
  const pathname = usePathname();
  const staffView = staff && !pathname.startsWith("/painel/visao-estudante");
  useEffect(() => {
    if (!staffView) return;
    document.documentElement.lang = "pt-BR";
    return () => { document.documentElement.lang = preference.language === "pt" ? "pt-BR" : preference.language; };
  }, [staffView, preference.language]);
  if (!staffView) return children;
  return <LanguageContext.Provider value={{ ...preference, language: "pt" }}>{children}</LanguageContext.Provider>;
}
