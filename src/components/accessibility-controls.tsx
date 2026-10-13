"use client";

import { useEffect, useRef, useState } from "react";
import { showPanelChange } from "@/components/panel-change-toast";
import { ThemeSwitcher } from "./theme-switcher";
import { AppIcon } from "./app-icon";
import { useInterfaceLanguage } from "./interface-language";
import { useStaffPanel } from "./use-staff-panel";

const accessibilityCopy = {
  pt: ["Ir para o conteúdo", "Ir para o menu", "Central de ajuda", "Acessibilidade", "Recursos de acessibilidade", "Ajustes de visualização", "Diminuir tamanho do texto", "Usar tamanho padrão do texto", "Aumentar tamanho do texto", "Alternar alto contraste", "Alto contraste", "Privacidade"],
  en: ["Skip to content", "Skip to menu", "Help center", "Accessibility", "Accessibility tools", "Display settings", "Decrease text size", "Use default text size", "Increase text size", "Toggle high contrast", "High contrast", "Privacy"],
  es: ["Ir al contenido", "Ir al menú", "Centro de ayuda", "Accesibilidad", "Herramientas de accesibilidad", "Ajustes de visualización", "Reducir texto", "Tamaño predeterminado", "Aumentar texto", "Alternar alto contraste", "Alto contraste", "Privacidad"],
  de: ["Zum Inhalt", "Zum Menü", "Hilfe", "Barrierefreiheit", "Barrierefreiheit", "Anzeigeeinstellungen", "Text verkleinern", "Standardgröße", "Text vergrößern", "Hohen Kontrast umschalten", "Hoher Kontrast", "Datenschutz"],
  fr: ["Aller au contenu", "Aller au menu", "Centre d’aide", "Accessibilité", "Outils d’accessibilité", "Réglages d’affichage", "Réduire le texte", "Taille par défaut", "Agrandir le texte", "Activer le contraste élevé", "Contraste élevé", "Confidentialité"],
  it: ["Vai al contenuto", "Vai al menu", "Centro assistenza", "Accessibilità", "Strumenti di accessibilità", "Impostazioni di visualizzazione", "Riduci testo", "Dimensione predefinita", "Ingrandisci testo", "Attiva alto contrasto", "Alto contrasto", "Privacy"],
};
const mobileLinkCopy = {
  pt: ["Conteúdo", "Menu", "Ajuda", "Acessib.", "Privacidade"], en: ["Content", "Menu", "Help", "Access.", "Privacy"], es: ["Contenido", "Menú", "Ayuda", "Acces.", "Privac."],
  de: ["Inhalt", "Menü", "Hilfe", "Barrieref.", "Datenschutz"], fr: ["Contenu", "Menu", "Aide", "Access.", "Confid."], it: ["Contenuto", "Menu", "Aiuto", "Accessib.", "Privacy"],
} as const;

type TextScale = "normal" | "large" | "larger";

const scales: TextScale[] = ["normal", "large", "larger"];

function applyPreferences(scale: TextScale, highContrast: boolean) {
  document.documentElement.dataset.textScale = scale;
  document.documentElement.dataset.contrast = highContrast ? "high" : "normal";
}

