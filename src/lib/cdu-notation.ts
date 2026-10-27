import { cduPath } from "./cdu-structure.ts";
import type { ComposerEntry } from "./cdu-composer.ts";

const mainNumber = /^\d+(?:\.\d+)*$/u;
const printableCode = /^[\p{L}\p{N} .+/:=*()[\]'"’‘“”−-]+$/u;
export const cduDependentKinds = new Set(["common_properties", "common_materials", "common_processes", "common_persons"]);
const normalize = (value: string) => value.replace(/[“”]/gu, '"').replace(/[‘’]/gu, "'").replace(/−/gu, "-").trim();

export function cduIntercalationPoints(code: string): number[] {
 return [0, ...[...code].flatMap((char, index) => char === "." ? [index] : [])];
}

// Check delimiters, not the meaning of a curated table entry. Auxiliary records may
// contain internal ranges, relations, names and external codes; they are not flattened.
export function cduAuxiliaryText(entry: ComposerEntry): string {
 const code = normalize(entry.cdu_code); const kind = entry.notation_kind ?? "";
 if (!code || !printableCode.test(code) || /\.\.|\/\/|\+\+|\d\.(?=[)\]"\s]|$)|[+/:](?=[)\]"]|$)/u.test(code)) throw new Error("Confira a pontuação do auxiliar cadastrado.");
 const starts: Record<string, boolean> = {
  common_language: /^=\d/u.test(code), common_form: /^\(0/u.test(code) && code.endsWith(")"),
  common_place: /^\([1-9]/u.test(code) && code.endsWith(")"), common_ancestry: /^\(=\d/u.test(code) && code.endsWith(")"),
  common_time: code.startsWith('"') && code.endsWith('"') && code.length > 2,
  common_properties: code.startsWith("-02"), common_materials: code.startsWith("-03"),
  common_processes: code.startsWith("-04"), common_persons: code.startsWith("-05"),
 };
 if (!starts[kind]) throw new Error("O código do auxiliar não corresponde à tabela indicada no cadastro.");
 const stack: string[] = []; let quoted = false;
 for (const char of code) {
  if (char === '"') { quoted = !quoted; continue; }
  if (quoted) continue;
  if (char === "(" || char === "[") stack.push(char);
  if (char === ")" || char === "]") {
   if (stack.pop() !== (char === ")" ? "(" : "[")) throw new Error("Há delimitadores incompatíveis no auxiliar.");
  }
 }
 if (quoted || stack.length) throw new Error("Feche os parênteses, colchetes ou aspas do auxiliar.");
 return code;
}

export function specialCduSuffix(entry: ComposerEntry, anchor: string | null, entries: readonly ComposerEntry[]): string {
 const scope = entry.auxiliary_scope_code; const kind = entry.notation_kind;
 if (!anchor || !scope || !cduPath(anchor, entries).includes(scope)) throw new Error("Este auxiliar especial não tem âmbito registrado para o assunto escolhido.");
 const code = normalize(entry.cdu_code); const suffix = code.startsWith(scope) ? code.slice(scope.length) : code;
 const valid = kind === "special_point_zero" ? /^\.0\d*(?:\.\d+)*$/u : kind === "special_hyphen" ? /^-[1-9]\d*(?:\.\d+)*$/u : kind === "special_apostrophe" ? /^'\d+(?:\.\d+)*$/u : null;
 if (!valid?.test(suffix)) throw new Error("Confira o indicador e a classe de aplicação do auxiliar especial.");
 return suffix;
}

export function cduAscending(first: string, second: string) {
 if (!mainNumber.test(first) || !mainNumber.test(second)) return false;
 const a = first.replaceAll(".", ""); const b = second.replaceAll(".", ""); // Compare the decimal notation as a sequence: a recorded subdivision ending in zero is still distinct.
 return a < b;
}

