import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthorityDiscoverySearch } from "@/components/authority-discovery-search";
import { AuthorityResultGrid } from "@/components/authority-result-grid";
import { searchPublicAuthorities } from "@/lib/public-subject-authority";
import { authorityHeadingTypes, authorityLanguages, authorityRelations, authoritySearchOption, authoritySorts, authoritySources as sourceOptions } from "@/lib/authority-search-query";
import { publicAuthorityCopy } from "@/lib/public-authority-copy";
import { authorityDiscoveryCopy } from "@/lib/authority-discovery-copy";
import { authorityDiscoveryExtras } from "@/lib/authority-discovery-extras";
import { getInterfaceLanguage } from "@/lib/server-language";

export async function generateMetadata(): Promise<Metadata> {
  const copy = publicAuthorityCopy[await getInterfaceLanguage()];
  return { title: copy.catalogue, description: copy.description, alternates: { canonical: "/autoridades" } };
}

type SearchParams = { busca?: string; fonte?: string; tipo?: string; ordem?: string; idioma?: string; relacao?: string; pagina?: string };

export default async function PublicAuthoritiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const language = await getInterfaceLanguage();
  const copy = publicAuthorityCopy[language];
  const discovery = authorityDiscoveryCopy[language];
  const extra = authorityDiscoveryExtras[language];
  const query = (params.busca ?? "").trim().slice(0, 200);
  const source = authoritySearchOption(params.fonte, sourceOptions, "all");
  const heading = authoritySearchOption(params.tipo, authorityHeadingTypes, "all");
  const sort = authoritySearchOption(params.ordem, authoritySorts, "relevance");
  const variantLanguage = authoritySearchOption(params.idioma, authorityLanguages, "all");
  const relation = authoritySearchOption(params.relacao, authorityRelations, "all");
  const page = Math.max(0, Math.min(250, Number.parseInt(params.pagina ?? "0", 10) || 0));
  const { items, total } = await searchPublicAuthorities({ query, source, heading, sort, page, variantLanguage, relation });
  const hrefForPage = (nextPage: number) => {
    const values = new URLSearchParams({ busca: query, fonte: source, tipo: heading, ordem: sort, idioma: variantLanguage, relacao: relation, pagina: String(nextPage) });
    return `/autoridades?${values}`;
  };
  return <><SiteHeader /><main className="container public-authorities">
    <header className="public-authorities__heading"><p className="eyebrow">{discovery.eyebrow}</p><h1>{copy.catalogue}</h1><p>{copy.description}</p><Link href="/autoridades/explorar">{extra.browseAreas} ↗</Link></header>
    <section className="public-authorities__search-panel" aria-label={discovery.advanced}><AuthorityDiscoverySearch variant="catalog" initialQuery={query} initialSource={source} initialHeading={heading} initialSort={sort} initialLanguage={variantLanguage} initialRelation={relation} /></section>
    <section className="public-authorities__results" aria-labelledby="authority-results-title">
      <div className="public-authorities__results-heading"><div><p className="eyebrow">{String(total).padStart(2, "0")} / {discovery.results}</p><h2 id="authority-results-title">{discovery.resultsHeading}</h2></div>{(query || source !== "all" || heading !== "all" || variantLanguage !== "all" || relation !== "all") && <Link href="/autoridades" className="button button--secondary button--small">{discovery.clear}</Link>}</div>
      {items.length ? <AuthorityResultGrid items={items} page={page} query={query} variantsLabel={copy.variants} openLabel={copy.open} /> : <div className="card public-authorities__empty"><strong>{copy.empty}</strong><p>{discovery.detail}</p><Link href="/autoridades">{discovery.clear}</Link></div>}
      {total > 0 && <div className="public-authorities__bulk"><strong>{extra.exportResults}</strong><div><a className="button button--secondary button--small" href={`/autoridades/exportar?${new URLSearchParams({ busca: query, fonte: source, tipo: heading, ordem: sort, idioma: variantLanguage, relacao: relation, formato: "skos" })}`}>SKOS/JSON-LD</a><a className="button button--secondary button--small" href={`/autoridades/exportar?${new URLSearchParams({ busca: query, fonte: source, tipo: heading, ordem: sort, idioma: variantLanguage, relacao: relation, formato: "marc" })}`}>MARCXML</a></div><p>{extra.exportLimit}</p></div>}
      {total > 24 && <nav aria-label={copy.catalogue} className="public-authorities__pages">{page > 0 && <Link href={hrefForPage(page - 1)}>{copy.previous}</Link>}<span>{page + 1} / {Math.ceil(total / 24)}</span>{(page + 1) * 24 < total && <Link href={hrefForPage(page + 1)}>{copy.next}</Link>}</nav>}
    </section>
  </main></>;
}
