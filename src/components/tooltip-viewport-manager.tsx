"use client";

import { useEffect } from "react";

const selector = ".tooltip, .cataloging-classification__suggest-wrap";

export function TooltipViewportManager() {
  useEffect(() => {
    let active: HTMLElement | null = null;

    const place = () => {
      if (!active || !active.isConnected) return;
      const tip = active.querySelector<HTMLElement>('[role="tooltip"]');
      if (!tip) return;
      const anchor = active.getBoundingClientRect();
      const content = active.closest<HTMLElement>(".dashboard-content");
      const contentLeft = content?.getBoundingClientRect().left ?? 0;
      const leftLimit = Math.max(12, contentLeft + (content ? 12 : 0));
      const rightLimit = window.innerWidth - 12;
      const width = Math.max(0, Math.min(active.classList.contains("cataloging-classification__suggest-wrap") ? 360 : 320, rightLimit - leftLimit));
      tip.style.width = `${width}px`;
      const height = tip.getBoundingClientRect().height;
      const left = Math.min(Math.max(anchor.left + anchor.width / 2 - width / 2, leftLimit), rightLimit - width);
      const above = anchor.top - height - 8;
      const below = anchor.bottom + 8;
      const top = above >= 12 ? above : Math.min(below, Math.max(12, window.innerHeight - height - 12));
      tip.style.left = `${left}px`;
      tip.style.top = `${Math.max(12, top)}px`;
      tip.dataset.placed = "";
    };

    const activate = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>(selector);
      if (!trigger) return;
      active = trigger;
      place();
    };
    const deactivate = (event: FocusEvent | PointerEvent) => {
      if (!active || (event.relatedTarget instanceof Node && active.contains(event.relatedTarget))) return;
      if (event.type === "pointerout") active.removeAttribute("data-tooltip-suppressed");
      if (event.type === "focusout" && !active.matches(":hover")) active.removeAttribute("data-tooltip-suppressed");
      if (active.matches(":hover, :focus-within")) return;
      active = null;
    };
    const suppressOnClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      event.target.closest<HTMLElement>(selector)?.setAttribute("data-tooltip-suppressed", "");
    };

    document.addEventListener("pointerover", activate);
    document.addEventListener("focusin", activate);
    document.addEventListener("pointerout", deactivate);
    document.addEventListener("focusout", deactivate);
    document.addEventListener("click", suppressOnClick);
    document.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerover", activate);
      document.removeEventListener("focusin", activate);
      document.removeEventListener("pointerout", deactivate);
      document.removeEventListener("focusout", deactivate);
      document.removeEventListener("click", suppressOnClick);
      document.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, []);
  return null;
}
