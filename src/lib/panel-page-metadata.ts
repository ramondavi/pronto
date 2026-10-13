import type { Metadata } from "next";

export function panelPageMetadata(pageTitle: string): Metadata {
  return { title: { absolute: `${pageTitle} | Painel | Pronto!` } };
}