export function AccessibilityControls() {
  const { language } = useInterfaceLanguage();
  const effectiveLanguage = useStaffPanel() ? "pt" : language;
  const t = accessibilityCopy[effectiveLanguage];
  const [scale, setScale] = useState<TextScale>("normal");
  const [highContrast, setHighContrast] = useState(false);
  const hasUserChangedPreference = useRef(false);

  useEffect(() => {
    const savedScale = localStorage.getItem("pronto-text-scale");
    const initialScale = scales.includes(savedScale as TextScale) ? savedScale as TextScale : "normal";
    const initialContrast = localStorage.getItem("pronto-high-contrast") === "true";
    if (!hasUserChangedPreference.current) {
      setScale(initialScale);
      setHighContrast(initialContrast);
      applyPreferences(initialScale, initialContrast);
    }
    document.documentElement.dataset.appReady = "true";
  }, []);

  useEffect(() => {
    const governmentBar = document.getElementById("barra-brasil");
    if (!governmentBar) return;
    const removeDuplicateShortcuts = () => {
      governmentBar.querySelectorAll<HTMLElement>("[accesskey]").forEach((element) => {
        const key = element.getAttribute("accesskey");
        if (key && document.querySelector(`.accessibility-bar [accesskey="${key}"]`)) element.removeAttribute("accesskey");
      });
    };
    const observer = new MutationObserver(removeDuplicateShortcuts);
    observer.observe(governmentBar, { subtree: true, childList: true, attributes: true, attributeFilter: ["accesskey"] });
    removeDuplicateShortcuts();
    return () => observer.disconnect();
  }, []);

  function changeScale(next: TextScale) {
    const previous = scale;
    hasUserChangedPreference.current = true;
    setScale(next);
    localStorage.setItem("pronto-text-scale", next);
    applyPreferences(next, highContrast);
    showPanelChange("Tamanho do texto alterado", () => { setScale(previous); localStorage.setItem("pronto-text-scale", previous); applyPreferences(previous, highContrast); });
  }

  function changeContrast() {
    hasUserChangedPreference.current = true;
    const next = !highContrast;
    setHighContrast(next);
    localStorage.setItem("pronto-high-contrast", String(next));
    applyPreferences(scale, next);
    showPanelChange("Contraste alterado", () => { setHighContrast(highContrast); localStorage.setItem("pronto-high-contrast", String(highContrast)); applyPreferences(scale, highContrast); });
  }

  const scaleIndex = scales.indexOf(scale);

  return (
    <nav className="accessibility-bar" aria-label={t[4]}>
      <div className="container accessibility-bar__inner">
        <div className="accessibility-bar__links">
          <a href="#conteudo" accessKey="1" aria-label={t[0]}><span className="accessibility-bar__link-label">{t[0]}</span><span className="accessibility-bar__link-mobile">{mobileLinkCopy[effectiveLanguage][0]}</span><span className="accessibility-bar__link-short" aria-hidden="true">[1]</span></a>
          <a href="#menu-principal" accessKey="2" aria-label={t[1]}><span className="accessibility-bar__link-label">{t[1]}</span><span className="accessibility-bar__link-mobile">{mobileLinkCopy[effectiveLanguage][1]}</span><span className="accessibility-bar__link-short" aria-hidden="true">[2]</span></a>
          <a href="/ajuda" accessKey="3" aria-label={t[2]}><span className="accessibility-bar__link-label">{t[2]}</span><span className="accessibility-bar__link-mobile">{mobileLinkCopy[effectiveLanguage][2]}</span><span className="accessibility-bar__link-short" aria-hidden="true">[3]</span></a>
          <a href="/acessibilidade" accessKey="4" aria-label={t[3]}><span className="accessibility-bar__link-label">{t[3]}</span><span className="accessibility-bar__link-mobile">{mobileLinkCopy[effectiveLanguage][3]}</span><span className="accessibility-bar__link-short" aria-hidden="true">[4]</span></a>
          <a href="/politica-de-privacidade" accessKey="5" aria-label={t[11]}><span className="accessibility-bar__link-label">{t[11]}</span><span className="accessibility-bar__link-mobile">{mobileLinkCopy[effectiveLanguage][4]}</span><span className="accessibility-bar__link-short" aria-hidden="true">[5]</span></a>
        </div>
        <div className="accessibility-bar__controls" role="group" aria-label={t[5]}>
          <button type="button" onClick={() => changeScale(scales[Math.max(0, scaleIndex - 1)])} disabled={scaleIndex === 0} aria-label={t[6]} title={t[6]}>A−</button>
          <button type="button" onClick={() => changeScale("normal")} disabled={scale === "normal"} aria-label={t[7]} title={t[7]}>A</button>
          <button type="button" onClick={() => changeScale(scales[Math.min(scales.length - 1, scaleIndex + 1)])} disabled={scaleIndex === scales.length - 1} aria-label={t[8]} title={t[8]}>A+</button>
          <button type="button" onClick={changeContrast} aria-pressed={highContrast} aria-label={t[9]} title={t[10]}><AppIcon name="contrast" /></button>
          <ThemeSwitcher />
        </div>
      </div>
    </nav>
  );
}
