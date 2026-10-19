export type RepositoryDepositSetup = { collection: string; documentType: string };

const community = "Faculdade de Arquitetura";

const setups: Record<string, RepositoryDepositSetup> = {
  "ppgau-doctorate": {
    collection: `${community} > Programa de Pós-Graduação em Arquitetura e Urbanismo (PPG-AU) > Tese (PPG-AU)`,
    documentType: "Tese",
  },
  "ppgau-academic-master": {
    collection: `${community} > Programa de Pós-Graduação em Arquitetura e Urbanismo (PPG-AU) > Dissertação (PPG-AU)`,
    documentType: "Dissertação",
  },
  "architecture-urbanism-undergraduate": {
    collection: `${community} > Trabalho Final de Graduação (Graduação) - Arquitetura e Urbanismo (FA)`,
    documentType: "Trabalho de Conclusão de Curso",
  },
  "mp-cecre-master": {
    collection: `${community} > Programa de Pós-Graduação em Conservação e Restauração (CECRE) > Dissertação (CECRE)`,
    documentType: "Dissertação",
  },
  "athdc-specialization": {
    collection: `${community} > Residência em Arquitetura, Urbanismo e Engenharia (RAU+E) > Trabalho de Conclusão de Curso (Especialização) - Assistência Técnica, Habitação e Direito à Cidade (RAU+E)`,
    documentType: "Trabalho de Conclusão de Curso",
  },
};

export function repositoryDepositSetup(code: string, fallback: RepositoryDepositSetup): RepositoryDepositSetup {
  return setups[code] ?? fallback;
}

export function repositoryAccessSubject(name: string): string {
  return `Solicitação de liberação para depósito no RI/UFBA - ${name}`;
}

export function repositoryAccessItems(name: string, email: string, setup: RepositoryDepositSetup): string[] {
  const parts = setup.collection.split(" > ");
  return [
    `Nome completo: ${name}`,
    `E-mail cadastrado no RI/UFBA: ${email || "[confirme ou informe o e-mail cadastrado no RI/UFBA]"}`,
    `Comunidade: ${parts[0]}`,
    ...(parts.length > 2 ? [`Subcomunidade: ${parts[1]}`] : []),
    `Coleção: ${parts.at(-1)}`,
    `Tipo de documento: ${setup.documentType}`,
  ];
}

export function repositoryAccessEmail(name: string, email: string, setup: RepositoryDepositSetup): string {
  return `Prezada equipe do RI/UFBA,\n\nvenho por meio desta solicitar gentilmente a liberação do meu acesso para depositar o trabalho abaixo:\n\n${repositoryAccessItems(name, email, setup).map((item) => `• ${item}`).join("\n")}\n\nAgradeço a atenção.\n\nAtenciosamente,\n${name}`;
}

export function repositoryAccessEmailHtml(name: string, email: string, setup: RepositoryDepositSetup): string {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const items = repositoryAccessItems(name, email, setup).map((item) => `<li>${escape(item)}</li>`).join("");
  return `<p>Prezada equipe do RI/UFBA,</p><p>venho por meio desta solicitar gentilmente a liberação do meu acesso para depositar o trabalho abaixo:</p><ul>${items}</ul><p>Agradeço a atenção.</p><p>Atenciosamente,<br>${escape(name)}</p>`;
}
