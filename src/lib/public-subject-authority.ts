import { createClient } from "@/lib/supabase/server";
import { parseAuthorityQuery } from "@/lib/authority-search-query";

export type PublicAuthority = {
  id: string; label: string; label_en: string | null; source: string; source_identifier: string | null;
  source_url: string | null; origin: string; heading_type: string | null;
  components: { kind: string; value: string }[];
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

export async function listPublicAuthorities(query = "", page = 0): Promise<PublicAuthority[]> {
  const { data, error } = await (await createClient()).rpc("list_public_subject_authorities", {
    search_value: query.slice(0, 100), page_value: page, target_id: null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data as PublicAuthority[] : [];
}

export type AuthoritySearchOptions = { query: string; source: string; heading: string; sort: string; page: number };

export async function searchPublicAuthorities(options: AuthoritySearchOptions): Promise<{ items: PublicAuthority[]; total: number }> {
  const { data, error } = await (await createClient()).rpc("search_public_subject_authorities", {
    query_groups: parseAuthorityQuery(options.query), source_filter: options.source,
    heading_filter: options.heading, sort_value: options.sort, page_value: options.page,
    exact_query: options.query.slice(0, 200),
  });
  if (error) throw error;
  return { items: Array.isArray(data?.items) ? data.items as PublicAuthority[] : [], total: Number(data?.total ?? 0) };
}

export async function getPublicAuthority(id: string): Promise<PublicAuthority | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await (await createClient()).rpc("get_public_subject_authority", { target_authority_id: id });
  if (error) throw error;
  return data && typeof data === "object" ? data as PublicAuthority : null;
}

const safeText = (value: unknown) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
const xml = (value: unknown) => safeText(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const marcHeading: Record<string, string> = { topic: "150", geographic: "151", personal: "100", corporate: "110", title: "130" };
const marcParts: Record<string, string> = {
  a: "a", x: "x", y: "y", z: "z", v: "v", main: "a", topical: "x", chronological: "y", geographic: "z", form: "v",
  "Assunto-base": "a", "Subdivisão temática": "x", "Subdivisão cronológica": "y", "Subdivisão geográfica": "z", "Subdivisão de forma": "v",
};

function marcField(tag: string, values: { code: string; value: string }[], ind1 = " ") {
  return `<datafield tag="${tag}" ind1="${xml(ind1)}" ind2=" ">${values.map(({ code, value }) => `<subfield code="${code}">${xml(value)}</subfield>`).join("")}</datafield>`;
}

/** MARCXML is a MARC 21 authority interchange encoding; only mapped fields are emitted. */
export function authorityAsMarcXml(record: PublicAuthority): string {
  const tag = marcHeading[record.heading_type ?? ""] ?? "150";
  const heading = record.components.length
    ? record.components.map((part, index) => ({ code: index === 0 ? "a" : (marcParts[part.kind] ?? "x"), value: part.value }))
    : [{ code: "a", value: record.label }];
  const variants = record.variants.map((entry, index) => safeText(entry.value)
    ? marcField(String(Number(tag) + 300), [{ code: "a", value: entry.value }], record.marc_mapping.variant_ind1[index]) : "");
  const relations = record.relations.map((entry, index) => safeText(entry.value) && /^(Mais amplo|Mais específico|Associativa)/.test(entry.kind ?? "")
    ? marcField(String(Number(tag) + 400), [
      ...((entry.kind ?? "").startsWith("Mais amplo") ? [{ code: "w", value: "g" }] : (entry.kind ?? "").startsWith("Mais específico") ? [{ code: "w", value: "h" }] : []),
      { code: "a", value: entry.value },
    ], record.marc_mapping.relation_ind1[index]) : "");
  const notes = record.notes.filter((entry) => safeText(entry.value)).map((entry) => marcField(entry.kind?.includes("680") ? "680" : "667", [{ code: "a", value: entry.value }]));
  const date = new Date(record.published_at);
  const stamp = Number.isNaN(date.getTime()) ? "" : date.toISOString().replace(/[-:T]/g, "").slice(0, 14) + ".0";
  const dateEntered = Number.isNaN(date.getTime()) ? "000000" : date.toISOString().slice(2, 10).replaceAll("-", "");
  const fixed = Array.from({ length: 40 }, () => "|");
  dateEntered.split("").forEach((character, index) => { fixed[index] = character; });
  fixed[9] = "a"; // established heading
  fixed[39] = "d"; // other cataloging source
  const source = authoritySources[record.source] ?? record.source;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<collection xmlns="http://www.loc.gov/MARC21/slim"><record>` +
    `<leader>00000nz  a2200000n  4500</leader><controlfield tag="001">${xml(record.id)}</controlfield>` +
    `<controlfield tag="003">Pronto</controlfield><controlfield tag="005">${stamp}</controlfield>` +
    `<controlfield tag="008">${fixed.join("")}</controlfield>` +
    marcField("040", [{ code: "a", value: source }, { code: "b", value: "por" }, { code: "c", value: "Pronto!" }]) +
    marcField(tag, heading, record.marc_mapping.heading_ind1) + variants.join("") + relations.join("") + notes.join("") +
    (record.source === "pronto" ? "" : marcField("670", [{ code: "a", value: `${source}${record.source_identifier ? ` (${record.source_identifier})` : ""}` }])) + `</record></collection>`;
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
