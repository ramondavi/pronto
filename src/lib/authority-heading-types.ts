/** Campos de entrada 1XX do MARC21 de autoridades. O código identifica o uso do registro. */
export const authorityHeadingTypes = [
  { tag: "100", label: "Pessoa", kind: "personal" },
  { tag: "110", label: "Entidade", kind: "corporate" },
  { tag: "111", label: "Evento ou encontro", kind: "meeting" },
  { tag: "130", label: "Título uniforme", kind: "title" },
  { tag: "147", label: "Evento nomeado", kind: "named_event" },
  { tag: "148", label: "Período", kind: "chronological" },
  { tag: "150", label: "Assunto temático", kind: "topic" },
  { tag: "151", label: "Lugar", kind: "geographic" },
  { tag: "155", label: "Gênero ou forma", kind: "genre_form" },
  { tag: "162", label: "Meio de execução", kind: "medium" },
  { tag: "180", label: "Subdivisão temática", kind: "topical_subdivision" },
  { tag: "181", label: "Subdivisão geográfica", kind: "geographic_subdivision" },
  { tag: "182", label: "Subdivisão cronológica", kind: "chronological_subdivision" },
  { tag: "185", label: "Subdivisão de forma", kind: "form_subdivision" },
] as const;

export type AuthorityHeadingTag = (typeof authorityHeadingTypes)[number]["tag"];
export const headingTypeByTag = Object.fromEntries(authorityHeadingTypes.map((item) => [item.tag, item])) as Record<AuthorityHeadingTag, (typeof authorityHeadingTypes)[number]>;
export const headingTagByKind = Object.fromEntries(authorityHeadingTypes.map((item) => [item.kind, item.tag])) as Record<string, AuthorityHeadingTag>;

export function authorityHeadingTag(record: { fields?: { tag: string }[]; heading_type?: string }): AuthorityHeadingTag | null {
  const confirmed = headingTagByKind[record.heading_type ?? ""];
  if (confirmed) return confirmed;
  const field = record.fields?.find((item) => item.tag in headingTypeByTag);
  if (field) return field.tag as AuthorityHeadingTag;
  return null;
}

export function authorityHeadingLabel(tag: string): string {
  return tag in headingTypeByTag ? `${tag} · ${headingTypeByTag[tag as AuthorityHeadingTag].label}` : "Tipo não identificado";
}
