"use client";

import { useEffect, useRef, useState } from "react";
import { showPanelChange } from "@/components/panel-change-toast";
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
const extraCopy = {
  pt: ["Reduzir animações", "Destacar links", "Espaçar texto", "Restaurar ajustes"],
  en: ["Reduce animations", "Highlight links", "Increase text spacing", "Reset settings"],
  es: ["Reducir animaciones", "Destacar enlaces", "Espaciar texto", "Restablecer ajustes"],
  de: ["Animationen reduzieren", "Links hervorheben", "Textabstand erhöhen", "Einstellungen zurücksetzen"],
  fr: ["Réduire les animations", "Mettre les liens en évidence", "Espacer le texte", "Réinitialiser"],
  it: ["Ridurre le animazioni", "Evidenziare i link", "Aumentare la spaziatura", "Ripristinare"],
} as const;
const closeCopy = { pt: "Fechar recursos", en: "Close tools", es: "Cerrar herramientas", de: "Werkzeuge schließen", fr: "Fermer les outils", it: "Chiudi gli strumenti" } as const;

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
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highlightLinks, setHighlightLinks] = useState(false);
  const [spacedText, setSpacedText] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const widgetRef = useRef<HTMLElement>(null);
  const hasUserChangedPreference = useRef(false);

  useEffect(() => {
    const savedScale = localStorage.getItem("pronto-text-scale");
    const initialScale = scales.includes(savedScale as TextScale) ? savedScale as TextScale : "normal";
    const initialContrast = localStorage.getItem("pronto-high-contrast") === "true";
    const initialMotion = localStorage.getItem("pronto-reduce-motion") === "true";
    const initialLinks = localStorage.getItem("pronto-highlight-links") === "true";
    const initialSpacing = localStorage.getItem("pronto-spaced-text") === "true";
    if (!hasUserChangedPreference.current) {
      setScale(initialScale);
      setHighContrast(initialContrast);
      setReduceMotion(initialMotion);
      setHighlightLinks(initialLinks);
      setSpacedText(initialSpacing);
      applyPreferences(initialScale, initialContrast);
      document.documentElement.dataset.reduceMotion = String(initialMotion);
      document.documentElement.dataset.highlightLinks = String(initialLinks);
      document.documentElement.dataset.spacedText = String(initialSpacing);
    }
    document.documentElement.dataset.appReady = "true";
  }, []);

  useEffect(() => {
    const governmentBar = document.getElementById("barra-brasil");
    if (!governmentBar) return;
    const removeDuplicateShortcuts = () => {
      governmentBar.querySelectorAll<HTMLElement>("[accesskey]").forEach((element) => {
        const key = element.getAttribute("accesskey");
        if (key && document.querySelector(`.accessibility-widget [accesskey="${key}"]`)) element.removeAttribute("accesskey");
      });
    };
    const observer = new MutationObserver(removeDuplicateShortcuts);
    observer.observe(governmentBar, { subtree: true, childList: true, attributes: true, attributeFilter: ["accesskey"] });
    removeDuplicateShortcuts();
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    let frame = 0;
    let discoveryTimer = 0;
    let observedButton: HTMLElement | null = null;
    let detachButton: (() => void) | null = null;
    const resizeObserver = new ResizeObserver(() => positionBesideVlibras());
    const positionBesideVlibras = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // A Barra Brasil injeta a marcação antiga, mas o script atual cria o
        // botão e o balão visíveis dentro de uma shadow root.
        const legacyButton = document.querySelector<HTMLElement>("[vw-access-button] .access-button");
        const button = legacyButton ?? (window as Window & { VLibrasWidget?: { initBtn?: HTMLElement } }).VLibrasWidget?.initBtn;
        const widget = widgetRef.current;
        if (!button?.isConnected || !widget) return;
        if (button !== observedButton) {
          if (observedButton) resizeObserver.unobserve(observedButton);
          detachButton?.();
          resizeObserver.observe(button);
          observedButton = button;
          const properties = ["opacity", "transition"];
          const previous = properties.map((property) => ({ property, value: button.style.getPropertyValue(property), priority: button.style.getPropertyPriority(property) }));
          const root = button.getRootNode();
          const popup = root instanceof ShadowRoot ? root.querySelector<HTMLElement>("#vlibras-popup") : null;
          const popupStyle = popup ? document.createElement("style") : null;
          if (popupStyle && root instanceof ShadowRoot) {
            popupStyle.textContent = "#vlibras-popup { visibility: hidden; pointer-events: none; } #vlibras-access:is(:hover, :focus-within) #vlibras-popup { visibility: visible; }";
            root.appendChild(popupStyle);
          }
          const normalOpacity = () => document.documentElement.dataset.contrast === "high" ? "1" : ".62";
          const show = () => { button.style.setProperty("opacity", "1", "important"); };
          const dim = () => { button.style.setProperty("opacity", normalOpacity(), "important"); };
          button.style.setProperty("transition", "opacity .18s ease", "important");
          if (button.matches(":hover, :focus-visible")) show(); else dim();
          button.addEventListener("pointerenter", show);
          button.addEventListener("pointerleave", dim);
          button.addEventListener("focusin", show);
          button.addEventListener("focusout", dim);
          detachButton = () => {
            button.removeEventListener("pointerenter", show);
            button.removeEventListener("pointerleave", dim);
            button.removeEventListener("focusin", show);
            button.removeEventListener("focusout", dim);
            for (const { property, value, priority } of previous) {
              if (value) button.style.setProperty(property, value, priority);
              else button.style.removeProperty(property);
            }
            popupStyle?.remove();
          };
        }
        const bounds = button.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        if (discoveryTimer) { window.clearInterval(discoveryTimer); discoveryTimer = 0; }
        widget.style.setProperty("--access-widget-size", `${bounds.width}px`);
        widget.style.setProperty("--access-widget-height", `${bounds.height}px`);
        widget.style.setProperty("--access-widget-right", `${Math.max(0, document.documentElement.clientWidth - bounds.right - 1)}px`);
        document.documentElement.style.setProperty("--access-widget-size", `${bounds.width}px`);
        document.documentElement.style.setProperty("--access-widget-right", `${Math.max(0, document.documentElement.clientWidth - bounds.right - 1)}px`);
        widget.style.setProperty("--access-widget-top", `${Math.max(12, bounds.top - bounds.height - 10)}px`);
      });
    };
    const observer = new MutationObserver(positionBesideVlibras);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", positionBesideVlibras);
    window.addEventListener("scroll", positionBesideVlibras, { passive: true });
    window.addEventListener("pointerup", positionBesideVlibras);
    discoveryTimer = window.setInterval(positionBesideVlibras, 300);
    positionBesideVlibras();
    return () => { observer.disconnect(); resizeObserver.disconnect(); detachButton?.(); window.clearInterval(discoveryTimer); window.removeEventListener("resize", positionBesideVlibras); window.removeEventListener("scroll", positionBesideVlibras); window.removeEventListener("pointerup", positionBesideVlibras); cancelAnimationFrame(frame); document.documentElement.style.removeProperty("--access-widget-size"); document.documentElement.style.removeProperty("--access-widget-right"); };
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
  const extras = extraCopy[effectiveLanguage];
  const toggleExtra = (current: boolean, setter: (value: boolean) => void, storage: string, attribute: string) => {
    hasUserChangedPreference.current = true;
    setter(!current);
    localStorage.setItem(storage, String(!current));
    document.documentElement.dataset[attribute] = String(!current);
  };
  const reset = () => {
    hasUserChangedPreference.current = true;
    setScale("normal"); setHighContrast(false); setReduceMotion(false); setHighlightLinks(false); setSpacedText(false);
    localStorage.setItem("pronto-text-scale", "normal"); localStorage.setItem("pronto-high-contrast", "false");
    localStorage.setItem("pronto-reduce-motion", "false"); localStorage.setItem("pronto-highlight-links", "false"); localStorage.setItem("pronto-spaced-text", "false");
    applyPreferences("normal", false);
    document.documentElement.dataset.reduceMotion = "false";
    document.documentElement.dataset.highlightLinks = "false";
    document.documentElement.dataset.spacedText = "false";
  };

  return (
    <nav ref={widgetRef} className="accessibility-widget" aria-label={t[4]}>
      <button ref={triggerRef} className="accessibility-widget__trigger" type="button" aria-label={t[4]} aria-expanded={open} aria-controls="accessibility-widget-panel" onClick={() => setOpen((current) => !current)}><AppIcon name="eye" /></button>
      <div className={`accessibility-widget__panel${open ? " is-open" : ""}`} id="accessibility-widget-panel" inert={!open}>
        <div className="accessibility-widget__heading"><strong>{t[4]}</strong><button type="button" aria-label={closeCopy[effectiveLanguage]} onClick={() => { setOpen(false); triggerRef.current?.focus(); }}><AppIcon name="close" /></button></div>
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
        </div>
        <div className="accessibility-widget__extras" role="group" aria-label={t[5]}>
          <button type="button" aria-pressed={reduceMotion} onClick={() => toggleExtra(reduceMotion, setReduceMotion, "pronto-reduce-motion", "reduceMotion")}>{extras[0]}</button>
          <button type="button" aria-pressed={highlightLinks} onClick={() => toggleExtra(highlightLinks, setHighlightLinks, "pronto-highlight-links", "highlightLinks")}>{extras[1]}</button>
          <button type="button" aria-pressed={spacedText} onClick={() => toggleExtra(spacedText, setSpacedText, "pronto-spaced-text", "spacedText")}>{extras[2]}</button>
          <button type="button" onClick={reset}>{extras[3]}</button>
        </div>
      </div>
    </nav>
  );
}
