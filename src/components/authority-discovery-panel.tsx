"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function AuthorityDiscoveryPanel({ children }: { children: ReactNode }) {
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [closing, setClosing] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const expanded = pointerInside || focusInside;

  const beginClosing = () => {
    setClosing(true);
  };

  useEffect(() => {
    if (expanded) { setClosing(false); return; }
    if (!closing) return;
    const timer = window.setTimeout(() => setClosing(false), 480);
    return () => window.clearTimeout(timer);
  }, [expanded, closing]);

  useEffect(() => {
    const landscape = sectionRef.current?.parentElement;
    if (!landscape) return;
    landscape.dataset.discoveryExpanded = String(expanded);
    return () => { delete landscape.dataset.discoveryExpanded; };
  }, [expanded]);

  useEffect(() => {
    const section = sectionRef.current;
    const landscape = section?.parentElement;
    if (!section || !landscape) return;
    let active = true;
    const measureCompactHeight = () => {
      if (active && section.dataset.expanded === "false") {
        landscape.style.setProperty("--authority-compact-height", `${Math.ceil(section.getBoundingClientRect().height)}px`);
      }
    };
    measureCompactHeight();
    window.addEventListener("resize", measureCompactHeight);
    void document.fonts.ready.then(measureCompactHeight);
    return () => {
      active = false;
      window.removeEventListener("resize", measureCompactHeight);
      landscape.style.removeProperty("--authority-compact-height");
    };
  }, []);

  useEffect(() => {
    if (!pointerInside) return;
    const closeWhenOutside = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const section = sectionRef.current;
      if (!section) return;
      const bounds = section.getBoundingClientRect();
      const search = section.querySelector(".authority-discovery-search--home")?.getBoundingClientRect();
      const map = section.querySelector(".authority-map-preview__canvas")?.getBoundingClientRect();
      const margin = 16;
      if (event.clientX < Math.min(bounds.left, search?.left ?? bounds.left, map?.left ?? bounds.left) - margin
        || event.clientX > Math.max(bounds.right, search?.right ?? bounds.right, map?.right ?? bounds.right) + margin
        || event.clientY < Math.min(bounds.top, search?.top ?? bounds.top, map?.top ?? bounds.top) - margin
        || event.clientY > Math.max(bounds.bottom, search?.bottom ?? bounds.bottom, map?.bottom ?? bounds.bottom) + margin) {
        beginClosing();
        setPointerInside(false);
      }
    };
    const closeOnWindowBlur = () => { beginClosing(); setPointerInside(false); };
    window.addEventListener("pointermove", closeWhenOutside);
    window.addEventListener("blur", closeOnWindowBlur);
    return () => {
      window.removeEventListener("pointermove", closeWhenOutside);
      window.removeEventListener("blur", closeOnWindowBlur);
    };
  }, [pointerInside]);

  return <section ref={sectionRef} className="authority-discovery" data-expanded={expanded} data-closing={closing && !expanded} aria-labelledby="authority-discovery-title"
    onPointerOver={(event) => {
      if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
      if (event.target.closest(".authority-discovery-search__control, .authority-discovery-search--home label, .authority-discovery-search--home button, .authority-discovery-search--home a, .authority-map-preview__canvas, .authority-discovery__mark, .authority-discovery__heading .eyebrow, .authority-discovery__heading h2, .authority-discovery__heading-copy p, .authority-discovery__popular a")) setPointerInside(true);
    }}
    onFocusCapture={() => setFocusInside(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { if (!pointerInside) beginClosing(); setFocusInside(false); } }}>
    {children}
  </section>;
}
