"use client";

import { useEffect, useRef } from "react";
import { Geometry } from "@/components/geometry";

export function HeroGeometry() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const hero = layer?.closest<HTMLElement>(".hero");
    if (!layer || !hero) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cursorX = 0;
    let cursorY = 0;
    let scrollY = 0;
    let frame = 0;
    let listening = false;

    const paint = () => {
      frame = 0;
      layer.style.setProperty("--hero-cursor-x", `${cursorX}px`);
      layer.style.setProperty("--hero-cursor-y", `${cursorY}px`);
      layer.style.setProperty("--hero-scroll-y", `${scrollY}px`);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(paint); };
    const onScroll = () => {
      scrollY = Math.max(-72, Math.min(72, -hero.getBoundingClientRect().top * 0.12));
      schedule();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const bounds = layer.getBoundingClientRect();
      cursorX = event.clientX - bounds.left;
      cursorY = event.clientY - bounds.top;
      layer.dataset.pointerActive = "true";
      schedule();
    };
    const onPointerLeave = () => { layer.dataset.pointerActive = "false"; };
    const syncMotion = () => {
      if (reducedMotion.matches) {
        if (listening) {
          hero.removeEventListener("pointermove", onPointerMove);
          hero.removeEventListener("pointerleave", onPointerLeave);
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
          listening = false;
        }
        layer.dataset.pointerActive = "false";
        cursorX = 0; cursorY = 0; scrollY = 0;
        schedule();
      } else if (!listening) {
        hero.addEventListener("pointermove", onPointerMove);
        hero.addEventListener("pointerleave", onPointerLeave);
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        listening = true;
        onScroll();
      }
    };

    reducedMotion.addEventListener("change", syncMotion);
    syncMotion();
    return () => {
      reducedMotion.removeEventListener("change", syncMotion);
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="hero__geometry-motion" ref={layerRef} aria-hidden="true"><Geometry repeat /><Geometry repeat accent /></div>;
}
