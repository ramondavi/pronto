"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

export function AdminIndexNavigation({ children, label }: { children: ReactNode; label: string }) {
  const router = useRouter();

  function openNextLevel(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>("a[data-admin-index-destination]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const main = link.closest<HTMLElement>("main.admin-index-screen");
    if (!main || main.classList.contains("admin-index-screen--leaving")) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    link.classList.add("admin-index__card--leaving");
    main.classList.add("admin-index-screen--leaving");
    window.setTimeout(() => router.push(link.pathname + link.search + link.hash), 220);
  }

  return <div className="admin-index" aria-label={label} onClickCapture={openNextLevel}>{children}</div>;
}
