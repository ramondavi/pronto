"use client";

import { useEffect, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { useInterfaceLanguage } from "./interface-language";
import { languageLabels, supportedLanguages } from "@/lib/interface-language";

const languageFlags = { pt: "🇧🇷", en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", fr: "🇫🇷", it: "🇮🇹" } as const;

const messages = {
  pt: { label: "Idioma da interface", detected: "Idioma do dispositivo: {language}.", keep: "Manter idioma atual", change: "Mudar para {language}", close: "Fechar aviso de idioma" },
  en: { label: "Interface language", detected: "Device language: {language}.", keep: "Keep current language", change: "Switch to {language}", close: "Close language notice" },
  es: { label: "Idioma de la interfaz", detected: "Idioma del dispositivo: {language}.", keep: "Mantener idioma actual", change: "Cambiar a {language}", close: "Cerrar aviso de idioma" },
  de: { label: "Sprache der Oberfläche", detected: "Gerätesprache: {language}.", keep: "Aktuelle Sprache behalten", change: "Zu {language} wechseln", close: "Sprachhinweis schließen" },
  fr: { label: "Langue de l’interface", detected: "Langue de l’appareil : {language}.", keep: "Garder cette langue", change: "Passer à {language}", close: "Fermer l’avis de langue" },
  it: { label: "Lingua dell’interfaccia", detected: "Lingua del dispositivo: {language}.", keep: "Mantieni questa lingua", change: "Passa a {language}", close: "Chiudi l’avviso sulla lingua" },
};

export function LanguageControl() {
  const { language, deviceLanguage, hasPreference, setLanguage } = useInterfaceLanguage();
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { setDismissed(sessionStorage.getItem("pronto-language-notice-dismissed") === "true"); }, []);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  const message = messages[language];
  const mismatch = hasPreference && language !== deviceLanguage;
  const showSuggestion = mismatch && (!dismissed || hovered);
  const dismiss = () => { setDismissed(true); setHovered(false); sessionStorage.setItem("pronto-language-notice-dismissed", "true"); };
  const stayOpen = () => { if (closeTimer.current) clearTimeout(closeTimer.current); setHovered(true); };
  const closeAfterPointerLeaves = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setHovered(false), 180); };
  const changeLanguage = (value: string) => { setLanguage(value as typeof language); setDismissed(false); };
  return <div className="language-control">
    <label className="language-control__select language-control__select--desktop"><AppIcon name="globe" /><span className="sr-only">{message.label}</span><select aria-label={message.label} value={language} onChange={(event) => changeLanguage(event.target.value)}>{supportedLanguages.map((option) => <option key={option} value={option}>{languageLabels[option]}</option>)}</select></label>
    <label className="language-control__select language-control__select--touch"><AppIcon name="globe" /><span className="sr-only">{message.label}</span><select aria-label={message.label} value={language} onChange={(event) => changeLanguage(event.target.value)}>{supportedLanguages.map((option) => <option key={option} value={option}>{languageFlags[option]}</option>)}</select></label>
    {mismatch && <div className="language-control__notice" onMouseEnter={stayOpen} onMouseLeave={closeAfterPointerLeaves} onFocusCapture={stayOpen} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeAfterPointerLeaves(); }}><button type="button" className="language-control__info" aria-label={message.detected.replace("{language}", languageLabels[deviceLanguage])} aria-expanded={showSuggestion} onClick={() => setHovered((current) => !current)}><AppIcon name="help" /></button>{showSuggestion && <div className="language-control__suggestion" role="status"><button className="language-control__close" type="button" aria-label={message.close} onClick={dismiss}><AppIcon name="close" /></button><span>{message.detected.replace("{language}", languageLabels[deviceLanguage])}</span><button type="button" onClick={() => { setLanguage(deviceLanguage); dismiss(); }}>{message.change.replace("{language}", languageLabels[deviceLanguage])}</button><button type="button" onClick={dismiss}>{message.keep}</button></div>}</div>}
  </div>;
}
