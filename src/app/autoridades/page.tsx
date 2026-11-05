import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthorityCatalogSearch } from "@/components/authority-catalog-search";
import { searchPublicAuthoritiesPage } from "@/lib/public-subject-authority";
import { authorityHeadingTypes, authorityLanguages, authorityRelations, authoritySearchOption, authoritySorts, authoritySources as sourceOptions } from "@/lib/authority-search-query";
import { publicAuthorityCopy } from "@/lib/public-authority-copy";
import { authorityDiscoveryCopy } from "@/lib/authority-discovery-copy";
import { authorityDiscoveryExtras } from "@/lib/authority-discovery-extras";
import { authorityPublicCopy } from "@/lib/authority-public-copy";
import { authorityMapCopy } from "@/lib/authority-map-copy";
import { getInterfaceLanguage } from "@/lib/server-language";

export async function generateMetadata(): Promise<Metadata> {
  const copy = authorityPublicCopy[await getInterfaceLanguage()];
  return { title: copy.title, description: copy.intro, alternates: { canonical: "/autoridades" }, openGraph: { title: `${copy.title} | Pronto!`, description: copy.intro, url: "/autoridades" }, twitter: { title: `${copy.title} | Pronto!`, description: copy.intro } };
}

type SearchParams = { busca?: string; fonte?: string; tipo?: string; ordem?: string; idioma?: string; relacao?: string; pagina?: string };

export default async function PublicAuthoritiesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const language = await getInterfaceLanguage();
  const copy = publicAuthorityCopy[language];
  const discovery = authorityDiscoveryCopy[language];
  const extra = authorityDiscoveryExtras[language];
  const publicCopy = authorityPublicCopy[language];
  const query = (params.busca ?? "").trim().slice(0, 200);
  const source = authoritySearchOption(params.fonte, sourceOptions, "all");
  const heading = authoritySearchOption(params.tipo, authorityHeadingTypes, "all");
  const sort = authoritySearchOption(params.ordem, authoritySorts, "relevance");
  const variantLanguage = authoritySearchOption(params.idioma, authorityLanguages, "all");
  const relation = authoritySearchOption(params.relacao, authorityRelations, "all");
  const page = Math.max(0, Math.min(250, Number.parseInt(params.pagina ?? "0", 10) || 0));
  const { items, total } = await searchPublicAuthoritiesPage({ query, source, heading, sort, page, variantLanguage, relation });
  return <><SiteHeader /><main className="container public-authorities">
    <header className="public-authorities__intro"><div><p className="eyebrow">{discovery.eyebrow}</p><h1>{publicCopy.title}</h1><p>{publicCopy.intro}</p></div><div className="authority-public-links"><Link className="button button--secondary" href="/autoridades/explorar">{publicCopy.browse} ↗</Link><Link className="button button--secondary" href="/autoridades/mapa">{authorityMapCopy[language].open} ↗</Link></div></header>
    <AuthorityCatalogSearch key={`${query}-${source}-${heading}-${sort}-${variantLanguage}-${relation}-${page}`} options={{ query, source, heading, sort, variantLanguage, relation }} initialItems={items} initialTotal={total} page={page} labels={{ found: discovery.results, results: publicCopy.results, clear: discovery.clear, variants: publicCopy.variants, open: discovery.open, empty: publicCopy.empty, emptyHint: publicCopy.emptyHint, browse: publicCopy.browse, browsePlaces: authorityMapCopy[language].open, professional: publicCopy.professional, export: publicCopy.export, professionalIntro: publicCopy.professionalIntro, exportResults: extra.exportResults, exportLimit: extra.exportLimit, catalogue: copy.catalogue, previous: copy.previous, next: copy.next, pending: discovery.pending, failed: discovery.failed }} />
  </main></>;
}
