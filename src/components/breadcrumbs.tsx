"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useInterfaceLanguage } from "./interface-language";
import { breadcrumbCopy, dashboardTrail } from "@/lib/breadcrumb-copy";
import { AppIcon } from "./app-icon";

type Crumb = { label: string; href?: string };

const DashboardProtocolContext = createContext<{ protocol: string | null; setProtocol: (value: string | null) => void }>({ protocol: null, setProtocol: () => undefined });

export function DashboardBreadcrumbProvider({ children }: { children: ReactNode }) {
  const [protocol, setProtocol] = useState<string | null>(null);
  return <DashboardProtocolContext.Provider value={{ protocol, setProtocol }}>{children}</DashboardProtocolContext.Provider>;
}

export function DashboardBreadcrumbProtocol({ protocol }: { protocol: string }) {
  const { setProtocol } = useContext(DashboardProtocolContext);
  useEffect(() => { setProtocol(protocol); return () => setProtocol(null); }, [protocol, setProtocol]);
  return null;
}

function Trail({ items, variant }: { items: Crumb[]; variant: "public" | "dashboard" }) {
  const { language } = useInterfaceLanguage();
  if (items.length < 2) return null;
  return <nav className={`breadcrumb breadcrumb--${variant}`} aria-label={breadcrumbCopy[language][0]}><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{item.href && index < items.length - 1 ? <Link href={item.href}>{index === 0 && <AppIcon name="home" />}{item.label}</Link> : <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span>}{index < items.length - 1 && <AppIcon className="breadcrumb__separator" name="arrowRight" />}</li>)}</ol></nav>;
}

export function PublicBreadcrumbs({ articleTitle }: { articleTitle?: string }) {
  const pathname = usePathname();
  const { language } = useInterfaceLanguage(); const t = breadcrumbCopy[language];
  if (pathname.startsWith("/ajuda/artigos/") && articleTitle) return <Trail variant="public" items={[{ label: t[1], href: "/" }, { label: t[2], href: "/ajuda" }, { label: articleTitle }]} />;
  const labels: Record<string, string> = { "/ajuda": t[2], "/perguntas-frequentes": t[2], "/politica-de-privacidade": t[3], "/acessibilidade": t[4] };
  const label = labels[pathname];
  return label ? <Trail variant="public" items={[{ label: t[1], href: "/" }, { label }]} /> : null;
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { protocol } = useContext(DashboardProtocolContext);
  const { language } = useInterfaceLanguage();
  if (pathname === "/painel") return null;
  return <Trail variant="dashboard" items={dashboardTrail(language, pathname, { responsible: searchParams.get("responsavel"), area: searchParams.get("area"), tab: searchParams.get("aba"), origin: searchParams.get("origem"), protocol: pathname.startsWith("/painel/atendimento/") ? protocol : null })} />;
}
