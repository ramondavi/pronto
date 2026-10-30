import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { authoritySources, listPublicAuthorities } from "@/lib/public-subject-authority";
import { publicAuthorityCopy } from "@/lib/public-authority-copy";
import { getInterfaceLanguage } from "@/lib/server-language";

export async function generateMetadata(): Promise<Metadata> {
  const copy = publicAuthorityCopy[await getInterfaceLanguage()];
  return { title: copy.catalogue, description: copy.description, alternates: { canonical: "/autoridades" } };
}

export default async function PublicAuthoritiesPage({ searchParams }: { searchParams: Promise<{ busca?: string; pagina?: string }> }) {
  const { busca, pagina } = await searchParams;
  const copy = publicAuthorityCopy[await getInterfaceLanguage()];
  const query = (busca ?? "").trim().slice(0, 100);
  const page = Math.max(0, Math.min(250, Number.parseInt(pagina ?? "0", 10) || 0));
  const items = await listPublicAuthorities(query, page);
  return <><SiteHeader /><main className="container public-authorities">
    <header><p className="eyebrow">Pronto!</p><h1>{copy.catalogue}</h1><p>{copy.description}</p></header>
    <form action="/autoridades" method="get" className="public-authorities__search"><label htmlFor="authority-search">{copy.search}</label><div><input id="authority-search" name="busca" type="search" defaultValue={query} maxLength={100} /><button className="button" type="submit">{copy.searchButton}</button></div></form>
    <p role="status">{items.length ? `${items.length} ${copy.found}` : copy.empty}</p>
    <div className="public-authorities__list">{items.map((item) => <article className="card" key={item.id}><h2><Link href={`/autoridades/${item.id}`}>{item.label}</Link></h2><p>{authoritySources[item.source] ?? item.source}{item.label_en ? ` · ${item.label_en}` : ""}</p><Link href={`/autoridades/${item.id}`}>{copy.open}</Link></article>)}</div>
    <nav aria-label={copy.catalogue} className="public-authorities__pages">{page > 0 && <Link href={`/autoridades?busca=${encodeURIComponent(query)}&pagina=${page - 1}`}>{copy.previous}</Link>}{items.length === 40 && <Link href={`/autoridades?busca=${encodeURIComponent(query)}&pagina=${page + 1}`}>{copy.next}</Link>}</nav>
  </main></>;
}
