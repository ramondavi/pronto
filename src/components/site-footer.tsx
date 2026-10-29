"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { OfficialLibraryLogo } from "@/components/official-library-logo";
import { AppIcon } from "@/components/app-icon";
import styles from "./site-footer.module.css";
import { LanguageControl } from "./language-control";
import { useInterfaceLanguage } from "./interface-language";
import { useStaffPanel } from "./use-staff-panel";
import { ThemeSwitcher } from "./theme-switcher";
import { LibrarySocialLinks } from "./library-social-links";

const footerCopy = {
  pt: ["Fichas catalográficas e autodepósito", "Central de ajuda", "Privacidade", "Acessibilidade", "Feito pelos bibliotecários da BIB/FAUFBA com", "e", "amor", "Código aberto no GitHub", "Licença", "Informações", "Instituições", "Catálogo de autoridades"],
  en: ["Catalog records and self-deposit", "Help center", "Privacy", "Accessibility", "Made by the BIB/FAUFBA librarians with", "and", "love", "Open source on GitHub", "License", "Information", "Institutions", "Authority catalog"],
  es: ["Fichas catalográficas y autodepósito", "Centro de ayuda", "Privacidad", "Accesibilidad", "Creado por los bibliotecarios de BIB/FAUFBA con", "y", "amor", "Código abierto en GitHub", "Licencia", "Información", "Instituciones", "Catálogo de autoridades"],
  de: ["Katalogeinträge und Selbsteinreichung", "Hilfe", "Datenschutz", "Barrierefreiheit", "Erstellt von der BIB/FAUFBA-Bibliothek mit", "und", "Liebe", "Quellcode auf GitHub", "Lizenz", "Informationen", "Institutionen", "Normdatenkatalog"],
  fr: ["Notices de catalogage et auto-dépôt", "Centre d’aide", "Confidentialité", "Accessibilité", "Créé par les bibliothécaires de la BIB/FAUFBA avec", "et", "amour", "Code source sur GitHub", "Licence", "Informations", "Institutions", "Catalogue d’autorités"],
  it: ["Schede catalografiche e autodeposito", "Centro assistenza", "Privacy", "Accessibilità", "Creato dai bibliotecari BIB/FAUFBA con", "e", "amore", "Codice su GitHub", "Licenza", "Informazioni", "Istituzioni", "Catalogo delle autorità"],
};

