"use client";

import { useEffect, useState } from "react";
import { useInterfaceLanguage } from "./interface-language";
import { useStaffPanel } from "./use-staff-panel";
import { showPanelChange } from "@/components/panel-change-toast";
import { IconMoon, IconSun } from "@tabler/icons-react";

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
        <IconSun aria-hidden="true" size={24} stroke={1.8} />
      </button>
      <button type="button" aria-label={t[3]} title={t[4]} aria-pressed={preference === "dark"} onClick={() => update("dark")}>
        <IconMoon aria-hidden="true" size={24} stroke={1.8} />
      </button>
    </div>
  );
}
