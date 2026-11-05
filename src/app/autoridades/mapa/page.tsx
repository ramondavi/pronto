import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthorityWorldMap } from "@/components/authority-world-map";
import { getPublicAuthorityMapPoints } from "@/lib/authority-map";
import { authorityMapCopy } from "@/lib/authority-map-copy";
import { getInterfaceLanguage } from "@/lib/server-language";

export async function generateMetadata(): Promise<Metadata> {
  const t = authorityMapCopy[await getInterfaceLanguage()];
  return { title: t.title, description: t.intro, alternates: { canonical: "/autoridades/mapa" }, openGraph: { title: `${t.title} | Pronto!`, description: t.intro, url: "/autoridades/mapa" }, twitter: { title: `${t.title} | Pronto!`, description: t.intro } };
}

export default async function AuthorityMapPage({ searchParams }: { searchParams: Promise<{ autoridade?: string }> }) {
  const { autoridade } = await searchParams;
  const [language, points] = await Promise.all([getInterfaceLanguage(), getPublicAuthorityMapPoints()]);
  return <div className="authority-map-page"><div className="authority-map-page__chrome"><SiteHeader mapCompact showBreadcrumbs={false} /></div><AuthorityWorldMap points={points} language={language} initialAuthorityId={autoridade} /></div>;
}
