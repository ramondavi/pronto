"use client";

import { useEffect, useState } from "react";
import { useInterfaceLanguage } from "./interface-language";
import { useStaffPanel } from "./use-staff-panel";
import { showPanelChange } from "@/components/panel-change-toast";

const themeCopy = {
  pt: ["Tema da interface", "Usar tema claro", "Tema claro", "Usar tema escuro", "Tema escuro"],
  en: ["Interface theme", "Use light theme", "Light theme", "Use dark theme", "Dark theme"],
  es: ["Tema de la interfaz", "Usar tema claro", "Tema claro", "Usar tema oscuro", "Tema oscuro"],
  de: ["Design der Oberfläche", "Helles Design verwenden", "Helles Design", "Dunkles Design verwenden", "Dunkles Design"],
  fr: ["Thème de l’interface", "Utiliser le thème clair", "Thème clair", "Utiliser le thème sombre", "Thème sombre"],
  it: ["Tema dell’interfaccia", "Usa tema chiaro", "Tema chiaro", "Usa tema scuro", "Tema scuro"],
};

type ThemePreference = "light" | "dark";

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.theme = preference;
  document.documentElement.style.colorScheme = preference;
}

export function ThemeSwitcher() {
  const { language } = useInterfaceLanguage();
  const t = themeCopy[useStaffPanel() ? "pt" : language];
  const [preference, setPreference] = useState<ThemePreference | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("pronto-theme");
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const initial: ThemePreference = saved === "light" || saved === "dark"
      ? saved
      : media.matches ? "dark" : "light";
    setPreference(initial);
    applyTheme(initial);

    const syncSystem = () => {
      const current = localStorage.getItem("pronto-theme");
      if (current !== "light" && current !== "dark") {
        const systemTheme = media.matches ? "dark" : "light";
        setPreference(systemTheme);
        applyTheme(systemTheme);
      }
    };
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, []);

  function update(next: ThemePreference) {
    if (next === preference) return;
    const previous = preference;
    setPreference(next);
    localStorage.setItem("pronto-theme", next);
    applyTheme(next);
    showPanelChange("Tema alterado", previous ? () => { setPreference(previous); localStorage.setItem("pronto-theme", previous); applyTheme(previous); } : undefined);
  }

  return (
    <div className="theme-switcher" role="group" aria-label={t[0]}>
      <button type="button" aria-label={t[1]} title={t[2]} aria-pressed={preference === "light"} onClick={() => update("light")}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>
      </button>
      <button type="button" aria-label={t[3]} title={t[4]} aria-pressed={preference === "dark"} onClick={() => update("dark")}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/></svg>
      </button>
    </div>
  );
}
