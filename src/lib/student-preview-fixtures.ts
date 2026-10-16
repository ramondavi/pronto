import type { CatalogingCardSnapshot } from "@/domain/cataloging-card/types";
import type { StudentRevision } from "@/components/student-revision-gallery";
import type { TimelineEvent } from "@/components/request-timeline";

export const studentPreviewScenarios = [
  { id: "sem-pedido", label: "Antes do pedido", status: "", nada: null, homologated: false },
  { id: "enviada", label: "Solicitação enviada", status: "submitted", nada: null, homologated: false },
  { id: "em-analise", label: "Em análise", status: "in_review", nada: null, homologated: false },
  { id: "nada-conferencia", label: "Nada Consta em conferência", status: "in_review", nada: "pending", homologated: false },
  { id: "nada-rejeitado", label: "Nada Consta devolvido", status: "in_review", nada: "rejected", homologated: false },
  { id: "correcao", label: "Correção solicitada", status: "changes_requested", nada: "approved", homologated: false },
  { id: "correcoes", label: "Vários campos para corrigir", status: "changes_requested", nada: "approved", homologated: false },
  { id: "correcao-reenviada", label: "Correções reenviadas", status: "in_review", nada: "approved", homologated: false },
  { id: "ficha-homologada", label: "Ficha homologada", status: "approved", nada: "pending", homologated: true },
  { id: "ficha-liberada", label: "Ficha liberada", status: "approved", nada: "approved", homologated: true },
  { id: "concluida", label: "Concluída", status: "completed", nada: "approved", homologated: true },
  { id: "avaliacao-concluida", label: "Avaliação respondida", status: "completed", nada: "approved", homologated: true },
  { id: "guia-desativado", label: "Guia indisponível para o curso", status: "approved", nada: "approved", homologated: true },
  { id: "cancelada", label: "Cancelada", status: "canceled", nada: null, homologated: false },
] as const;

export type StudentPreviewScenario = (typeof studentPreviewScenarios)[number];
export const studentPreviewRequestId = "00000000-0000-0000-0000-000000000000";
export const studentPreviewProtocol = "FC2026-0001";
export const studentPreviewSubmittedAt = "2026-10-08T12:00:00.000Z";

export const studentPreviewSnapshot: CatalogingCardSnapshot = {
  institution: { university: "Universidade Federal da Bahia", librarySystem: "Sistema Universitário de Bibliotecas", library: "Biblioteca da Faculdade de Arquitetura" },
  request: { protocol: studentPreviewProtocol, title: "Exemplo de trabalho acadêmico", subtitle: "Estudo de espaços públicos", programName: "Programa de demonstração", programCode: "PPG-AU", academicLevel: "Mestrado", workNature: "Dissertação", depositYear: 2026, defenseYear: 2026, extentUnit: "pages", extentCount: 120, publicationPlace: "Salvador" },
  people: [
    { role: "author", transcribedName: "Estudante", authorizedName: "Estudante", position: 1 },
    { role: "advisor", transcribedName: "Professora de Demonstração", authorizedName: "Demonstração, Professora de", position: 2 },
  ],
  subjects: [{ labelPt: "Arquitetura", labelEn: "Architecture", isPrimary: true, position: 1 }],
  classification: { cdu: "72", cutter: "D383" },
  technicalResponsibility: { name: "Bibliotecária de demonstração", crb: "CRB-5/0000" },
  catalogingConventions: { electronicResourceLabel: "[recurso eletrônico]" },
  layoutStatus: "approved",
};

export function studentPreviewRevisions(scenario: StudentPreviewScenario): StudentRevision[] {
  if (!["correcao", "correcoes", "correcao-reenviada", "ficha-homologada", "ficha-liberada", "concluida", "avaliacao-concluida", "guia-desativado"].includes(scenario.id)) return [];
  const multiple = scenario.id === "correcoes";
  const responded = !["correcao", "correcoes"].includes(scenario.id);
  return [{ id: "preview-revision", round_number: 1, returned_at: "2026-10-10T12:00:00.000Z", responded_at: responded ? "2026-10-11T12:00:00.000Z" : null,
    issues: [
      { field_key: "title", field_label: "Título do trabalho", justification: "Confira o título exatamente como aparece na versão final aprovada.", original_value: "Exemplo de trabalho acadêmico" },
      ...(multiple ? [{ field_key: "public_work_url", field_label: "Link público do trabalho", justification: "Libere o acesso ao arquivo completo para a biblioteca.", original_value: "https://exemplo.ufba.br/trabalho" }] : []),
    ],
    corrections: responded ? [{ field_key: "title", corrected_value: "Exemplo de trabalho acadêmico: estudo de espaços públicos", submitted_at: "2026-10-11T12:00:00.000Z" }] : [],
  }];
}

export function studentPreviewTimeline(scenario: StudentPreviewScenario): TimelineEvent[] {
  if (!scenario.status) return [];
  const events: TimelineEvent[] = [{ event_key: "request_submitted", label: "Solicitação aberta", occurred_at: studentPreviewSubmittedAt }];
  if (!["enviada", "cancelada"].includes(scenario.id)) events.push({ event_key: "service_started", label: "Atendimento iniciado", occurred_at: "2026-10-09T12:00:00.000Z" });
  if (scenario.id === "cancelada") events.push({ event_key: "request_canceled", label: "Protocolo cancelado", occurred_at: "2026-10-09T12:00:00.000Z" });
  if (studentPreviewRevisions(scenario).length) events.push({ event_key: "changes_requested_1", label: "Correções solicitadas", occurred_at: "2026-10-10T12:00:00.000Z" });
  if (studentPreviewRevisions(scenario)[0]?.responded_at) events.push({ event_key: "corrections_sent_1", label: "Correções reenviadas", occurred_at: "2026-10-11T12:00:00.000Z" });
  if (scenario.homologated) events.push({ event_key: "card_homologated", label: "Ficha catalográfica homologada", occurred_at: "2026-10-12T12:00:00.000Z" });
  if (scenario.nada === "approved") events.push({ event_key: "nada_approved", label: "Nada Consta validado", occurred_at: "2026-10-12T14:00:00.000Z" });
  if (["concluida", "avaliacao-concluida"].includes(scenario.id)) events.push({ event_key: "request_completed", label: "Protocolo encerrado", occurred_at: "2026-10-14T12:00:00.000Z" });
  return events;
}
