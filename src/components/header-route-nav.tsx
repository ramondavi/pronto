"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function HeaderRouteNav({ label, children }: { label: string; children: ReactNode }) {
  const pathname = usePathname();
  return <nav id="menu-principal" aria-label={label} className="site-header__nav" data-current-section={pathname.startsWith("/painel") ? "panel" : pathname.startsWith("/ajuda") ? "help" : pathname.startsWith("/autoridades") ? "explore" : undefined} tabIndex={-1}>{children}</nav>;
}
