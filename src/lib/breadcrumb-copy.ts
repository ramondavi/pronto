import { adminSections, adminTabHref, resolveAdminLocation } from "@/lib/admin-navigation";

export const breadcrumbCopy = {
  pt: ["Caminho de navegação", "Início", "Central de ajuda", "Política de privacidade", "Acessibilidade", "Visão geral", "Fila de solicitações", "Atendimento", "Ficha catalográfica", "Minhas solicitações", "Nova solicitação", "Corrigir solicitação", "Autodepósito", "Administração", "Programas e coordenações", "Minha conta", "Meus atendimentos", "Avaliação do atendimento", "Avaliações", "Operação", "Conteúdo", "Controle"],
  en: ["Navigation path", "Home", "Help center", "Privacy policy", "Accessibility", "Overview", "Request queue", "Service", "Catalog record", "My requests", "New request", "Correct request", "Self-deposit", "Administration", "Programs and coordinators", "My account", "My cases", "Service evaluation", "Evaluations", "Operations", "Content", "Control"],
  es: ["Ruta de navegación", "Inicio", "Centro de ayuda", "Política de privacidad", "Accesibilidad", "Resumen", "Solicitudes", "Atención", "Ficha catalográfica", "Mis solicitudes", "Nueva solicitud", "Corregir solicitud", "Autodepósito", "Administración", "Programas y coordinaciones", "Mi cuenta", "Mis atenciones", "Evaluación del servicio", "Evaluaciones", "Operación", "Contenido", "Control"],
  de: ["Navigationspfad", "Startseite", "Hilfe", "Datenschutzerklärung", "Barrierefreiheit", "Übersicht", "Anfragen", "Bearbeitung", "Katalogeintrag", "Meine Anfragen", "Neue Anfrage", "Anfrage korrigieren", "Selbsteinreichung", "Verwaltung", "Studiengänge und Koordination", "Mein Konto", "Meine Fälle", "Servicebewertung", "Bewertungen", "Betrieb", "Inhalt", "Kontrolle"],
  fr: ["Fil d’Ariane", "Accueil", "Centre d’aide", "Politique de confidentialité", "Accessibilité", "Vue d’ensemble", "Demandes", "Traitement", "Notice de catalogage", "Mes demandes", "Nouvelle demande", "Corriger la demande", "Auto-dépôt", "Administration", "Programmes et coordinations", "Mon compte", "Mes dossiers", "Évaluation du service", "Évaluations", "Opération", "Contenu", "Contrôle"],
  it: ["Percorso di navigazione", "Home", "Centro assistenza", "Informativa sulla privacy", "Accessibilità", "Panoramica", "Richieste", "Assistenza", "Scheda catalografica", "Le mie richieste", "Nuova richiesta", "Correggi la richiesta", "Autodeposito", "Amministrazione", "Programmi e coordinamenti", "Il mio account", "I miei casi", "Valutazione del servizio", "Valutazioni", "Operazione", "Contenuto", "Controllo"],
};

export type DashboardCrumb = { label: string; href?: string };

export function dashboardTrail(language: keyof typeof breadcrumbCopy, pathname: string, options: { responsible?: string | null; area?: string | null; tab?: string | null; origin?: string | null; protocol?: string | null } = {}): DashboardCrumb[] {
  const t = breadcrumbCopy[language];
  const items: DashboardCrumb[] = [{ label: t[5], href: "/painel" }];
  if (pathname === "/painel") return [{ label: t[5] }];
  if (pathname === "/painel/fila") {
    items.push({ label: t[6], href: options.responsible === "me" ? "/painel/fila" : undefined });
    if (options.responsible === "me") items.push({ label: t[16] });
  } else if (pathname.startsWith("/painel/atendimento/")) {
    items.push({ label: t[6], href: "/painel/fila" });
    if (options.origin === "meus") items.push({ label: t[16], href: "/painel/fila?responsavel=me" });
    const requestPath = pathname.endsWith("/ficha") ? pathname.slice(0, -6) : pathname;
    items.push({ label: options.protocol ?? t[7], href: pathname.endsWith("/ficha") ? `${requestPath}${options.origin === "meus" ? "?origem=meus" : ""}` : undefined });
    if (pathname.endsWith("/ficha")) items.push({ label: t[8] });
  } else if (pathname.startsWith("/painel/solicitacao")) {
    items.push({ label: t[9], href: pathname === "/painel/solicitacao" ? undefined : "/painel/solicitacao" });
    if (pathname.endsWith("/nova")) items.push({ label: t[10] });
    if (pathname.endsWith("/corrigir")) items.push({ label: t[11] });
  } else if (pathname === "/painel/autodeposito") items.push({ label: t[12] });
  else if (pathname === "/painel/calendario") items.push({ label: "Calendário da biblioteca" });
  else if (pathname === "/painel/horarios") items.push({ label: "Horários da biblioteca" });
  else if (pathname === "/painel/visao-estudante") items.push({ label: "Visão de estudante" });
  else if (pathname === "/painel/admin/programas") items.push({ label: t[13], href: "/painel/admin" }, { label: t[14] });
  else if (pathname === "/painel/admin/avaliacoes") items.push({ label: t[13], href: "/painel/admin" }, { label: t[18] });
  else if (pathname === "/painel/admin") {
    const location = resolveAdminLocation(options.area ?? undefined, options.tab ?? undefined);
    const section = adminSections.find((entry) => entry.area === location.area) ?? adminSections[0];
    const tab = section.tabs.find((entry) => entry.id === location.tab) ?? section.tabs[0];
    items.push({ label: t[13], href: "/painel/admin" });
    items.push({ label: location.area === "conteudo" ? t[20] : location.area === "controle" ? t[21] : t[19], href: adminTabHref(location.area, section.tabs[0].id) });
    items.push({ label: tab.label });
  } else if (pathname === "/painel/avaliacao") items.push({ label: t[17] });
  else if (pathname === "/painel/conta") items.push({ label: t[15] });
  return items;
}
