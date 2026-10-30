import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { authorityAreas } from "@/lib/authority-areas";
import { authorityDiscoveryExtras } from "@/lib/authority-discovery-extras";
import { getInterfaceLanguage } from "@/lib/server-language";
import { searchPublicAuthorities } from "@/lib/public-subject-authority";

export async function generateMetadata(): Promise<Metadata> {
  const t = authorityDiscoveryExtras[await getInterfaceLanguage()];
  return { title: `${t.areas} | Pronto!`, alternates: { canonical: "/autoridades/explorar" } };
}

export default async function ExploreAuthoritiesPage() {
  const language = await getInterfaceLanguage();
  const t = authorityDiscoveryExtras[language];
  const areas = await Promise.all(authorityAreas.map(async (area) => ({
    ...area, count: (await searchPublicAuthorities({ query: area.query, source: "all", heading: "all", sort: "relevance", page: 0 })).total,
  })));
  return <><SiteHeader /><main className="container public-authorities authority-areas"><nav><Link href="/autoridades">← {t.browseAreas}</Link></nav><header className="public-authorities__heading"><p className="eyebrow">Pronto! / BIB FA</p><h1>{t.areas}</h1></header><div className="authority-areas__grid">{areas.map((area, index) => <Link key={area.key} className="card authority-areas__card" href={`/autoridades?busca=${encodeURIComponent(area.query)}`}><span>{String(index + 1).padStart(2, "0")}</span><h2>{area.names[language]}</h2><p>{area.detail[language]}</p><strong>{area.count} ↗</strong></Link>)}</div></main></>;
}
