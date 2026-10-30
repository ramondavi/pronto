import { authorityHeadingTypes, authoritySearchOption, authoritySorts, authoritySources } from "@/lib/authority-search-query";
import { confirmedPublicAuthorityRelation, listPublicAuthorities, searchPublicAuthorities } from "@/lib/public-subject-authority";
import { authorityEditDistance, foldAuthorityText } from "@/lib/authority-fuzzy";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 200);
  const source = authoritySearchOption(params.get("fonte") ?? undefined, authoritySources, "all");
  const heading = authoritySearchOption(params.get("tipo") ?? undefined, authorityHeadingTypes, "all");
  const sort = authoritySearchOption(params.get("ordem") ?? undefined, authoritySorts, "relevance");
  const variantLanguage = authoritySearchOption(params.get("idioma") ?? undefined, ["all", "pt", "en", "es", "de", "fr", "it"] as const, "all");
  const relation = authoritySearchOption(params.get("relacao") ?? undefined, ["all", "broader", "narrower", "related"] as const, "all");
  const { items } = await searchPublicAuthorities({ query, source, heading, sort, page: 0, variantLanguage, relation });
  const compact = ({ id, label, label_en, source: itemSource }: typeof items[number]) => ({ id, label, label_en, source: itemSource });
  const related = [] as ReturnType<typeof compact>[];
  if (query && items.length && foldAuthorityText(items[0].label) === foldAuthorityText(query)) {
    for (const entry of items[0].relations.slice(0, 5)) {
      const found = await searchPublicAuthorities({ query: `"${entry.value.replaceAll('"', "")}"`, source: "all", heading: "all", sort: "relevance", page: 0 });
      const match = found.items.find((item) => foldAuthorityText(item.label) === foldAuthorityText(entry.value) && confirmedPublicAuthorityRelation(entry.identifier, item, items[0].source));
      if (match && match.id !== items[0].id && !related.some((item) => item.id === match.id)) related.push(compact(match));
    }
  }
  let correction: ReturnType<typeof compact> | null = null;
  if (query.length >= 4 && !items.length && !/\b(?:AND|OR|NOT)\b|"/i.test(query)) {
    const pages = await Promise.all(Array.from({ length: 5 }, (_, page) => listPublicAuthorities("", page)));
    const candidate = pages.flat().map((item) => ({ item, distance: authorityEditDistance(query, item.label) }))
      .filter(({ distance }) => distance > 0 && distance <= Math.max(2, Math.floor(query.length / 4)))
      .sort((a, b) => a.distance - b.distance || a.item.label.localeCompare(b.item.label))[0];
    if (candidate) correction = compact(candidate.item);
  }
  return Response.json({ results: items.slice(0, 6).map(compact), related, correction }, { headers: { "Cache-Control": "no-store" } });
}
