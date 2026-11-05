import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthorityAreaExplorer } from "@/components/authority-area-explorer";
import { getAuthorityAreas } from "@/lib/authority-areas";
import { authorityPublicCopy } from "@/lib/authority-public-copy";
import { authorityMapCopy } from "@/lib/authority-map-copy";
import { getInterfaceLanguage } from "@/lib/server-language";
import { searchPublicAuthorities } from "@/lib/public-subject-authority";

export async function generateMetadata(): Promise<Metadata> {
  const t = authorityPublicCopy[await getInterfaceLanguage()];
  return { title: t.browse, description: t.areaIntro, alternates: { canonical: "/autoridades/explorar" }, openGraph: { title: `${t.browse} | Pronto!`, description: t.areaIntro, url: "/autoridades/explorar" }, twitter: { title: `${t.browse} | Pronto!`, description: t.areaIntro } };
}

export default async function ExploreAuthoritiesPage() {
  const language = await getInterfaceLanguage();
  const t = authorityPublicCopy[language];
  const areas = await Promise.all((await getAuthorityAreas()).map(async (area) => {
    const result = await searchPublicAuthorities({ query: area.query, source: "all", heading: "all", sort: "relevance", page: 0 });
    return { key: area.key, query: area.query, name: area.names[language], detail: area.detail[language],
      count: result.total, items: result.items.slice(0, 5).map(({ id, label }) => ({ id, label })) };
  }));
  return <><SiteHeader /><main className="container public-authorities authority-areas"><header className="authority-areas__hero"><div><h1>{t.browse}</h1><p>{t.areaIntro}</p></div><Link className="button button--secondary" href="/autoridades/mapa">{authorityMapCopy[language].open} ↗</Link></header><AuthorityAreaExplorer areas={areas} /></main></>;
}
