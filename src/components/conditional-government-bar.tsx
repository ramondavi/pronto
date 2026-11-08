"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { GovernmentBar } from "./government-bar";

export function ConditionalGovernmentBar({ portalLabel }: { portalLabel: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/guia-equipe")) return null;
  return <><GovernmentBar portalLabel={portalLabel} /><Script id="barra-brasil-oficial" src="https://barra.brasil.gov.br/barra_2.0.js" strategy="afterInteractive" /></>;
}
