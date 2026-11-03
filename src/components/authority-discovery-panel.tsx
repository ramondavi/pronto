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

  return <section ref={sectionRef} className="authority-discovery" data-expanded={expanded} aria-labelledby="authority-discovery-title"
    onPointerEnter={(event) => { if (event.pointerType === "mouse") setPointerInside(true); }}
    onPointerLeave={(event) => { if (event.pointerType === "mouse") setPointerInside(false); }}
    onFocusCapture={() => setFocusInside(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusInside(false); }}>
    {children}
  </section>;
}
