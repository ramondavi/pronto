"use client";

import { useEffect, useState } from "react";
import { useInterfaceLanguage } from "@/components/interface-language";
import type { InterfaceLanguage } from "@/lib/interface-language";

const sectionIds = ["inicio", "como-funciona", "vantagens", "duvidas-frequentes"] as const;
const sectionCopy: Record<InterfaceLanguage, { navigation: string; labels: readonly [string, string, string, string] }> = {
  pt: { navigation: "Seções da página inicial", labels: ["Início", "Como funciona", "Vantagens", "Dúvidas frequentes"] },
  en: { navigation: "Home page sections", labels: ["Home", "How it works", "Benefits", "Frequently asked questions"] },
  es: { navigation: "Secciones de la página inicial", labels: ["Inicio", "Cómo funciona", "Ventajas", "Preguntas frecuentes"] },
  de: { navigation: "Abschnitte der Startseite", labels: ["Start", "So funktioniert es", "Vorteile", "Häufige Fragen"] },
  fr: { navigation: "Sections de la page d’accueil", labels: ["Accueil", "Comment ça marche", "Avantages", "Questions fréquentes"] },
  it: { navigation: "Sezioni della pagina iniziale", labels: ["Inizio", "Come funziona", "Vantaggi", "Domande frequenti"] },
};

export function HomeSectionNavigation() {
  const { language } = useInterfaceLanguage();
  const [active, setActive] = useState<(typeof sectionIds)[number]>("inicio");

  useEffect(() => {
    let frame = 0;
    let offsetFrame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const marker = window.innerHeight * .45;
        let current: (typeof sectionIds)[number] = sectionIds[0];
        for (const id of sectionIds) {
          const section = document.getElementById(id);
          if (section && section.getBoundingClientRect().top <= marker) current = id;
        }
        const faq = document.getElementById("duvidas-frequentes");
        if (faq) document.documentElement.dataset.homeFooterScroll = String(window.scrollY >= faq.getBoundingClientRect().top + window.scrollY - 1);
        setActive(current);
      });
    };
    const updateStartOffset = () => {
      if (offsetFrame) window.cancelAnimationFrame(offsetFrame);
      offsetFrame = window.requestAnimationFrame(() => {
        offsetFrame = 0;
        const start = document.getElementById("inicio");
        if (start) document.documentElement.style.setProperty("--home-start-offset", `${Math.ceil(start.getBoundingClientRect().top + window.scrollY)}px`);
        if (window.scrollY < 50 && !window.location.hash) window.scrollTo({ top: 0, behavior: "instant" });
      });
      update();
    };
    const governmentBar = document.getElementById("barra-brasil");
    const barObserver = new ResizeObserver(updateStartOffset);
    if (governmentBar) barObserver.observe(governmentBar);
    updateStartOffset();
    void document.fonts.ready.then(updateStartOffset);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", updateStartOffset);
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(offsetFrame);
      barObserver.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", updateStartOffset);
      document.documentElement.style.removeProperty("--home-start-offset");
      delete document.documentElement.dataset.homeFooterScroll;
    };
  }, []);

  useEffect(() => {
    let lockedUntil = 0;
    let wheelDistance = 0;
    const onWheel = (event: WheelEvent) => {
      if (window.innerWidth <= 820 || event.ctrlKey || event.metaKey || event.altKey
        || window.matchMedia("(prefers-reduced-motion: reduce)").matches
        || document.documentElement.dataset.reduceMotion === "true") return;
      const target = event.target;
      if (target instanceof Element && target.closest(".authority-discovery-search__suggestions")) return;
      const sections = sectionIds.map((id) => document.getElementById(id));
      if (sections.some((section) => !section)) return;
      const tops = sections.map((section) => section!.getBoundingClientRect().top + window.scrollY);
      const direction = Math.sign(event.deltaY);
      if (!direction) return;
      let current = 0;
      for (let index = 1; index < tops.length; index++) if (window.scrollY >= tops[index] - 80) current = index;
      const section = sections[current]!;
      const sectionBottom = tops[current] + section.getBoundingClientRect().height;
      if ((current === 0 && direction < 0) || (current === sectionIds.length - 1 && direction > 0)
        || (current === sectionIds.length - 1 && window.scrollY > tops[current] + 36)
        || (current === 0 && section.dataset.discoveryExpanded === "true" && section.getBoundingClientRect().height > window.innerHeight + 48
          && direction > 0 && window.scrollY + window.innerHeight < sectionBottom - 36)
        || (current > 0 && section.getBoundingClientRect().height > window.innerHeight + 48
          && ((direction > 0 && window.scrollY + window.innerHeight < sectionBottom - 36)
            || (direction < 0 && window.scrollY > tops[current] + 36)))) return;
      event.preventDefault();
      if (Date.now() < lockedUntil) return;
      wheelDistance += event.deltaY;
      if (Math.abs(wheelDistance) < 28) return;
      const next = Math.max(0, Math.min(sectionIds.length - 1, current + direction));
      wheelDistance = 0;
      if (next === current) return;
      lockedUntil = Date.now() + 850;
      window.scrollTo({ top: tops[next], behavior: "smooth" });
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  const copy = sectionCopy[language];
  return <nav className="home-section-nav" aria-label={copy.navigation}>
    <ol>{sectionIds.map((id, index) => <li key={id}>
      <a href={`#${id}`} aria-label={copy.labels[index]} aria-current={active === id ? "location" : undefined}
        onClick={id === "inicio" ? (event) => { event.preventDefault(); window.history.replaceState(null, "", "#inicio"); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); } : undefined}>
        <span className="home-section-nav__dot" aria-hidden="true" />
        <span className="home-section-nav__label" aria-hidden="true">{copy.labels[index]}</span>
      </a>
    </li>)}</ol>
  </nav>;
}
