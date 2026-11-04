import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthorityWorldMap } from "@/components/authority-world-map";
import { getPublicAuthorityMapPoints } from "@/lib/authority-map";
import { authorityMapCopy } from "@/lib/authority-map-copy";
import { getInterfaceLanguage } from "@/lib/server-language";

export async function generateMetadata(): Promise<Metadata> {
  const t = authorityMapCopy[await getInterfaceLanguage()];
  return { title: `${t.title} | Pronto!`, description: t.intro, alternates: { canonical: "/autoridades/mapa" } };
}

export default async function AuthorityMapPage() {
  const [language, points] = await Promise.all([getInterfaceLanguage(), getPublicAuthorityMapPoints()]);
  return <div className="authority-map-page"><SiteHeader showServiceStatus={false} /><AuthorityWorldMap points={points} language={language} /></div>;
}
