import { authorityHeadingTypes, authorityLanguages, authorityRelations, authoritySearchOption, authoritySorts, authoritySources } from "@/lib/authority-search-query";
import { searchPublicAuthorities } from "@/lib/public-subject-authority";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await searchPublicAuthorities({
    query: (params.get("busca") ?? "").trim().slice(0, 200),
    source: authoritySearchOption(params.get("fonte") ?? undefined, authoritySources, "all"),
    heading: authoritySearchOption(params.get("tipo") ?? undefined, authorityHeadingTypes, "all"),
    sort: authoritySearchOption(params.get("ordem") ?? undefined, authoritySorts, "relevance"),
    variantLanguage: authoritySearchOption(params.get("idioma") ?? undefined, authorityLanguages, "all"),
    relation: authoritySearchOption(params.get("relacao") ?? undefined, authorityRelations, "all"),
    page: 0,
  });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
