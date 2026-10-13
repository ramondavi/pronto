"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useInterfaceLanguage } from "./interface-language";
import { useStaffPanel } from "./use-staff-panel";

const copy = {
  pt: ["Sobre cookies", "Usamos apenas cookies essenciais para sua sessão. As preferências ficam neste navegador. Ao continuar navegando, você toma ciência da nossa Política de privacidade.", "OK", "Saiba mais"],
  en: ["About cookies", "We use only essential cookies for your session. Preferences stay in this browser. By continuing to browse, you acknowledge our Privacy policy.", "OK", "Learn more"],
  es: ["Sobre las cookies", "Solo usamos cookies esenciales para su sesión. Las preferencias permanecen en este navegador. Al seguir navegando, toma conocimiento de nuestra Política de privacidad.", "OK", "Más información"],
  de: ["Über Cookies", "Wir verwenden nur notwendige Cookies für Ihre Sitzung. Einstellungen bleiben in diesem Browser. Wenn Sie weiter surfen, nehmen Sie unsere Datenschutzerklärung zur Kenntnis.", "OK", "Mehr erfahren"],
  fr: ["À propos des cookies", "Nous utilisons uniquement des cookies essentiels pour votre session. Vos préférences restent dans ce navigateur. En poursuivant votre navigation, vous prenez connaissance de notre Politique de confidentialité.", "OK", "En savoir plus"],
  it: ["Informazioni sui cookie", "Usiamo solo cookie essenziali per la sessione. Le preferenze restano in questo browser. Continuando a navigare, prendi visione della nostra Informativa sulla privacy.", "OK", "Scopri di più"],
};

const storageKey = "pronto-cookie-notice-seen-v2";

export function CookieNotice() {
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  const [visible, setVisible] = useState(false);
  const { language } = useInterfaceLanguage();
  const t = copy[useStaffPanel() ? "pt" : language];

  useEffect(() => { setVisible(localStorage.getItem(storageKey) !== "seen"); }, []);
  useEffect(() => {
    if (pathname !== firstPath.current) {
      localStorage.setItem(storageKey, "seen");
      setVisible(false);
    }
  }, [pathname]);
  useEffect(() => {
    const onNavigation = (event: MouseEvent) => {
      const target = event.target;
      const link = target instanceof Element ? target.closest("a[href]") : null;
      if (!link) return;
      const destination = new URL(link.getAttribute("href") ?? "", location.href);
      if (destination.origin === location.origin && destination.pathname !== location.pathname) {
        localStorage.setItem(storageKey, "seen");
        setVisible(false);
      }
    };
    document.addEventListener("click", onNavigation, true);
    return () => document.removeEventListener("click", onNavigation, true);
  }, []);

  const acknowledge = () => {
    localStorage.setItem(storageKey, "seen");
    setVisible(false);
  };

  if (!visible) return null;
  return <aside className="cookie-notice" aria-label={t[0]}>
    <div className="cookie-notice__inner"><div><strong>{t[0]}</strong><p>{t[1]}</p></div>
      <div className="cookie-notice__actions"><button type="button" className="button button--primary" onClick={acknowledge}>{t[2]}</button><Link className="button button--secondary" href="/politica-de-privacidade" onClick={acknowledge}>{t[3]}</Link></div>
    </div>
  </aside>;
}
