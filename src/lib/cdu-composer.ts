import { cduPath, type CduStructure } from "./cdu-structure.ts";

export type ComposerEntry = CduStructure & { description: string; source_reference: string | null; validated: boolean; composition_notes?: string | null; auxiliary_codes?: string[]; related_codes?: string[] };
export type CduRelation = ":" | "::" | "+";
export type CduPart = { code: string; relation: CduRelation };
export type CduAuxiliary = { code: string; target: number | "whole" };
export type CduComposition = { code: string; edition: string; memory: string; auxiliaries: string[]; related: string[] };
export const cduRelations: Record<CduRelation, string> = { ":": "Relacionar com (:)", "::": "Relacionar mantendo a ordem (::)", "+": "Acrescentar outro assunto (+)" };
const mainPattern = /^\d+(?:\.\d+)*$/u;
const commonPatterns: Record<string, RegExp> = {
 common_language: /^=\d+(?:\.\d+)*$/u,
 common_form: /^\(0\d*(?:\.\d+)*\)$/u,
 common_place: /^\([1-9]\d*(?:\.\d+)*\)$/u,
 common_ancestry: /^\(=\d+(?:\.\d+)*\)$/u,
 common_time: /^"\d+(?:[.\/-]\d+)*"$/u,
 common_properties: /^-02\d*(?:\.\d+)*$/u, common_materials: /^-03\d*(?:\.\d+)*$/u,
 common_processes: /^-04\d*(?:\.\d+)*$/u, common_persons: /^-05\d*(?:\.\d+)*$/u,
};

// This builder deliberately supports only the structured subset offered by the UI.
// It never parses arbitrary existing expressions or invents table relationships.
export function composeCdu(parts: readonly CduPart[], auxiliaries: readonly CduAuxiliary[], edition: string, entries: readonly ComposerEntry[]): CduComposition {
 if (!edition.trim() || parts.length === 0 || parts.length > 8 || auxiliaries.length > 12) throw new Error("Escolha a edição e ao menos um assunto; use até oito assuntos e doze auxiliares.");
 const get = (code: string) => {
  const entry = entries.find((item) => item.cdu_code === code);
  if (!entry || entry.merged_into_code) throw new Error("Escolha somente códigos atuais do repertório local.");
  if (entry.source_reference !== edition) throw new Error("Todos os componentes precisam ter a mesma edição registrada.");
  return entry;
 };
 const main = parts.map((part) => {
  const entry = get(part.code);
  if (entry.notation_kind !== "main" || !mainPattern.test(part.code)) throw new Error("Escolha assuntos simples da tabela principal. Para outras expressões, use o preenchimento manual.");
  if (!Object.hasOwn(cduRelations, part.relation)) throw new Error("Escolha uma relação disponível.");
  return entry;
 });
 const seen = new Set<string>();
 const attached = parts.map(() => ""); let whole = "";
 const notes = parts.map((part, index) => `${index === 0 ? "Assunto inicial" : cduRelations[part.relation]}: ${part.code} — ${main[index].description}.`);
 for (const auxiliary of auxiliaries) {
  const entry = get(auxiliary.code); const kind = entry.notation_kind ?? "";
  if (auxiliary.target !== "whole" && (!Number.isInteger(auxiliary.target) || auxiliary.target < 0 || auxiliary.target >= parts.length)) throw new Error("Indique a qual assunto o auxiliar se aplica.");
  const identity = `${auxiliary.target}:${auxiliary.code}`;
  if (seen.has(identity)) throw new Error("Este auxiliar já foi acrescentado ao mesmo assunto ou conjunto.");
  seen.add(identity);
  let suffix = auxiliary.code;
  if (kind.startsWith("special_")) {
   if (auxiliary.target === "whole") throw new Error("Auxiliares especiais devem ser ligados a um assunto específico.");
   const scope = entry.auxiliary_scope_code;
   if (!scope || !cduPath(parts[auxiliary.target].code, entries).includes(scope)) throw new Error("O assunto precisa pertencer ao âmbito registrado para este auxiliar especial.");
   if (!auxiliary.code.startsWith(scope)) throw new Error("Este auxiliar especial precisa de composição manual: seu código não contém a classe de aplicação registrada.");
   suffix = auxiliary.code.slice(scope.length);
   const pattern = kind === "special_point_zero" ? /^\.0\d*(?:\.\d+)*$/u : kind === "special_hyphen" ? /^-\d+(?:\.\d+)*$/u : /^'\d+(?:\.\d+)*$/u;
   if (!pattern.test(suffix)) throw new Error("Este auxiliar especial precisa de composição manual; confira sua notação na edição consultada.");
  } else if (!commonPatterns[kind]?.test(auxiliary.code)) throw new Error("Este auxiliar não pertence ao conjunto simples aceito pelo compositor. Use o preenchimento manual.");
  if (auxiliary.target === "whole") whole += suffix; else attached[auxiliary.target] += suffix;
  notes.push(`Auxiliar ${auxiliary.code} — ${entry.description}; aplicação: ${auxiliary.target === "whole" ? "conjunto dos assuntos" : `assunto ${auxiliary.target + 1} (${parts[auxiliary.target].code})`}.`);
 }
 let code = parts.map((part, index) => `${index ? part.relation : ""}${part.code}${attached[index]}`).join("");
 if (whole) code = `${parts.length > 1 ? `[${code}]` : code}${whole}`;
 if (code.length > 80) throw new Error("A composição excede o limite de 80 caracteres do campo CDU.");
 const memory = `Composição assistida; revisão técnica obrigatória.\n${notes.join("\n")}`;
 if (memory.length > 4000) throw new Error("A memória excede 4.000 caracteres. Reduza a composição ou registre-a manualmente.");
 return { code, edition, memory, auxiliaries: [...new Set(auxiliaries.map((item) => item.code))], related: [...new Set(parts.map((item) => item.code))] };
}
