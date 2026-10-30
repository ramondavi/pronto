import { authorityHeadingTypes, authoritySearchOption, authoritySorts, authoritySources } from "@/lib/authority-search-query";
import { searchPublicAuthorities } from "@/lib/public-subject-authority";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 200);
  const source = authoritySearchOption(params.get("fonte") ?? undefined, authoritySources, "all");
  const heading = authoritySearchOption(params.get("tipo") ?? undefined, authorityHeadingTypes, "all");
  const sort = authoritySearchOption(params.get("ordem") ?? undefined, authoritySorts, "relevance");
  const { items } = await searchPublicAuthorities({ query, source, heading, sort, page: 0 });
  return Response.json({ results: items.slice(0, 6).map(({ id, label, label_en, source: itemSource }) => ({ id, label, label_en, source: itemSource })) }, { headers: { "Cache-Control": "no-store" } });
}
