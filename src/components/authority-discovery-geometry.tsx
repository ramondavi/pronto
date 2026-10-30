"use client";

import { useEffect, useRef } from "react";

export function AuthorityDiscoveryGeometry() {
  const layerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layer = layerRef.current;
    const section = layer?.closest<HTMLElement>(".authority-discovery");
    if (!layer || !section) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = (event?: PointerEvent) => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        if (reduced.matches) { layer.style.setProperty("--parallax-x", "0px"); layer.style.setProperty("--parallax-y", "0px"); return; }
        const bounds = section.getBoundingClientRect();
        const x = event ? ((event.clientX - bounds.left) / bounds.width - .5) * 28 : 0;
        const y = event ? ((event.clientY - bounds.top) / bounds.height - .5) * 18 : 0;
        const scroll = Math.max(-36, Math.min(36, -bounds.top * .1));
        layer.style.setProperty("--parallax-x", `${x}px`);
        layer.style.setProperty("--parallax-y", `${y + scroll}px`);
      });
    };
    const onPointer = (event: PointerEvent) => { if (event.pointerType === "mouse") update(event); };
    const onScroll = () => update();
    section.addEventListener("pointermove", onPointer);
    window.addEventListener("scroll", onScroll, { passive: true });
    reduced.addEventListener("change", onScroll);
    onScroll();
    return () => { section.removeEventListener("pointermove", onPointer); window.removeEventListener("scroll", onScroll); reduced.removeEventListener("change", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);
  return <div className="authority-discovery__geometry" ref={layerRef} aria-hidden="true"><span className="authority-discovery__plan" /><span className="authority-discovery__arch" /><span className="authority-discovery__tower" /><span className="authority-discovery__steps" /><span className="authority-discovery__axis" /></div>;
}
