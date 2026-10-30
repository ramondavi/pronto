import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthorityDiscoverySearch } from "@/components/authority-discovery-search";
import { authoritySources, getPublicAuthority } from "@/lib/public-subject-authority";
import { publicAuthorityCopy } from "@/lib/public-authority-copy";
import { getInterfaceLanguage } from "@/lib/server-language";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const record = await getPublicAuthority((await params).id);
  const copy = publicAuthorityCopy[await getInterfaceLanguage()];
  return { title: record ? `${record.label} | ${copy.catalogue}` : copy.catalogue, robots: record ? undefined : { index: false } };
}

export default async function PublicAuthorityPage({ params }: { params: Promise<{ id: string }> }) {
  const record = await getPublicAuthority((await params).id);
  const copy = publicAuthorityCopy[await getInterfaceLanguage()];
  if (!record) notFound();
  const sourceUrl = record.source_url?.startsWith("https://") ? record.source_url : null;
  return <><SiteHeader /><main className="container public-authorities public-authority-detail">
    <nav className="public-authority-detail__breadcrumb" aria-label={copy.back}><Link href="/autoridades">← {copy.back}</Link></nav>
    <header className="public-authority-detail__hero"><div><p className="eyebrow">{copy.published}</p><h1>{record.label}</h1>{record.label_en && <p>{copy.equivalent}: <strong>{record.label_en}</strong></p>}</div><span aria-hidden="true" className="public-authority-detail__mark">A<span>·</span></span></header>
    <section className="public-authorities__search-panel" aria-label={copy.search}><AuthorityDiscoverySearch variant="catalog" /></section>
    <div className="public-authority-detail__grid"><div className="public-authority-detail__content">
      {!!record.components.length && <section className="card"><p className="eyebrow">01 / {copy.heading}</p><h2>{copy.heading}</h2><ol className="public-authority-detail__components">{record.components.map((part, index) => <li key={index}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{part.kind}</strong><p>{part.value}</p></div></li>)}</ol></section>}
      {!!record.variants.length && <section className="card"><p className="eyebrow">02 / {copy.variants}</p><h2>{copy.variants}</h2><ul className="public-authority-detail__tags">{record.variants.map((part, index) => <li key={index}>{part.value}</li>)}</ul></section>}
      {!!record.relations.length && <section className="card"><p className="eyebrow">03 / {copy.relations}</p><h2>{copy.relations}</h2><ul className="public-authority-detail__relations">{record.relations.map((part, index) => <li key={index}><span>{part.kind || copy.relations}</span><strong>{part.value}</strong></li>)}</ul><p className="public-authority-detail__hint">{copy.relationNote}</p></section>}
      {!!record.notes.length && <section className="card"><p className="eyebrow">04 / {copy.notes}</p><h2>{copy.notes}</h2>{record.notes.map((part, index) => <p key={index}>{part.value}</p>)}</section>}
    </div><aside className="public-authority-detail__aside">
      <section className="card"><p className="eyebrow">{copy.record}</p><h2>{copy.source}</h2><dl><div><dt>{copy.source}</dt><dd>{authoritySources[record.source] ?? record.source}</dd></div>{record.source_identifier && <div><dt>{copy.identifier}</dt><dd>{record.source_identifier}</dd></div>}<div><dt>{copy.rights}</dt><dd>{record.rights_statement}</dd></div></dl>{sourceUrl && <p><a href={sourceUrl} target="_blank" rel="noopener noreferrer">{copy.original} ↗</a></p>}</section>
      <section className="card public-authority-detail__export"><p className="eyebrow">MARC21 / SKOS</p><h2>{copy.export}</h2><p>{copy.exportNote}</p><div className="public-authorities__exports"><a className="button button--secondary" href={`/autoridades/${record.id}/marc.xml`}>{copy.marc}</a><a className="button button--secondary" href={`/autoridades/${record.id}/skos.jsonld`}>{copy.skos}</a></div></section>
    </aside></div>
  </main></>;
}
