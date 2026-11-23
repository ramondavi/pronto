export const staffGuideSections = [
  ["comece-aqui", "Comece aqui"],
  ["fila", "Fila e acompanhamento"],
  ["analise", "Análise do pedido"],
  ["catalogacao", "Catalogação e ficha"],
  ["assuntos", "Assuntos e autoridades"],
  ["administracao", "Administração do serviço"],
  ["conteudo", "Conteúdo da equipe"],
  ["controle", "Controle e preservação"],
  ["casos-atendimento", "Casos de atendimento"],
  ["casos-gestao", "Casos de gestão"],
] as const;

export type StaffGuideSection = (typeof staffGuideSections)[number][0];
// Mantém a leitura dos capítulos nas seções antigas durante a implantação da migração.
export const staffGuideLegacySections = [["atendimento", "Atendimento e catalogação"], ["casos", "Casos"]] as const;
export const staffGuideVisibleSections = [...staffGuideSections, ...staffGuideLegacySections];
export const staffGuideSectionOrder = Object.fromEntries(staffGuideVisibleSections.map(([key], index) => [key, index]));
export const staffGuideSectionLabel = Object.fromEntries(staffGuideVisibleSections);
