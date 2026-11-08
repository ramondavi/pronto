import type { AppIconName } from "@/components/app-icon";
import { adminSections } from "./admin-navigation";
import { staffPanelFieldReferences } from "./staff-panel-field-references";

export type StaffPanelReference = { key: string; label: string; icon?: AppIconName; group: string; sidebar?: boolean; kind?: "field" | "control" };

const mainReferences: StaffPanelReference[] = [
  { key: "overview", label: "Visão geral", icon: "home", group: "Visão geral", sidebar: true },
  { key: "queue", label: "Fila de solicitações", icon: "queue", group: "Fila de solicitações", sidebar: true },
  { key: "work", label: "Meus atendimentos", icon: "work", group: "Fila de solicitações" },
  { key: "queue-general", label: "Fila geral", icon: "queue", group: "Fila de solicitações" },
  { key: "administration", label: "Administração", icon: "hierarchy", group: "Administração", sidebar: true },
  { key: "account", label: "Minha conta", icon: "account", group: "Minha conta", sidebar: true },
  { key: "staff-guide", label: "Guia da equipe", icon: "book", group: "Guia da equipe", sidebar: true },
  { key: "calendar", label: "Calendário da biblioteca", icon: "calendar", group: "Calendário da biblioteca", sidebar: true },
  { key: "hours", label: "Horários da biblioteca", icon: "clock", group: "Horários da biblioteca", sidebar: true },
  { key: "analysis-metadata", label: "Metadados", icon: "document", group: "Atendimento" },
  { key: "analysis-cataloging", label: "Catalogação", icon: "book", group: "Atendimento" },
  { key: "analysis-review", label: "Revisão da ficha", icon: "review", group: "Atendimento" },
  { key: "analysis-documentation", label: "Finalização e liberação", icon: "shield", group: "Atendimento" },
  { key: "queue-active", label: "Ativos", group: "Fila de solicitações · Controles", kind: "control" },
  { key: "queue-closed", label: "Encerrados", group: "Fila de solicitações · Controles", kind: "control" },
  { key: "queue-search-control", label: "Buscar atendimento", icon: "search", group: "Fila de solicitações · Controles", kind: "control" },
  { key: "queue-more-filters", label: "Mais filtros", icon: "settings", group: "Fila de solicitações · Controles", kind: "control" },
  { key: "queue-sort", label: "Ordenar por", icon: "settings", group: "Fila de solicitações · Controles", kind: "control" },
  { key: "queue-clear-filters", label: "Limpar filtros", group: "Fila de solicitações · Controles", kind: "control" },
  { key: "queue-legend", label: "Legenda", group: "Fila de solicitações · Controles", kind: "control" },
  { key: "queue-assume", label: "Assumir atendimento", icon: "work", group: "Fila de solicitações · Ações do cartão", kind: "control" },
  { key: "queue-open-analysis", label: "Abrir análise", icon: "review", group: "Fila de solicitações · Ações do cartão", kind: "control" },
  { key: "queue-release", label: "Devolver à fila", icon: "inbox", group: "Fila de solicitações · Ações do cartão", kind: "control" },
  { key: "queue-assign", label: "Atribuir atendimento", group: "Fila de solicitações · Ações do cartão", kind: "control" },
  { key: "queue-reassign", label: "Reatribuir atendimento", group: "Fila de solicitações · Ações do cartão", kind: "control" },
];

export const staffPanelReferences: StaffPanelReference[] = [
  ...mainReferences,
  ...adminSections.flatMap((section) => [
    { key: `admin-area-${section.area}`, label: section.label, icon: section.icon, group: "Administração", sidebar: true },
    ...section.tabs.map((tab) => ({ key: `admin-${tab.id}`, label: tab.label, icon: tab.icon, group: `Administração · ${section.label}`, sidebar: true })),
  ]),
  ...staffPanelFieldReferences.map((field) => ({ ...field, kind: "field" as const })),
];

export const staffPanelReferenceByKey = new Map(staffPanelReferences.map((reference) => [reference.key, reference]));
