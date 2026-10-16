export const issueTemplateFields = [
  { key: "registration_number", label: "Matrícula" },
  { key: "academic_program_id", label: "Curso ou programa" },
  { key: "author", label: "Autor" },
  { key: "title", label: "Título do trabalho" },
  { key: "subtitle", label: "Subtítulo" },
  { key: "equivalent_title", label: "Título em outro idioma" },
  { key: "other_titles", label: "Outros títulos" },
  { key: "advisor", label: "Orientador" },
  { key: "coadvisor", label: "Coorientador" },
  { key: "keywords_pt", label: "Palavras-chave em português" },
  { key: "keywords_en", label: "Palavras-chave em inglês" },
  { key: "public_work_url", label: "Link público do trabalho" },
  { key: "volume_information", label: "Informações dos volumes" },
  { key: "library_note", label: "Observação para a biblioteca" },
] as const;

export function legacyIssueTemplateFields(code: string): string[] {
  if (code === "public_link_unavailable") return ["public_work_url"];
  if (code === "title_page_name") return ["author", "advisor", "coadvisor"];
  return issueTemplateFields.map((field) => field.key).filter((key) =>
    key !== "public_work_url" && (code !== "required_missing" || (key !== "subtitle" && key !== "equivalent_title")),
  ).concat(code === "required_missing" ? ["public_work_url"] : []);
}
