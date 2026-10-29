export const adminSections = [
  { area: "operacao", label: "Operação", icon: "settings", summary: "Gerencie pessoas, acessos e o funcionamento cotidiano da biblioteca.", tabs: [
    { id: "users", label: "Contas", icon: "account", description: "Provisionamento, perfis e situação das contas da equipe e dos estudantes." },
    { id: "permissions", label: "Permissões da equipe", icon: "shield", description: "Acesso efetivo e decisões individuais por pessoa, área e ação." },
    { id: "programs", label: "Programas e SLA", icon: "settings", description: "Programas acadêmicos, prazos de atendimento e configurações relacionadas." },
    { id: "library", label: "Calendário e mural", icon: "calendar", description: "Funcionamento, datas especiais, horários e comunicados da biblioteca." },
  ] },
  { area: "conteudo", label: "Conteúdo", icon: "book", summary: "Organize as informações usadas nas orientações e na catalogação.", tabs: [
    { id: "service", label: "Modelos de resposta", icon: "inbox", description: "Configure mensagens padrão para pendências e orientações do atendimento." },
    { id: "faq", label: "Ajuda e FAQ", icon: "help", description: "Edite respostas e artigos da central de ajuda." },
    { id: "subjects", label: "Assuntos", icon: "tag", description: "Mantenha os termos usados para classificar os trabalhos." },
    { id: "cdu", label: "Catálogo CDU", icon: "book", description: "Consulte e revise descrições dos códigos de classificação." },
  ] },
  { area: "controle", label: "Controle", icon: "shield", summary: "Acompanhe indicadores, retenção de arquivos e registros de auditoria.", tabs: [
    { id: "stats", label: "Indicadores", icon: "review", description: "Veja números e tendências do serviço." },
    { id: "deposits", label: "Depósitos pendentes", icon: "upload", description: "Acompanhe trabalhos sem publicação no RI e envie lembretes após habilitar o guia." },
    { id: "retention", label: "Arquivos e retenção", icon: "archive", description: "Acompanhe prazos de guarda e limpeza dos documentos." },
    { id: "backups", label: "Backup e restauro", icon: "shield", description: "Acompanhe execuções, confira recibos locais e prepare a recuperação dos dados." },
    { id: "audit", label: "Auditoria", icon: "document", description: "Consulte ações administrativas e operacionais registradas." },
  ] },
] as const;

export type AdminArea = (typeof adminSections)[number]["area"];
export type AdminTab = (typeof adminSections)[number]["tabs"][number]["id"];

export const adminTabPermissions: Record<AdminTab, readonly string[]> = {
  users: ["admin.accounts.view", "admin.accounts.manage", "admin.accounts.provision"],
  permissions: ["admin.permissions.manage"],
  programs: ["admin.programs.view", "admin.programs.manage"],
  library: ["library.calendar.view", "library.calendar.manage"],
  service: ["admin.service.view", "admin.service.manage"],
  faq: ["admin.faq.view", "admin.faq.manage", "admin.knowledge.view", "admin.knowledge.manage"],
  subjects: ["admin.subjects.view", "admin.subjects.manage"],
  cdu: ["admin.cdu.view", "admin.cdu.manage"],
  stats: ["admin.stats.view"],
  deposits: ["admin.deposits.view"],
  retention: ["admin.retention.view", "admin.retention.manage"],
  audit: ["admin.audit.view"],
  backups: ["admin.backups.view"],
};

export const adminPermissionCodes = [...new Set([...Object.values(adminTabPermissions).flat(), "admin.feedback.view", "admin.feedback.export", "admin.feedback.activate", "admin.deposits.send", "admin.deposits.history", "admin.deposits.publication"])];

export function canOpenAdminTab(tab: AdminTab, permissions: readonly string[]) {
  return adminTabPermissions[tab].some((code) => permissions.includes(code));
}

export function resolveAdminLocation(areaValue?: string, tabValue?: string) {
  const section = adminSections.find((item) => item.area === areaValue) ?? adminSections[0];
  const tab = section.tabs.find((item) => item.id === tabValue) ?? section.tabs[0];
  return { area: section.area, tab: tab.id };
}

export function adminTabHref(area: AdminArea, tab: string) {
  return `/painel/admin?area=${area}&aba=${tab}`;
}

export function adminAreaHref(area: AdminArea) {
  return `/painel/admin?area=${area}`;
}
