import { authorityAsMarcXml, authorityAsSkosJsonLd, searchPublicAuthorities, type PublicAuthority } from "@/lib/public-subject-authority";
import { authorityHeadingTypes, authorityLanguages, authorityRelations, authoritySearchOption, authoritySorts, authoritySources } from "@/lib/authority-search-query";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const format = params.get("formato");
  if (format !== "marc" && format !== "skos") return new Response("Formato inválido.", { status: 400 });
  const options = {
    query: (params.get("busca") ?? "").trim().slice(0, 200),
    source: authoritySearchOption(params.get("fonte") ?? undefined, authoritySources, "all"),
    heading: authoritySearchOption(params.get("tipo") ?? undefined, authorityHeadingTypes, "all"),
    sort: authoritySearchOption(params.get("ordem") ?? undefined, authoritySorts, "relevance"),
    variantLanguage: authoritySearchOption(params.get("idioma") ?? undefined, authorityLanguages, "all"),
    relation: authoritySearchOption(params.get("relacao") ?? undefined, authorityRelations, "all"),
  };
  const first = await searchPublicAuthorities({ ...options, page: 0 });
  if (first.total > 500) return new Response("Mais de 500 registros. Refine a busca antes de exportar.", { status: 422 });
  const items: PublicAuthority[] = [...first.items];
  for (let page = 1; items.length < first.total; page++) {
    const next = await searchPublicAuthorities({ ...options, page });
    if (!next.items.length) break;
    items.push(...next.items);
  }
  if (format === "skos") {
    const body = JSON.stringify({ "@context": { skos: "http://www.w3.org/2004/02/skos/core#" }, "@graph": items.map((item) => authorityAsSkosJsonLd(item, url.origin)) }, null, 2);
    return new Response(body, { headers: { "Content-Type": "application/ld+json; charset=utf-8", "Content-Disposition": "attachment; filename=pronto-autoridades-skos.jsonld", "Cache-Control": "no-store" } });
  }
  const records = items.map((item) => authorityAsMarcXml(item).replace(/^.*?<collection[^>]*>/s, "").replace(/<\/collection>\s*$/s, "")).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<collection xmlns="http://www.loc.gov/MARC21/slim">${records}</collection>`;
  return new Response(body, { headers: { "Content-Type": "application/marcxml+xml; charset=utf-8", "Content-Disposition": "attachment; filename=pronto-autoridades-marc.xml", "Cache-Control": "no-store" } });
}
