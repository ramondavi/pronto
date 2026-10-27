export const cduKinds = {
  unclassified: "Ainda não organizado",
  main: "Tabela principal",
  compound: "Notação composta",
  common_language: "Auxiliar comum de língua (=…)",
  common_form: "Auxiliar comum de forma (0…)",
  common_place: "Auxiliar comum de lugar (1/9)",
  common_ancestry: "Auxiliar comum de ascendência e nacionalidade (=…)",
  common_time: 'Auxiliar comum de tempo ("…")',
  common_properties: "Auxiliar comum de propriedades (-02)",
  common_materials: "Auxiliar comum de materiais (-03)",
  common_processes: "Auxiliar comum de relações e processos (-04)",
  common_persons: "Auxiliar comum de pessoas (-05)",
  special_point_zero: "Auxiliar especial (.0…)",
  special_hyphen: "Auxiliar especial (-…)",
  special_apostrophe: "Auxiliar especial ('…)",
} as const;
export type CduKind = keyof typeof cduKinds;
export type CduStructure = { cdu_code: string; parent_code?: string | null; notation_kind?: string; auxiliary_scope_code?: string | null; usage_notes?: string | null; merged_into_code?: string | null };

// Traverse only recorded relationships. Compound notation is never truncated to invent parents.
export function cduPath(code: string, entries: readonly CduStructure[]): string[] {
  const indexed = new Map(entries.map((entry) => [entry.cdu_code, entry]));
  const path: string[] = []; const visited = new Set<string>(); let current: string | null = code;
  while (current && !visited.has(current)) {
    visited.add(current); const entry = indexed.get(current);
    if (entry?.merged_into_code) { current = entry.merged_into_code; continue; }
    path.unshift(current); current = entry?.parent_code ?? null;
  }
  return path;
}
export function cduOperators(notation: string) {
  const result = new Set<string>(); let quoted = false;
  for (let i = 0; i < notation.length; i++) {
    const sign = notation[i];
    if (sign === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (sign === ":" && notation[i + 1] === ":") { result.add("Relação com ordem fixa (::)"); i++; }
    else if (sign === ":") result.add("Relação simples (:)");
    else if (sign === "+") result.add("Adição (+)");
    else if (sign === "/") result.add("Extensão consecutiva (/)");
    else if (sign === "[") result.add("Agrupamento ([…])");
    else if (sign === "*") result.add("Notação externa (*)");
    else if (/[A-Za-zÀ-ÿ]/u.test(sign)) result.add("Especificação alfabética");
  }
  return [...result];
}
