export const staffGuideSections = [
  ["comece-aqui", "Comece aqui"],
  ["atendimento", "Atendimento e catalogação"],
  ["administracao", "Administração"],
  ["casos", "Casos"],
] as const;

export type StaffGuideSection = (typeof staffGuideSections)[number][0];
export const staffGuideSectionOrder = Object.fromEntries(staffGuideSections.map(([key], index) => [key, index]));
export const staffGuideSectionLabel = Object.fromEntries(staffGuideSections);
