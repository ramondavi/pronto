/** Conferência local de arquivos de autoridades. Não consulta serviços nem grava no catálogo. */
export type AuthoritySource = "bn" | "aat" | "ufba" | "pergamum" | "loc";
export const authoritySources: Record<AuthoritySource, string> = { bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", loc: "Library of Congress" };
export type AuthorityValue = { value: string; kind: string; language?: string; identifier?: string };
export type MarcField = { tag: string; value?: string; indicators?: string; subfields?: { code: string; value: string }[] };
export type AuthorityPreview = { identifier: string | null; title: string; format: string; source: AuthoritySource; components: AuthorityValue[]; labels: AuthorityValue[]; variants: AuthorityValue[]; relations: AuthorityValue[]; mappings: AuthorityValue[]; notes: AuthorityValue[]; citations: AuthorityValue[]; warnings: string[]; original: string; modified: string | null; geography: string | null; fields?: MarcField[] };
export const authorityInputLimit = 2_000_000;
const maxRecords = 100;
const parts: Record<string, string> = { a: "Assunto-base", x: "Subdivisão temática", y: "Subdivisão cronológica", z: "Subdivisão geográfica", v: "Subdivisão de forma" };
const list = <T>(value: T | T[] | undefined | null): T[] => value == null ? [] : Array.isArray(value) ? value : [value];
const empty = (source: AuthoritySource, format: string, original: string): AuthorityPreview => ({ source, format, original, identifier: null, title: "", components: [], labels: [], variants: [], relations: [], mappings: [], notes: [], citations: [], warnings: [], modified: null, geography: null });
const warn = (r: AuthorityPreview, text: string) => { if (!r.warnings.includes(text)) r.warnings.push(text); };
const sub = (f: MarcField, code: string) => f.subfields?.filter(s => s.code === code).map(s => s.value) ?? [];
const components = (f: MarcField): AuthorityValue[] => f.subfields?.filter(s => parts[s.code]).map(s => ({ value: s.value, kind: parts[s.code] })) ?? [];
const display = (values: AuthorityValue[]) => values.map(v => v.value).join(" - ");

export function previewMarc(fields: MarcField[], source: AuthoritySource, format: string, original: string): AuthorityPreview {
 const r = empty(source, format, original);
 const control = (tag: string) => fields.find(f => f.tag === tag)?.value ?? "";
 const leader = control("000"), fixed = control("008");
 r.fields = fields; r.modified = control("005") || null;
 if (control("001") && control("003")) r.identifier = `${control("003")} / ${control("001")}`;
 else warn(r, "Faltam identificadores 001/003. Não é possível conferir reimportações com segurança.");
 if (leader.length !== 24) warn(r, "Líder ausente ou resumido: esta amostra não é um registro MARC completo.");
 else {
  if (leader[6] !== "z") throw new Error("O líder não identifica uma autoridade. Registros bibliográficos não são convertidos em assuntos.");
  if ("dosx".includes(leader[5])) warn(r, "O líder indica registro excluído, obsoleto ou substituído. Não disponibilizar para novos usos sem revisão.");
 }
 if (fixed.length !== 40) warn(r, "Campo 008 ausente ou sem 40 posições. Condições de uso não puderam ser conferidas.");
 else r.geography = ({ d: "Direta", i: "Indireta", " ": "Não subdividido geograficamente", n: "Não aplicável", "|": "Não codificada" } as Record<string, string>)[fixed[6]] ?? "Código a conferir";
 if (r.modified && !/^\d{14}\.\d$/.test(r.modified)) warn(r, "A data 005 está em formato de exibição; não foi convertida automaticamente.");
 const headings = fields.filter(f => /^1\d\d$/.test(f.tag));
 if (headings.length !== 1) throw new Error("É necessário exatamente um cabeçalho 1XX por autoridade.");
 if (!["150", "151", "155", "180", "181", "182", "185"].includes(headings[0].tag)) throw new Error("Este ensaio trata assuntos, lugares, gênero/forma e subdivisões. Autoridades de pessoas e entidades ficam fora desta etapa.");
 r.components = components(headings[0]); r.title = display(r.components);
 if (!r.title) throw new Error("Cabeçalho sem componente reconhecido.");
 r.labels.push({ value: r.title, kind: "Cabeçalho da fonte", language: "Não informada" });
 warn(r, "O idioma do termo não foi presumido pela fonte nem pelo idioma da catalogação. Confira a forma em português.");
 for (const f of fields) {
  const { tag } = f;
  if (/^(45[015]|48[0125]|55[015]|58[0125]|66[7]|67[05]|680)$/.test(tag) && /[^ _#]/.test(f.indicators ?? "")) warn(r, "Há indicador preenchido em posição indefinida no MARC 21. O original foi preservado para revisão.");
  if (/^4/.test(tag) && components(f).length) r.variants.push({ value: display(components(f)), kind: `Variante (${tag})`, language: "Não informada" });
  if (/^5/.test(tag) && components(f).length) {
   const w = sub(f, "w").join("");
   r.relations.push({ value: display(components(f)), kind: w[0] === "g" ? "Mais amplo — do cabeçalho completo" : w[0] === "h" ? "Mais específico — do cabeçalho completo" : w ? "Relação a conferir" : "Associativa", identifier: sub(f, "0")[0] ?? sub(f, "1")[0] });
  }
  if (/^7/.test(tag) && components(f).length) r.mappings.push({ value: display(components(f)), kind: f.indicators?.[1] === "0" ? "Correspondência LCSH" : `Correspondência ${sub(f, "2").join(", ") || "a conferir"}`, identifier: sub(f, "0")[0] ?? sub(f, "1")[0] });
  if (["667", "680", "681", "682", "688"].includes(tag)) r.notes.push({ value: f.subfields?.map(s => s.value).join(" ") ?? "", kind: `Nota (${tag})` });
  if (["670", "675"].includes(tag)) r.citations.push({ value: f.subfields?.map(s => s.value).join(" ") ?? "", kind: tag === "670" ? "Fonte consultada" : "Fonte sem informação encontrada" });
 }
 if ([...r.relations, ...r.mappings].some(v => !v.identifier)) warn(r, "Há referências sem identificador de destino. Permanecem pendentes; nenhum termo foi criado ou mesclado.");
 if (r.components.length > 1) warn(r, "A autorização do cabeçalho completo não torna sua subdivisão aplicável a qualquer assunto.");
 return r;
}
function marcText(text: string): MarcField[] {
 return text.split(/\r?\n/).filter(line => line.trim()).map((line, i) => {
  const match = line.match(/^=?(\d{3})\s+(.*)$/);
  if (!match) throw new Error(`Linha ${i + 1}: campo não reconhecido. Use um campo MARC por linha, sem tabela ou continuação de linha.`);
  const [, tag, data] = match;
  if (Number(tag) < 10) return { tag, value: data };
  const field = data.match(/^(.{2})\s+([|$‡].*)$/);
  if (!field) throw new Error(`Campo ${tag}: informe os dois indicadores e os subcampos.`);
  const subfields = [...field[2].matchAll(/[|$‡]([a-z0-9])\s*([^|$‡]*)/g)].map(m => ({ code: m[1], value: m[2].trim() }));
  if (!subfields.length) throw new Error(`Campo ${tag} sem subcampos reconhecidos.`);
  return { tag, indicators: field[1], subfields };
 });
}
function marcXml(text: string): MarcField[][] {
 if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("XML com DTD ou entidades não é aceito. Nenhum recurso externo será consultado.");
 if (typeof DOMParser === "undefined") throw new Error("A leitura MARCXML precisa ser executada no navegador.");
 const xml = new DOMParser().parseFromString(text, "application/xml");
 if (xml.getElementsByTagName("parsererror").length) throw new Error("XML malformado. Confira o arquivo original.");
 const root = xml.documentElement;
 const records = root.localName === "record" ? [root] : root.localName === "collection" ? [...root.children].filter(n => n.localName === "record") : [];
 if (!records.length || records.length > maxRecords) throw new Error("Use um arquivo MARCXML com 1 a 100 registros.");
 return records.map(record => [...record.children].flatMap<MarcField>(f => {
  if (f.localName === "leader") return [{ tag: "000", value: f.textContent ?? "" }];
  if (f.localName === "controlfield") return [{ tag: f.getAttribute("tag") ?? "", value: f.textContent ?? "" }];
  if (f.localName === "datafield") return [{ tag: f.getAttribute("tag") ?? "", indicators: (f.getAttribute("ind1") ?? " ") + (f.getAttribute("ind2") ?? " "), subfields: [...f.children].filter(s => s.localName === "subfield").map(s => ({ code: s.getAttribute("code") ?? "", value: s.textContent ?? "" })) }];
  return [];
 }));
}
const decode = (input: Uint8Array) => new TextDecoder("utf-8", { fatal: true }).decode(input);
function marcIso(raw: Uint8Array): MarcField[][] {
 const records: MarcField[][] = []; let cursor = 0;
 const ascii = (bytes: Uint8Array) => String.fromCharCode(...bytes);
 while (cursor < raw.length) {
  if (raw.slice(cursor).every(b => b === 10 || b === 13)) break;
  const leader = ascii(raw.slice(cursor, cursor + 24));
  if (leader.length !== 24 || !/^\d{5}/.test(leader) || !/^\d{5}$/.test(leader.slice(12, 17))) throw new Error("Líder ISO 2709 inválido.");
  const size = Number(leader.slice(0, 5)), start = Number(leader.slice(12, 17));
  const record = raw.slice(cursor, cursor + size);
  if (size < 25 || record.length !== size || record.at(-1) !== 29 || start < 25 || start >= size || record[start - 1] !== 30 || (start - 25) % 12) throw new Error("Comprimento, diretório ou terminador ISO 2709 inválido.");
  if (leader[9] !== "a") throw new Error("MARC-8 ainda não é suportado. Exporte UTF-8 ou MARCXML; não haverá conversão silenciosa.");
  const fields: MarcField[] = [{ tag: "000", value: leader }];
  for (let offset = 24; offset < start - 1; offset += 12) {
   const entry = ascii(record.slice(offset, offset + 12));
   if (!/^\d{12}$/.test(entry)) throw new Error("Entrada do diretório ISO inválida.");
   const tag = entry.slice(0, 3), length = Number(entry.slice(3, 7)), position = start + Number(entry.slice(7));
   if (length < 1 || position < start || position + length > size - 1 || record[position + length - 1] !== 30) throw new Error("Campo ISO 2709 truncado.");
   const value = decode(record.slice(position, position + length - 1));
   if (Number(tag) < 10) fields.push({ tag, value });
   else {
    if (value.length < 3 || value[2] !== "\x1f") throw new Error("Campo ISO sem indicadores/subcampos válidos.");
    fields.push({ tag, indicators: value.slice(0, 2), subfields: value.slice(3).split("\x1f").map(s => ({ code: s[0], value: s.slice(1) })) });
   }
  }
  records.push(fields); if (records.length > maxRecords) throw new Error("Máximo de 100 registros por leitura."); cursor += size;
 }
 return records;
}

type Node = Record<string, unknown>;
const namespaces: Record<string, string> = { skos: "http://www.w3.org/2004/02/skos/core#", skosxl: "http://www.w3.org/2008/05/skos-xl#", madsrdf: "http://www.loc.gov/mads/rdf/v1#", gvp: "http://vocab.getty.edu/ontology#", dct: "http://purl.org/dc/terms/", dcterms: "http://purl.org/dc/terms/", rdfs: "http://www.w3.org/2000/01/rdf-schema#", rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#" };
const object = (v: unknown): Node | null => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Node : null;
function linkedData(text: string, source: AuthoritySource): AuthorityPreview[] {
 let parsed: unknown; let ndjson = false;
 try { parsed = JSON.parse(text); } catch { ndjson = true; parsed = text.split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l)); }
 const documents = Array.isArray(parsed) && (ndjson || parsed.every(v => object(v)?.["@graph"])) ? parsed : [parsed];
 if (documents.length > maxRecords) throw new Error("Máximo de 100 registros por leitura.");
 const results: AuthorityPreview[] = [];
 for (const doc of documents) {
  const context = object(doc)?.["@context"]; const prefixes = { ...namespaces };
  for (const c of list(context)) for (const [key, value] of Object.entries(object(c) ?? {})) {
   const iri = typeof value === "string" ? value : object(value)?.["@id"];
   if (typeof iri === "string" && /^https?:/.test(iri)) prefixes[key] = iri;
  }
  const expand = (key: string): string => {
   if (/^(@|https?:|_:)/.test(key)) return key;
   const colon = key.indexOf(":"); return colon >= 0 && prefixes[key.slice(0, colon)] ? prefixes[key.slice(0, colon)] + key.slice(colon + 1) : prefixes[key] ?? key;
  };
  const normalize = (v: unknown): unknown => Array.isArray(v) ? v.map(normalize) : object(v) ? Object.fromEntries(Object.entries(v as Node).map(([k, value]) => [expand(k), ["@id", "@type"].includes(k) ? typeof value === "string" ? expand(value) : Array.isArray(value) ? value.map(x => typeof x === "string" ? expand(x) : x) : value : normalize(value)])) : v;
  const nodes = list(normalize(Array.isArray(doc) ? doc : object(doc)?.["@graph"] ?? [doc])).map(object).filter((n): n is Node => !!n);
  const index = new Map(nodes.filter(n => typeof n["@id"] === "string").map(n => [n["@id"] as string, n]));
  const prop = (n: Node, prefix: string, name: string) => list(n[namespaces[prefix] + name]);
  const literals = (values: unknown[], depth = 0): AuthorityValue[] => depth > 5 ? [] : values.flatMap(v => {
   if (typeof v === "string") return [{ value: v, kind: "Termo", language: "Não informada" }];
   const n = object(v); if (!n) return [];
   if (n["@value"] !== undefined) return [{ value: String(n["@value"]), kind: "Termo", language: String(n["@language"] ?? "Não informada") }];
   const target = index.get(String(n["@id"])) ?? n;
   for (const [p, name] of [["skosxl", "literalForm"], ["madsrdf", "authoritativeLabel"], ["madsrdf", "variantLabel"], ["rdfs", "label"], ["rdf", "value"]]) { const vs = prop(target, p, name); if (vs.length) return literals(vs, depth + 1); }
   return [];
  });
  const labels = (n: Node) => literals(prop(n, "skos", "prefLabel").length ? prop(n, "skos", "prefLabel") : prop(n, "madsrdf", "authoritativeLabel").length ? prop(n, "madsrdf", "authoritativeLabel") : prop(n, "skosxl", "prefLabel"));
  let candidates = nodes.filter(n => labels(n).length && !String(n["@id"] ?? "").startsWith("_:"));
  const about = object(context)?.about;
  if (typeof about === "string") candidates = candidates.filter(n => n["@id"] === about);
  else if (candidates.length > 1) {
   candidates = candidates.filter(n => prop(n, "skos", "inScheme").length || prop(n, "madsrdf", "isMemberOfMADSScheme").length);
   if (!candidates.length) throw new Error("O grafo tem vários conceitos sem identificação clara dos registros principais. Use um recorte completo da origem.");
  }
  if (!candidates.length) throw new Error("Nenhum conceito principal reconhecido. JSON genérico não é um registro de autoridade.");
  for (const n of candidates) {
   const r = empty(source, "JSON-LD", JSON.stringify(doc, null, 2));
   r.identifier = typeof n["@id"] === "string" ? n["@id"] : null; r.labels = labels(n); r.title = r.labels.find(v => v.language?.startsWith("pt"))?.value ?? r.labels[0].value;
   if (list(n["@type"]).some(v => String(v).includes("Deprecated"))) warn(r, "A autoridade está descontinuada segundo o tipo do registro. Revisão obrigatória antes de qualquer uso.");
   r.variants = literals([...prop(n, "skos", "altLabel"), ...prop(n, "skosxl", "altLabel")]);
   for (const v of prop(n, "madsrdf", "hasVariant")) { const target = index.get(String(object(v)?.["@id"])) ?? object(v); if (target) r.variants.push(...literals(prop(target, "madsrdf", "variantLabel"))); }
   for (const [prefix, name, kind] of [["skos", "broader", "Mais amplo"], ["skos", "narrower", "Mais específico"], ["skos", "related", "Associativa"], ["gvp", "broaderPreferred", "Mais amplo preferido"], ["gvp", "broaderNonPreferred", "Mais amplo adicional"]]) for (const value of prop(n, prefix, name)) {
    const id = String(object(value)?.["@id"] ?? value); const target = index.get(id);
    r.relations.push({ value: target ? labels(target)[0]?.value ?? id : id, identifier: id, kind });
   }
   for (const name of ["exactMatch", "closeMatch", "broadMatch", "narrowMatch", "relatedMatch"]) for (const value of prop(n, "skos", name)) { const id = String(object(value)?.["@id"] ?? value); r.mappings.push({ value: id, identifier: id, kind: name }); }
   r.notes = literals([...prop(n, "skos", "scopeNote"), ...prop(n, "madsrdf", "note")]);
   for (const value of prop(n, "madsrdf", "hasSource")) { const target = index.get(String(object(value)?.["@id"])) ?? object(value); if (target) r.citations.push(...literals(prop(target, "madsrdf", "citation-source"))); }
   r.citations.push(...literals(prop(n, "dct", "source"))); r.modified = literals(prop(n, "dct", "modified"))[0]?.value ?? null;
   for (const value of prop(n, "madsrdf", "componentList")) {
    const ordered = object(value)?.["@list"];
    if (!Array.isArray(ordered)) { warn(r, "Lista de componentes referenciada: a ordem exige resolução adicional. O texto não foi dividido por hífens."); continue; }
    for (const part of ordered) { const target = index.get(String(object(part)?.["@id"])) ?? object(part); r.components.push({ kind: target ? list(target["@type"]).map(String).join(", ") : "Componente a conferir", value: target ? labels(target)[0]?.value ?? String(target["@id"] ?? "Não informado") : String(part) }); }
   }
   if (!r.labels.some(v => v.language?.startsWith("pt"))) warn(r, "Não há termo preferido reconhecido em português. Nenhuma tradução foi criada.");
   if (list(context).some(c => typeof c === "string")) warn(r, "Contexto JSON-LD externo não foi consultado. Somente propriedades explícitas reconhecidas foram mapeadas.");
   if (!r.identifier) warn(r, "O conceito não possui identificador da origem.");
   warn(r, "Referências externas não foram consultadas. A hierarquia completa e a vigência atual não foram presumidas.");
   results.push(r); if (results.length > maxRecords) throw new Error("Máximo de 100 registros por leitura.");
  }
 }
 return results;
}
export function readAuthorityPreview(input: string | Uint8Array, source: AuthoritySource): AuthorityPreview[] {
 if (!Object.hasOwn(authoritySources, source)) throw new Error("Selecione uma fonte reconhecida.");
 const raw = typeof input === "string" ? new TextEncoder().encode(input) : input;
 if (!raw.length || raw.length > authorityInputLimit) throw new Error("Use uma amostra não vazia de até 2 MB e 100 registros.");
 const iso = raw.includes(29) && /^\d{5}/.test(String.fromCharCode(...raw.slice(0, 5)));
 let records: AuthorityPreview[];
 if (iso) records = marcIso(raw).map(f => previewMarc(f, source, "ISO 2709 UTF-8", JSON.stringify(f, null, 2)));
 else {
  const text = decode(raw), trimmed = text.trimStart();
  if (/Service temporarily degraded/i.test(text.slice(0, 300))) throw new Error("Esta é uma mensagem de indisponibilidade, não uma autoridade. Nenhum registro foi importado.");
  if (/^[{[]/.test(trimmed)) records = linkedData(text, source);
  else if (trimmed.startsWith("<")) records = marcXml(text).map(f => previewMarc(f, source, "MARCXML", text));
  else records = [previewMarc(marcText(text), source, "MARC em texto", text)];
 }
 if (!records.length || records.length > maxRecords) throw new Error("Use de 1 a 100 registros por leitura.");
 const seen = new Set<string>();
 for (const r of records) if (r.identifier) { if (seen.has(r.identifier)) warn(r, "Identificador repetido no lote: confira as versões. Nenhum registro foi mesclado."); seen.add(r.identifier); }
 return records;
}
