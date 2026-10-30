import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthorityAreaExplorer } from "@/components/authority-area-explorer";
import { authorityAreas } from "@/lib/authority-areas";
import { authorityPublicCopy } from "@/lib/authority-public-copy";
import { getInterfaceLanguage } from "@/lib/server-language";
import { searchPublicAuthorities } from "@/lib/public-subject-authority";

export async function generateMetadata(): Promise<Metadata> {
  const t = authorityPublicCopy[await getInterfaceLanguage()];
  return { title: `${t.browse} | Pronto!`, alternates: { canonical: "/autoridades/explorar" } };
}

export default async function ExploreAuthoritiesPage() {
  const language = await getInterfaceLanguage();
  const t = authorityPublicCopy[language];
  const areas = await Promise.all(authorityAreas.map(async (area) => {
    const result = await searchPublicAuthorities({ query: area.query, source: "all", heading: "all", sort: "relevance", page: 0 });
    return { key: area.key, query: area.query, name: area.names[language], detail: area.detail[language],
      count: result.total, items: result.items.slice(0, 5).map(({ id, label }) => ({ id, label })) };
  }));
  return <><SiteHeader /><main className="container public-authorities authority-areas"><nav className="public-authority-detail__breadcrumb"><Link href="/autoridades">← {t.back}</Link></nav><header className="authority-areas__hero"><p className="eyebrow">Pronto! / BIB FA</p><h1>{t.browse}</h1><p>{t.areaIntro}</p></header><AuthorityAreaExplorer areas={areas} /></main></>;
}
