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
      // A fixed tooltip can use a transformed ancestor as its containing block.
      // Measure its viewport origin before converting the desired coordinates.
      tip.style.left = "0px";
      tip.style.top = "0px";
      const origin = tip.getBoundingClientRect();
      const scaleX = tip.offsetWidth ? origin.width / tip.offsetWidth : 1;
      const scaleY = tip.offsetHeight ? origin.height / tip.offsetHeight : 1;
      const height = origin.height;
      const left = Math.min(Math.max(anchor.left + anchor.width / 2 - origin.width / 2, leftLimit), rightLimit - origin.width);
      const above = anchor.top - height - 8;
      const below = anchor.bottom + 8;
      const top = above >= 12 ? above : Math.min(below, Math.max(12, window.innerHeight - height - 12));
      tip.style.left = `${(left - origin.left) / (scaleX || 1)}px`;
      tip.style.top = `${(Math.max(12, top) - origin.top) / (scaleY || 1)}px`;
      tip.dataset.placed = "";
    };

    const activate = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const trigger = target.closest<HTMLElement>(selector);
      if (!trigger) return;
      if (event.type === "focusin" && active !== trigger && trigger.closest(".request-form")) trigger.removeAttribute("data-tooltip-suppressed");
      active = trigger;
      place();
    };
    const deactivate = (event: FocusEvent | PointerEvent) => {
      if (!active || (event.relatedTarget instanceof Node && active.contains(event.relatedTarget))) return;
      if (active.closest(".request-form")) {
        if (event.type === "pointerout" && (event as PointerEvent).pointerType === "mouse" && !active.matches(":focus-within")) active.removeAttribute("data-tooltip-suppressed");
      } else {
        if (event.type === "pointerout" || (event.type === "focusout" && !active.matches(":hover"))) active.removeAttribute("data-tooltip-suppressed");
      }
      if (active.hasAttribute("data-tooltip-open")) return;
      if (active.matches(":hover, :focus-within")) return;
      active = null;
    };
    const suppressOnClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const trigger = event.target.closest<HTMLElement>(selector);
      if (trigger?.classList.contains("tooltip") && trigger.closest(".request-form")) {
        event.preventDefault();
        if (active && active !== trigger) active.removeAttribute("data-tooltip-open");
        active = trigger;
        if (trigger.hasAttribute("data-tooltip-open")) {
          trigger.removeAttribute("data-tooltip-open");
          trigger.setAttribute("data-tooltip-suppressed", "");
        } else {
          trigger.removeAttribute("data-tooltip-suppressed");
          trigger.setAttribute("data-tooltip-open", "");
          place();
        }
        return;
      }
      active?.removeAttribute("data-tooltip-open");
      trigger?.setAttribute("data-tooltip-suppressed", "");
      if (!trigger) active = null;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !active) return;
      active.removeAttribute("data-tooltip-open");
      active.setAttribute("data-tooltip-suppressed", "");
    };

    document.addEventListener("pointerover", activate);
    document.addEventListener("focusin", activate);
    document.addEventListener("pointerout", deactivate);
    document.addEventListener("focusout", deactivate);
    document.addEventListener("click", suppressOnClick);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerover", activate);
      document.removeEventListener("focusin", activate);
      document.removeEventListener("pointerout", deactivate);
      document.removeEventListener("focusout", deactivate);
      document.removeEventListener("click", suppressOnClick);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, []);
  return null;
}
