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

export function repositoryAccessEmail(name: string, email: string, setup: RepositoryDepositSetup): string {
  const parts = setup.collection.split(" > ");
  const subcommunity = parts.length > 2 ? `Subcomunidade: ${parts[1]}\n` : "";
  return `Prezada equipe do RI/UFBA,\n\nSolicito a liberação do meu acesso para depositar o trabalho abaixo.\n\nNome completo: ${name}\nE-mail cadastrado no RI/UFBA: ${email || "[preencha o e-mail usado no cadastro do RI/UFBA]"}\nComunidade: ${parts[0]}\n${subcommunity}Coleção: ${parts.at(-1)}\nTipo de documento: ${setup.documentType}\n\nAgradeço a atenção.\n${name}`;
}
