"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { OfficialLibraryLogo } from "@/components/official-library-logo";
import { AppIcon } from "@/components/app-icon";
import styles from "./site-footer.module.css";
import { LanguageControl } from "./language-control";
import { useInterfaceLanguage } from "./interface-language";
import { useStaffPanel } from "./use-staff-panel";

const footerCopy = {
  pt: ["Fichas catalográficas e autodepósito", "Central de ajuda", "Privacidade", "Acessibilidade", "Feito pelos bibliotecários da BIB/FAUFBA com", "e", "amor", "Código aberto no GitHub", "Licença", "Informações", "Instituições"],
  en: ["Catalog records and self-deposit", "Help center", "Privacy", "Accessibility", "Made by the BIB/FAUFBA librarians with", "and", "love", "Open source on GitHub", "License", "Information", "Institutions"],
  es: ["Fichas catalográficas y autodepósito", "Centro de ayuda", "Privacidad", "Accesibilidad", "Creado por los bibliotecarios de BIB/FAUFBA con", "y", "amor", "Código abierto en GitHub", "Licencia", "Información", "Instituciones"],
  de: ["Katalogeinträge und Selbsteinreichung", "Hilfe", "Datenschutz", "Barrierefreiheit", "Erstellt von der BIB/FAUFBA-Bibliothek mit", "und", "Liebe", "Quellcode auf GitHub", "Lizenz", "Informationen", "Institutionen"],
  fr: ["Notices de catalogage et auto-dépôt", "Centre d’aide", "Confidentialité", "Accessibilité", "Créé par les bibliothécaires de la BIB/FAUFBA avec", "et", "amour", "Code source sur GitHub", "Licence", "Informations", "Institutions"],
  it: ["Schede catalografiche e autodeposito", "Centro assistenza", "Privacy", "Accessibilità", "Creato dai bibliotecari BIB/FAUFBA con", "e", "amore", "Codice su GitHub", "Licenza", "Informazioni", "Istituzioni"],
};

export function SiteFooter({ version }: { version: string }) {
  const { language } = useInterfaceLanguage();
  const pathname = usePathname();
  const staffPanel = useStaffPanel();
  const t = footerCopy[staffPanel ? "pt" : language];
  useEffect(() => {
    const footerRow = document.querySelector<HTMLElement>("[data-language-alignment]");
    const pageContent = document.querySelector<HTMLElement>(".card-publication-page__inner")
      ?? document.querySelector<HTMLElement>(".coordination-page__inner")
      ?? document.querySelector<HTMLElement>("body:has(.auth-shell) .accessibility-bar__inner")
      ?? document.querySelector<HTMLElement>("main.dashboard-main")
      ?? document.querySelector<HTMLElement>("main .container")
      ?? document.querySelector<HTMLElement>("main");
    if (!footerRow || !pageContent) return;

    const alignLanguageControl = () => {
      const offset = pageContent.getBoundingClientRect().left - footerRow.getBoundingClientRect().left;
      footerRow.style.setProperty("--language-align-offset", `${offset}px`);
    };
    alignLanguageControl();
    const observer = new ResizeObserver(alignLanguageControl);
    observer.observe(pageContent);
    observer.observe(footerRow);
    window.addEventListener("resize", alignLanguageControl);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", alignLanguageControl);
      footerRow.style.removeProperty("--language-align-offset");
    };
  }, [pathname]);
  return (
    <footer className={styles.footer} id="creditos">
      <div className={styles.decoration} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.topRow} data-language-alignment>
          {!staffPanel && <LanguageControl />}
          <div className={styles.signature}>
            <div className={styles.libraryBrand}><OfficialLibraryLogo variant="footer" /></div>
            <p>{t[0]}</p>
          </div>
        </div>
        <nav className={styles.navigation} aria-label={t[9]}>
          <Link href="/ajuda">{t[1]}</Link>
          <Link href="/politica-de-privacidade">{t[2]}</Link>
          <Link href="/acessibilidade">{t[3]}</Link>
        </nav>
        <div className={styles.institutions} aria-label={t[10]}>
          <a href="https://ufba.br" target="_blank" rel="noreferrer"><Image src="/brasao-ufba.png" alt="Universidade Federal da Bahia" width={1135} height={1739} /></a>
          <a href="https://sibi.ufba.br" target="_blank" rel="noreferrer"><Image src="/logo-sibi.png" alt="Sistema Universitário de Bibliotecas da UFBA" width={2876} height={850} /></a>
          <a href="https://arquitetura.ufba.br" target="_blank" rel="noreferrer"><Image src="/logo-faufba.png" alt="Faculdade de Arquitetura da UFBA" width={230} height={205} /></a>
        </div>
        <p className={styles.credit}>{t[4]} vibe coding {t[5]} <span aria-label={t[6]} role="img">♥</span>.</p>
        <div className={styles.meta}>
          <span>2026 · v{version} · Beta</span>
          <a href="https://github.com/ramondavi/pronto" target="_blank" rel="noreferrer"><AppIcon name="github" />{t[7]} ↗</a>
          <span>{t[8]} AGPL-3.0</span>
        </div>
      </div>
    </footer>
  );
}