export function SiteFooter({ version }: { version: string }) {
  const { language } = useInterfaceLanguage();
  const pathname = usePathname();
  const staffPanel = useStaffPanel();
  const t = footerCopy[staffPanel ? "pt" : language];
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasAutoPlayedRef = useRef(false);
  const [animateLibrary, setAnimateLibrary] = useState(false);
  const [animationRun, setAnimationRun] = useState(0);
  const startLibraryAnimation = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    setAnimationRun((run) => run + 1);
    setAnimateLibrary(true);
    animationTimerRef.current = setTimeout(() => setAnimateLibrary(false), 4200);
  }, []);
  useEffect(() => {
    const checkPageEnd = () => {
      if (hasAutoPlayedRef.current) return;
      const page = document.documentElement;
      if (window.scrollY + window.innerHeight < page.scrollHeight - 8) return;
      hasAutoPlayedRef.current = true;
      startLibraryAnimation();
      window.removeEventListener("scroll", checkPageEnd);
      window.removeEventListener("resize", checkPageEnd);
    };
    window.addEventListener("scroll", checkPageEnd, { passive: true });
    window.addEventListener("resize", checkPageEnd);
    window.addEventListener("load", checkPageEnd);
    const frame = requestAnimationFrame(checkPageEnd);
    const restorationCheck = setTimeout(checkPageEnd, 350);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(restorationCheck);
      window.removeEventListener("scroll", checkPageEnd);
      window.removeEventListener("resize", checkPageEnd);
      window.removeEventListener("load", checkPageEnd);
    };
  }, [startLibraryAnimation]);
  useEffect(() => () => {
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
  }, []);
  useEffect(() => {
    const footerRow = document.querySelector<HTMLElement>("[data-language-alignment]");
    if (!footerRow) return;
    const contentRoot = document.getElementById("conteudo");
    let observedContent: HTMLElement | null = null;
    let frame = 0;
    const findPageContent = () => [
      ".card-publication-page__inner",
      ".coordination-page__inner",
      ".auth-shell",
      "main.dashboard-main",
      "main .container",
      "main",
    ].map((selector) => contentRoot?.querySelector<HTMLElement>(selector)).find((element) => element && element.getBoundingClientRect().width > 0) ?? null;
    const alignLanguageControl = () => {
      frame = 0;
      const pageContent = findPageContent();
      if (observedContent !== pageContent) {
        if (observedContent) resizeObserver.unobserve(observedContent);
        observedContent = pageContent;
        if (observedContent) resizeObserver.observe(observedContent);
      }
      if (!pageContent) return;
      const contentLeft = pageContent.getBoundingClientRect().left;
      const rowLeft = footerRow.getBoundingClientRect().left;
      if (contentLeft < 8 || !Number.isFinite(contentLeft) || !Number.isFinite(rowLeft)) return;
      footerRow.style.setProperty("--language-align-offset", `${contentLeft - rowLeft}px`);
    };
    const scheduleAlignment = () => { if (!frame) frame = requestAnimationFrame(alignLanguageControl); };
    const resizeObserver = new ResizeObserver(scheduleAlignment);
    resizeObserver.observe(footerRow);
    const mutationObserver = new MutationObserver(scheduleAlignment);
    if (contentRoot) mutationObserver.observe(contentRoot, { childList: true, subtree: true });
    scheduleAlignment();
    window.addEventListener("resize", scheduleAlignment);
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", scheduleAlignment);
      footerRow.style.removeProperty("--language-align-offset");
    };
  }, [pathname]);
  return (
    <footer className={styles.footer} id="creditos">
      <div className={styles.decoration} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.topRow} data-language-alignment>
          <div className={styles.footerPreferences}>{!staffPanel && <LanguageControl />}<ThemeSwitcher /></div>
          <div className={styles.signature}>
            <div className={styles.libraryBrand} onMouseEnter={startLibraryAnimation} onFocus={startLibraryAnimation}>
              <OfficialLibraryLogo variant="footer" />
              {animateLibrary && <div className={styles.libraryPages} key={`pages-${animationRun}`} aria-hidden="true">
                {["Arquitetura", "Urbanismo", "e muito +"].map((word) => (
                  <span key={word}><svg viewBox="0 0 779 194" focusable="false"><text x="389.5" y="163" textAnchor="middle" textLength="711" lengthAdjust="spacingAndGlyphs">{word}</text></svg></span>
                ))}
              </div>}
              {animateLibrary && <svg className={styles.libraryCutLines} key={`cuts-${animationRun}`} viewBox="0 0 779 325" aria-hidden="true" focusable="false">
                <path className={styles.cutLineA} pathLength="100" d="M278 218H799" />
                <path className={styles.cutLineB} pathLength="100" d="M799 321H278" />
                <path className={styles.cutLineC} pathLength="100" d="M317 350V188" />
                <path className={styles.cutLineD} pathLength="100" d="M760 188V350" />
                <path className={styles.cutMarkA} pathLength="100" d="M294 218h47 M317 194v49" />
                <path className={styles.cutMarkB} pathLength="100" d="M736 218h47 M760 194v49" />
                <path className={styles.cutMarkC} pathLength="100" d="M294 321h47 M317 298v45" />
                <path className={styles.cutMarkD} pathLength="100" d="M736 321h47 M760 298v45" />
              </svg>}
            </div>
          </div>
        </div>
        <nav className={styles.navigation} aria-label={t[9]}>
          <Link href="/ajuda">{t[1]}</Link>
          <Link href="/autoridades">{t[11]}</Link>
          <Link href="/politica-de-privacidade">{t[2]}</Link>
          <Link href="/acessibilidade">{t[3]}</Link>
        </nav>
        <div className={styles.institutions} aria-label={t[10]}>
          <a href="https://ufba.br" target="_blank" rel="noreferrer"><Image src="/brasao-ufba.png" alt="Universidade Federal da Bahia" width={1135} height={1739} /></a>
          <a href="https://sibi.ufba.br" target="_blank" rel="noreferrer"><Image src="/logo-sibi.png" alt="Sistema Universitário de Bibliotecas da UFBA" width={2876} height={850} /></a>
          <a href="https://arquitetura.ufba.br" target="_blank" rel="noreferrer"><Image src="/logo-faufba.png" alt="Faculdade de Arquitetura da UFBA" width={230} height={205} /></a>
        </div>
        <p className={styles.credit}><span className={styles.creditLead}>{t[4]}</span> <a href="https://openai.com/codex/" target="_blank" rel="noreferrer"><em>vibe coding</em></a> {t[5]} <span aria-label={t[6]} role="img">♥</span>.</p>
        <div className={styles.mobileSocial}><LibrarySocialLinks /></div>
        <div className={styles.meta}>
          <span>2026 · v{version} · Beta</span>
          <a href="https://github.com/ramondavi/pronto" target="_blank" rel="noreferrer"><AppIcon name="github" />{t[7]} ↗</a>
          <span>{t[8]} AGPL-3.0</span>
        </div>
      </div>
    </footer>
  );
}
