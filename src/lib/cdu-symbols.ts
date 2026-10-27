import { cduAuxiliaryText, specialCduSuffix, cduIntercalationPoints, cduDependentKinds, cduAscending } from "./cdu-notation.ts";
import { cduPath } from "./cdu-structure.ts";
import { cduRelations, type CduComposition, type CduRelation, type ComposerEntry } from "./cdu-composer.ts";

export type CduToken =
 | { kind: "record"; code: string }
 | { kind: "relation"; value: CduRelation }
 | { kind: "open" }
 | { kind: "close" }
 | { kind: "alphabetic"; value: string; placement: "after" | "inside" }
 | { kind: "external"; value: string; source: string; placement: "after" | "inside" }
 | { kind: "intercalate"; code: string; offset: number }
 | { kind: "auxiliary_pair"; first: string; second: string; relation: CduRelation }
 | { kind: "parallel"; base: string; model: string; subdivision: string; instruction: string };

type Unit = { text: string; anchor: string | null; plain: boolean; prefix: boolean; lastAux: ComposerEntry | null };
const mainNumber = /^\d+(?:\.\d+)*$/u;
const normalize = (value: string) => value.replace(/[“”]/gu, '"').replace(/[‘’]/gu, "'").replace(/−/gu, "-").trim();

export function composeCduSymbols(tokens: readonly CduToken[], edition: string, entries: readonly ComposerEntry[]): CduComposition {
 if (!edition.trim() || tokens.length === 0 || tokens.length > 64) throw new Error("Escolha a edição e acrescente de um a 64 blocos.");
 const notes: string[] = []; const auxiliaries = new Set<string>(); const related = new Set<string>(); let index = 0;
 const get = (code: string) => {
  const entry = entries.find((item) => item.cdu_code === code);
  if (!entry || entry.merged_into_code) throw new Error("Use componentes atuais cadastrados no repertório.");
  if (entry.source_reference !== edition) throw new Error("Todos os componentes precisam ter a mesma edição registrada.");
  return entry;
 };
 const auxiliary = (entry: ComposerEntry) => { auxiliaries.add(entry.cdu_code); notes.push(`Auxiliar ${entry.cdu_code}: ${entry.description}.`); return cduAuxiliaryText(entry); };
 function pair(token: Extract<CduToken, { kind: "auxiliary_pair" }>): { text: string; entry: ComposerEntry } {
  const first = get(token.first); const second = get(token.second);
  if (first.notation_kind !== second.notation_kind || !["common_place", "common_form", "common_ancestry", "common_time"].includes(first.notation_kind ?? "")) throw new Error("Combine auxiliares da mesma tabela de lugar, forma, grupo étnico/nacionalidade ou tempo.");
  if (!Object.hasOwn(cduRelations, token.relation)) throw new Error("Escolha uma relação disponível.");
  const a = auxiliary(first), b = auxiliary(second); const time = first.notation_kind === "common_time";
  const prefix = time ? '"' : first.notation_kind === "common_ancestry" ? "(=" : "("; const end = time ? '"' : ")";
  const left = a.slice(prefix.length, -end.length), right = b.slice(prefix.length, -end.length);
  if (token.relation === "/" && !time && !cduAscending(left, right)) throw new Error("Os extremos da extensão devem ser numéricos, distintos e estar em ordem crescente.");
  if (time && token.relation !== "/") throw new Error("Para reunir dois auxiliares de tempo, use um intervalo (/).");
  notes.push(`Síntese interna de auxiliares: ${token.first} ${token.relation} ${token.second}; confira os conceitos intermediários na edição.`);
  return { text: `${prefix}${left}${token.relation}${right}${end}`, entry: first };
 }
 const commonAt = () => {
  const token = tokens[index];
  return token?.kind === "auxiliary_pair" || (token?.kind === "record" && get(token.code).notation_kind?.startsWith("common_"));
 };
 function takeCommon() {
  const token = tokens[index++];
  if (token.kind === "auxiliary_pair") return pair(token);
  if (token.kind !== "record") throw new Error("Escolha um auxiliar.");
  const entry = get(token.code); return { text: auxiliary(entry), entry };
 }
 function unit(depth: number): Unit {
  if (depth > 8) throw new Error("Use no máximo oito níveis de agrupamento.");
  let prefix = ""; let lastAux: ComposerEntry | null = null;
  while (index < tokens.length && commonAt()) { const item = takeCommon(); if (cduDependentKinds.has(item.entry.notation_kind ?? "")) throw new Error("Este auxiliar de características deve acompanhar uma classe, não iniciar a expressão."); prefix += item.text; lastAux = item.entry; }
  const token = tokens[index]; let current: Unit;
  if (token?.kind === "open") {
   index++; const text = expression(depth + 1);
   if (tokens[index]?.kind !== "close") throw new Error("Feche o grupo com ].");
   index++; current = { text: `${prefix}[${text}]`, anchor: null, plain: false, prefix: Boolean(prefix), lastAux: null };
  } else if (token?.kind === "record" && get(token.code).notation_kind === "main") {
   const entry = get(token.code); const text = normalize(entry.cdu_code);
   if (!/^\d+(?:\.\d+)*(?:\/(?:\.)?\d+(?:\.\d+)*)?$/u.test(text)) throw new Error("Confira a estrutura da classe principal; use os blocos para suas relações.");
   related.add(entry.cdu_code); notes.push(`Classe ${entry.cdu_code}: ${entry.description}.`);
   index++; current = { text: prefix + text, anchor: entry.cdu_code, plain: !prefix && mainNumber.test(text), prefix: Boolean(prefix), lastAux: null };
  } else if (token?.kind === "parallel") {
   const base = get(token.base), model = get(token.model), subdivision = get(token.subdivision);
   if ([base, model, subdivision].some((item) => item.notation_kind !== "main" || !mainNumber.test(item.cdu_code)) || !cduPath(subdivision.cdu_code, entries).includes(model.cdu_code) || !(subdivision.cdu_code.replaceAll(".", "").startsWith(model.cdu_code.replaceAll(".", "")) && subdivision.cdu_code.replaceAll(".", "").length > model.cdu_code.replaceAll(".", "").length) || token.instruction.trim().length < 10 || token.instruction.length > 300) throw new Error("Informe a instrução de divisão paralela e uma subdivisão com vínculo hierárquico registrado ao modelo.");
   const digits = base.cdu_code.replaceAll(".", "") + subdivision.cdu_code.replaceAll(".", "").slice(model.cdu_code.replaceAll(".", "").length);
   const text = digits.match(/.{1,3}/gu)!.join(".");
   [base, model, subdivision].forEach(item => related.add(item.cdu_code));
   notes.push(`Divisão paralela: ${base.cdu_code}, dividido como ${model.cdu_code}; subdivisão ${subdivision.cdu_code}; instrução consultada: ${token.instruction.trim()}.`);
   index++; current = { text: prefix + text, anchor: null, plain: false, prefix: Boolean(prefix), lastAux: null };
  } else if (prefix) {
   current = { text: prefix, anchor: null, plain: false, prefix: true, lastAux };
  } else throw new Error("Acrescente uma classe, um auxiliar independente ou abra um grupo antes de relacionar.");
  let decorated = !current.plain;
  while (index < tokens.length) {
   const next = tokens[index];
   if (commonAt()) { const item = takeCommon(); current.text += item.text; current.lastAux = item.entry; current.plain = false; decorated = true; continue; }
   if (next.kind === "record" && get(next.code).notation_kind?.startsWith("special_")) {
    const entry = get(next.code); current.text += specialCduSuffix(entry, current.anchor, entries); auxiliaries.add(entry.cdu_code);
    notes.push(`Auxiliar especial ${entry.cdu_code}, aplicado à classe ${current.anchor}; âmbito ${entry.auxiliary_scope_code}.`);
    index++; current.lastAux = null; current.plain = false; decorated = true; continue;
   }
   if (next.kind === "intercalate") {
    const entry = get(next.code);
    if (!current.anchor || decorated || !cduIntercalationPoints(current.anchor).includes(next.offset) || cduDependentKinds.has(entry.notation_kind ?? "")) throw new Error("Intercale um auxiliar independente imediatamente após a classe, escolhendo uma divisão decimal existente.");
    const text = auxiliary(entry); current.text = current.anchor.slice(0, next.offset) + text + current.anchor.slice(next.offset);
    notes.push(`Auxiliar ${entry.cdu_code} intercalado na posição ${next.offset} da classe ${current.anchor}; pontuação principal preservada.`);
    index++; current.lastAux = null; current.plain = false; decorated = true; continue;
   }
   if (next.kind === "alphabetic" || next.kind === "external") {
    const value = next.value.trim();
    if (value.length > 40 || !(next.kind === "alphabetic" ? /^[\p{L}][\p{L}\p{N} .'’-]*$/u : /^[\p{L}\p{N}][\p{L}\p{N} ._/-]*$/u).test(value)) throw new Error("Informe até 40 caracteres no complemento, sem operadores reservados da CDU.");
    if (next.kind === "external" && (next.source.trim().length < 3 || next.source.length > 300)) throw new Error("Registre a fonte ou o sistema do código externo.");
    const suffix = (next.kind === "external" ? "*" : "") + value;
    if (next.placement === "inside") {
     if (!current.lastAux || !["common_place", "common_form", "common_ancestry", "common_time"].includes(current.lastAux.notation_kind ?? "")) throw new Error("Para inserir dentro de um auxiliar, coloque o complemento imediatamente após esse auxiliar.");
     current.text = current.text.slice(0, -1) + suffix + current.text.slice(-1);
    } else current.text += suffix;
    notes.push(`${next.kind === "external" ? `Notação externa *${value}; fonte: ${next.source.trim()}` : `Especificação alfabética ${value}`}; posição ${next.placement === "inside" ? "dentro do último auxiliar" : "após o elemento anterior"}.`);
    index++; current.lastAux = null; current.plain = false; decorated = true; continue;
   }
   break;
  }
  return current;
 }
 function expression(depth: number): string {
  const first = unit(depth); let text = first.text; let previous = first; let previousRelation: CduRelation | null = null;
  while (index < tokens.length && tokens[index].kind !== "close") {
   const op = tokens[index++];
   if (op.kind !== "relation" || !Object.hasOwn(cduRelations, op.value)) throw new Error("Ligue os assuntos por +, /, : ou ::; não justaponha duas classes.");
   const next = unit(depth);
   if (op.value === "/" && (previousRelation === "/" || !previous.plain || !next.plain || !cduAscending(previous.text, next.text))) throw new Error("Use / entre duas classes simples em ordem crescente; aplique auxiliares ao intervalo agrupado.");
   notes.push(`${cduRelations[op.value]}: ${previous.text} ${op.value} ${next.text}.`);
   text += op.value + next.text; previous = next; previousRelation = op.value;
  }
  return text;
 }
 const code = expression(0);
 if (index !== tokens.length) throw new Error("Há um fechamento ] sem grupo aberto.");
 if (code.length > 80) throw new Error("A expressão excede os 80 caracteres do campo CDU.");
 const memory = `Composição por símbolos; ordem explícita, com revisão técnica obrigatória.\n${notes.join("\n")}`;
 if (memory.length > 4000) throw new Error("A memória excede 4.000 caracteres; reduza a montagem.");
 return { code, edition, memory, auxiliaries: [...auxiliaries], related: [...related] };
}

export function cduTokenLabel(token: CduToken): string {
 if (token.kind === "record" || token.kind === "intercalate") return token.kind === "record" ? token.code : `Intercalar ${token.code} na posição ${token.offset}`;
 if (token.kind === "relation") return cduRelations[token.value];
 if (token.kind === "open" || token.kind === "close") return token.kind === "open" ? "Abrir grupo [" : "Fechar grupo ]";
 if (token.kind === "parallel") return `${token.base} dividido como ${token.model}: ${token.subdivision}`;
 if (token.kind === "auxiliary_pair") return `${token.first} ${token.relation} ${token.second}`;
 return `${token.kind === "external" ? "*" : "A/Z: "}${token.value}${token.placement === "inside" ? " (dentro do auxiliar)" : ""}`;
}

export function cduTokenCodes(token: CduToken): string[] {
 if (token.kind === "record" || token.kind === "intercalate") return [token.code];
 if (token.kind === "auxiliary_pair") return [token.first, token.second];
 if (token.kind === "parallel") return [token.base, token.model, token.subdivision];
 return [];
}
