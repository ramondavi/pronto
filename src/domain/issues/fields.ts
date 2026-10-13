export const correctableFields = [
  { key: "registration_number", label: "Matrícula", kind: "text" },
  { key: "academic_program_id", label: "Curso ou programa", kind: "program" },
  { key: "author", label: "Autor", kind: "text" },
  { key: "title", label: "Título", kind: "textarea" },
  { key: "subtitle", label: "Subtítulo", kind: "text" },
  { key: "equivalent_title", label: "Título equivalente", kind: "text" },
  { key: "other_titles", label: "Outros títulos", kind: "list" },
  { key: "advisor", label: "Orientador", kind: "text" },
  { key: "coadvisor", label: "Coorientador", kind: "text" },
  { key: "keywords_pt", label: "Palavras-chave em português", kind: "list" },
  { key: "keywords_en", label: "Palavras-chave em inglês", kind: "list" },
  { key: "public_work_url", label: "Link público do trabalho", kind: "url" },
  { key: "volume_information", label: "Informações dos volumes", kind: "text" },
  { key: "library_note", label: "Observação para a biblioteca", kind: "textarea" },
] as const;

export type CorrectableFieldKey = (typeof correctableFields)[number]["key"];
