export const adminSections = [
  { area: "operacao", label: "Operação", icon: "settings", tabs: [
    { id: "users", label: "Equipe e acessos" },
    { id: "programs", label: "Programas e SLA" },
    { id: "library", label: "Calendário e mural" },
  ] },
  { area: "conteudo", label: "Conteúdo", icon: "book", tabs: [
    { id: "service", label: "Pendências" },
    { id: "faq", label: "Ajuda e FAQ" },
    { id: "subjects", label: "Assuntos" },
    { id: "cdu", label: "Catálogo CDU" },
  ] },
  { area: "controle", label: "Controle", icon: "shield", tabs: [
    { id: "stats", label: "Indicadores" },
    { id: "retention", label: "Arquivos e retenção" },
    { id: "audit", label: "Auditoria" },
  ] },
] as const;

export type AdminArea = (typeof adminSections)[number]["area"];

export function resolveAdminLocation(areaValue?: string, tabValue?: string) {
  const section = adminSections.find((item) => item.area === areaValue) ?? adminSections[0];
  const tab = section.tabs.find((item) => item.id === tabValue) ?? section.tabs[0];
  return { area: section.area, tab: tab.id };
}

export function adminTabHref(area: AdminArea, tab: string) {
  return `/painel/admin?area=${area}&aba=${tab}`;
}
