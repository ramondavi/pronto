type CitationInput = {
  programCode: string;
  authors: string[];
  title: string;
  subtitle?: string | null;
  depositYear: number;
  defenseYear: number;
  place?: string | null;
};

const institution = "Faculdade de Arquitetura, Universidade Federal da Bahia";
const ppgau = `Programa de Pós-Graduação em Arquitetura e Urbanismo, ${institution}`;

function invertName(name: string) {
  const parts = name.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length < 2) return name.trim().toLocaleUpperCase("pt-BR");
  const suffix = /^(filho|neto|júnior|junior|sobrinho)$/i.test(parts.at(-1) ?? "");
  const family = parts.splice(suffix ? -2 : -1).join(" ");
  return `${family.toLocaleUpperCase("pt-BR")}, ${parts.join(" ")}`;
}

export function academicWorkCitation(input: CitationInput): string | null {
  const { programCode, authors, title, subtitle, depositYear, defenseYear } = input;
  if (!authors.length || !authors.every((name) => name.trim()) || !title.trim() || !depositYear || !defenseYear) return null;
  const kind = programCode === "architecture-urbanism-undergraduate"
    ? `Trabalho Final de Graduação (Graduação em Arquitetura e Urbanismo) – ${institution}`
    : programCode === "mp-cecre-master"
      ? `Trabalho de Conclusão de Curso (Mestrado Profissional em Conservação e Restauração de Monumentos e Núcleos Históricos) – ${institution}`
      : programCode === "ppgau-academic-master"
        ? `Dissertação (Mestrado em Arquitetura e Urbanismo) – ${ppgau}`
        : programCode === "ppgau-doctorate"
          ? `Tese (Doutorado em Arquitetura e Urbanismo) – ${ppgau}`
          : programCode === "athdc-specialization"
            ? `Trabalho de Conclusão de Curso (Residência em Arquitetura, Urbanismo e Engenharia) – ${ppgau}`
            : null;
  if (!kind) return null;
  const authorLine = authors.map(invertName).join("; ");
  const workTitle = `**${title.trim()}**${subtitle?.trim() ? `: ${subtitle.trim()}` : ""}`;
  return `${authorLine}. ${workTitle}. ${depositYear}. ${kind}, ${input.place?.trim() || "Salvador"}, ${defenseYear}.`;
}
