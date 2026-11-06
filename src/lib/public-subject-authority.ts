import { createClient } from "@/lib/supabase/server";
import { parseAuthorityQuery } from "@/lib/authority-search-query";
import { headingTagByKind } from "@/lib/authority-heading-types";

export type PublicAuthority = {
  id: string; label: string; label_en: string | null; source: string; source_identifier: string | null;
  source_url: string | null; origin: string; heading_type: string | null;
  components: { kind: string; value: string; marcCode?: string }[];
  variants: { value: string; language?: string }[];
  notes: { kind?: string; value: string }[];
  relations: { kind?: string; value: string; identifier?: string }[];
  rights_statement: string; published_at: string;
  marc_mapping: { heading_ind1: string; variant_ind1: string[]; relation_ind1: string[] };
};

export const authoritySources: Record<string, string> = {
  bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA",
  pergamum: "Rede Pergamum", loc: "Library of Congress", pronto: "Pronto!",
};

export function confirmedPublicAuthorityRelation(identifier: string | undefined, target: PublicAuthority, source: string): boolean {
  const value = identifier?.trim();
  if (!value) return false;
  if (value === target.id || value === target.source_url || (source === target.source && value === target.source_identifier)) return true;
  return false;
}

export async function listPublicAuthorities(query = "", page = 0): Promise<PublicAuthority[]> {
  const { data, error } = await (await createClient()).rpc("list_public_subject_authorities", {
    search_value: query.slice(0, 100), page_value: page, target_id: null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data as PublicAuthority[] : [];
}

export type AuthoritySearchOptions = { query: string; source: string; heading: string; sort: string; page: number; variantLanguage?: string; relation?: string };

export async function searchPublicAuthorities(options: AuthoritySearchOptions): Promise<{ items: PublicAuthority[]; total: number }> {
  const { data, error } = await (await createClient()).rpc("search_public_subject_authorities_filtered", {
    query_groups: parseAuthorityQuery(options.query), source_filter: options.source,
    heading_filter: options.heading, sort_value: options.sort, page_value: options.page,
    exact_query: options.query.slice(0, 200),
    language_filter: options.variantLanguage ?? "all", relation_filter: options.relation ?? "all",
  });
  if (error) throw error;
  return { items: Array.isArray(data?.items) ? data.items as PublicAuthority[] : [], total: Number(data?.total ?? 0) };
}

/** Present 20 records while retaining the existing 24-record database RPC. */
export async function searchPublicAuthoritiesPage(options: AuthoritySearchOptions): Promise<{ items: PublicAuthority[]; total: number }> {
  const start = options.page * 20;
  const firstPage = Math.floor(start / 24);
  const offset = start % 24;
  const first = await searchPublicAuthorities({ ...options, page: firstPage });
  if (offset + 20 <= 24 || start + first.items.length - offset >= first.total) {
    return { items: first.items.slice(offset, offset + 20), total: first.total };
  }
  const second = await searchPublicAuthorities({ ...options, page: firstPage + 1 });
  return { items: [...first.items.slice(offset), ...second.items].slice(0, 20), total: first.total };
}

export async function getPublicAuthority(id: string): Promise<PublicAuthority | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await (await createClient()).rpc("get_public_subject_authority", { target_authority_id: id });
  if (error) throw error;
  return data && typeof data === "object" ? data as PublicAuthority : null;
}

const safeText = (value: unknown) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
const xml = (value: unknown) => safeText(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const marcParts: Record<string, string> = {
  a: "a", x: "x", y: "y", z: "z", v: "v", main: "a", topical: "x", chronological: "y", geographic: "z", form: "v",
  "Assunto-base": "a", "Subdivisão temática": "x", "Subdivisão cronológica": "y", "Subdivisão geográfica": "z", "Subdivisão de forma": "v",
};

function marcField(tag: string, values: { code: string; value: string }[], ind1 = " ") {
  return `<datafield tag="${tag}" ind1="${xml(ind1)}" ind2=" ">${values.map(({ code, value }) => `<subfield code="${code}">${xml(value)}</subfield>`).join("")}</datafield>`;
}

type MarcField = { tag: string; value?: string; ind1?: string; ind2?: string; subfields?: { code: string; value: string }[] };

function authorityMarcFields(record: PublicAuthority): { leader: string; fields: MarcField[] } {
  const tag = headingTagByKind[record.heading_type ?? ""] ?? "150";
  const firstCode = ({ "180": "x", "181": "z", "182": "y", "185": "v" } as Record<string, string>)[tag] ?? "a";
  const heading = record.components.length
    ? record.components.map((part, index) => ({ code: part.marcCode ?? (index === 0 ? firstCode : (marcParts[part.kind] ?? "x")), value: part.value }))
    : [{ code: firstCode, value: record.label }];
  const date = new Date(record.published_at);
  const stamp = Number.isNaN(date.getTime()) ? "" : date.toISOString().replace(/[-:T]/g, "").slice(0, 14) + ".0";
  const dateEntered = Number.isNaN(date.getTime()) ? "000000" : date.toISOString().slice(2, 10).replaceAll("-", "");
  const fixed = Array.from({ length: 40 }, () => "|");
  dateEntered.split("").forEach((character, index) => { fixed[index] = character; });
  fixed[9] = "a";
  fixed[39] = "d";
  const source = authoritySources[record.source] ?? record.source;
  const data = (fieldTag: string, subfields: { code: string; value: string }[], ind1 = " "): MarcField => ({ tag: fieldTag, ind1, ind2: " ", subfields });
  return { leader: "00000nz  a2200000n  4500", fields: [
    { tag: "001", value: record.id }, { tag: "003", value: "Pronto" }, { tag: "005", value: stamp }, { tag: "008", value: fixed.join("") },
    data("040", [{ code: "a", value: source }, { code: "b", value: "por" }, { code: "c", value: "Pronto!" }]),
    data(tag, heading, record.marc_mapping.heading_ind1),
    ...record.variants.flatMap((entry, index) => safeText(entry.value) ? [data(String(Number(tag) + 300), [{ code: firstCode, value: entry.value }], record.marc_mapping.variant_ind1[index])] : []),
    ...record.relations.flatMap((entry, index) => safeText(entry.value) && /^(Mais amplo|Mais específico|Associativa)/.test(entry.kind ?? "") ? [data(String(Number(tag) + 400), [
      ...((entry.kind ?? "").startsWith("Mais amplo") ? [{ code: "w", value: "g" }] : (entry.kind ?? "").startsWith("Mais específico") ? [{ code: "w", value: "h" }] : []),
      { code: firstCode, value: entry.value },
    ], record.marc_mapping.relation_ind1[index])] : []),
    ...record.notes.filter((entry) => safeText(entry.value)).map((entry) => data(entry.kind?.includes("680") ? "680" : "667", [{ code: "a", value: entry.value }])),
    ...(record.source === "pronto" ? [] : [data("670", [{ code: "a", value: `${source}${record.source_identifier ? ` (${record.source_identifier})` : ""}` }])]),
  ] };
}

/** Human-readable view of the same mapped fields used in the MARCXML and ISO 2709 exports. */
export function authorityAsMarcText(record: PublicAuthority): string {
  const { leader, fields } = authorityMarcFields(record);
  return [`=LDR  ${leader}`, ...fields.map((field) => field.subfields
    ? `=${field.tag}  ${field.ind1 ?? " "}${field.ind2 ?? " "}${field.subfields.map(({ code, value }) => `$${code}${safeText(value)}`).join("")}`
    : `=${field.tag}  ${safeText(field.value)}`)].join("\n");
}

/** MARCXML is a MARC 21 authority interchange encoding; only mapped fields are emitted. */
export function authorityAsMarcXml(record: PublicAuthority): string {
  const { leader, fields } = authorityMarcFields(record);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<collection xmlns="http://www.loc.gov/MARC21/slim"><record>` +
    `<leader>${leader}</leader>` + fields.map((field) => field.subfields
      ? marcField(field.tag, field.subfields, field.ind1)
      : `<controlfield tag="${field.tag}">${xml(field.value)}</controlfield>`).join("") + `</record></collection>`;
}

/** MARC 21 authority record in ISO 2709, encoded as UTF-8 bytes. */
export function authorityAsIso2709(record: PublicAuthority): Uint8Array {
  const { leader, fields } = authorityMarcFields(record);
  const encoder = new TextEncoder();
  const fieldBytes = fields.map((field) => {
    const text = field.subfields
      ? `${(field.ind1 ?? " ").slice(0, 1)}${(field.ind2 ?? " ").slice(0, 1)}${field.subfields.map(({ code, value }) => `\x1f${code.slice(0, 1)}${safeText(value)}`).join("")}`
      : safeText(field.value);
    const data = encoder.encode(text);
    return { tag: field.tag, bytes: Uint8Array.from([...data, 0x1e]) };
  });
  let offset = 0;
  const directory = fieldBytes.map(({ tag, bytes }) => {
    if (bytes.length > 9999 || offset > 99999) throw new Error("Campo MARC excede o limite ISO 2709.");
    const entry = `${tag}${String(bytes.length).padStart(4, "0")}${String(offset).padStart(5, "0")}`;
    offset += bytes.length;
    return entry;
  }).join("");
  const base = 24 + directory.length + 1;
  const length = base + offset + 1;
  if (base > 99999 || length > 99999) throw new Error("Registro MARC excede o limite ISO 2709.");
  const fixedLeader = `${String(length).padStart(5, "0")}${leader.slice(5, 12)}${String(base).padStart(5, "0")}${leader.slice(17)}`;
  const result = new Uint8Array(length);
  result.set(encoder.encode(fixedLeader + directory), 0);
  result[base - 1] = 0x1e;
  let cursor = base;
  for (const field of fieldBytes) { result.set(field.bytes, cursor); cursor += field.bytes.length; }
  result[cursor] = 0x1d;
  return result;
}

/** JSON-LD is an RDF serialization of the mapped SKOS fields. */
export function authorityAsSkosJsonLd(record: PublicAuthority, baseUrl: string) {
  const variants = record.variants.filter((entry) => safeText(entry.value)).map((entry) => {
    const language = /^[a-z]{2,3}(-[a-z0-9]+)*$/i.test(entry.language ?? "") ? entry.language!.toLowerCase() : null;
    return { "@value": safeText(entry.value), ...(language ? { "@language": language } : {}) };
  }).filter((entry) => !(entry["@language"] === "pt" && entry["@value"].toLocaleLowerCase("pt-BR") === record.label.toLocaleLowerCase("pt-BR"))
    && !(entry["@language"] === "en" && entry["@value"].toLocaleLowerCase("en") === record.label_en?.toLocaleLowerCase("en")));
  const relation = (kind: string) => record.relations.filter((entry) => entry.kind?.startsWith(kind) && /^https:\/\/[^\s]+$/.test(entry.identifier ?? ""))
    .map((entry) => ({ "@id": entry.identifier! }));
  return {
    "@context": { skos: "http://www.w3.org/2004/02/skos/core#", dcterms: "http://purl.org/dc/terms/", prefLabel: "skos:prefLabel", altLabel: "skos:altLabel", scopeNote: "skos:scopeNote" },
    "@id": `${baseUrl}/autoridades/${record.id}`, "@type": "skos:Concept",
    prefLabel: [{ "@value": record.label, "@language": "pt" }, ...(record.label_en ? [{ "@value": record.label_en, "@language": "en" }] : [])],
    altLabel: variants, scopeNote: record.notes.map((entry) => safeText(entry.value)).filter(Boolean),
    "skos:broader": relation("Mais amplo"), "skos:narrower": relation("Mais específico"), "skos:related": relation("Associativa"),
    "dcterms:source": authoritySources[record.source] ?? record.source,
    "dcterms:rights": record.rights_statement,
  };
}
