"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function AuthorityDiscoveryPanel({ children }: { children: ReactNode }) {
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const expanded = pointerInside || focusInside;

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
      const bounds = sectionRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const margin = 12;
      if (event.clientX < bounds.left - margin || event.clientX > bounds.right + margin
        || event.clientY < bounds.top - margin || event.clientY > bounds.bottom + margin) {
        setPointerInside(false);
      }
    };
    const closeOnWindowBlur = () => setPointerInside(false);
    window.addEventListener("pointermove", closeWhenOutside);
    window.addEventListener("blur", closeOnWindowBlur);
    return () => {
      window.removeEventListener("pointermove", closeWhenOutside);
      window.removeEventListener("blur", closeOnWindowBlur);
    };
  }, [pointerInside]);

  return <section ref={sectionRef} className="authority-discovery" data-expanded={expanded} aria-labelledby="authority-discovery-title"
    onPointerOver={(event) => {
      if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
      if (event.target.closest(".authority-discovery-search--home, .authority-discovery__mark, .authority-discovery__heading .eyebrow, .authority-discovery__heading h2, .authority-discovery__heading-copy p, .authority-discovery__area-link, .authority-discovery__popular a")) setPointerInside(true);
    }}
    onFocusCapture={() => setFocusInside(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusInside(false); }}>
    {children}
  </section>;
}
