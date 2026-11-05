import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthorityDiscoverySearch } from "@/components/authority-discovery-search";
import { authoritySources, confirmedPublicAuthorityRelation, getPublicAuthority, searchPublicAuthorities } from "@/lib/public-subject-authority";
import { publicAuthorityCopy } from "@/lib/public-authority-copy";
import { authorityDiscoveryExtras } from "@/lib/authority-discovery-extras";
import { authorityPublicCopy } from "@/lib/authority-public-copy";
import { foldAuthorityText } from "@/lib/authority-fuzzy";
import { getInterfaceLanguage } from "@/lib/server-language";
import { getPublicAuthorityMapPoints } from "@/lib/authority-map";
import { authorityDetailCopy } from "@/lib/authority-detail-copy";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { publicAuthorityType } from "@/lib/authority-type-public-copy";

const headingIcons: Record<string, AppIconName> = {
  personal: "person", corporate: "work", meeting: "account", title: "book", named_event: "calendar",
  chronological: "clock", topic: "tag", geographic: "globe", genre_form: "book", medium: "tag",
  topical_subdivision: "hierarchy", geographic_subdivision: "globe", chronological_subdivision: "clock", form_subdivision: "document",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const record = await getPublicAuthority((await params).id);
  const copy = authorityPublicCopy[await getInterfaceLanguage()];
  const title = record ? `${record.label} | ${copy.title}` : copy.title;
  const description = record ? `${record.label}. ${copy.intro}` : copy.intro;
  return { title, description, alternates: record ? { canonical: `/autoridades/${record.id}` } : undefined, openGraph: { title: `${title} | Pronto!`, description, url: record ? `/autoridades/${record.id}` : "/autoridades" }, twitter: { title: `${title} | Pronto!`, description }, robots: record ? undefined : { index: false } };
}

export default async function PublicAuthorityPage({ params }: { params: Promise<{ id: string }> }) {
  const record = await getPublicAuthority((await params).id);
  const language = await getInterfaceLanguage();
  const copy = publicAuthorityCopy[language];
  const extra = authorityDiscoveryExtras[language];
  const publicCopy = authorityPublicCopy[language];
  const detailCopy = authorityDetailCopy[language];
  if (!record) notFound();
  const [mapPoints, relationLinks] = await Promise.all([
    getPublicAuthorityMapPoints(),
    Promise.all(record.relations.slice(0, 12).map(async (relation) => {
      const results = await searchPublicAuthorities({ query: `"${relation.value.replaceAll('"', "")}"`, source: "all", heading: "all", sort: "relevance", page: 0 });
      const published = results.items.find((item) => foldAuthorityText(item.label) === foldAuthorityText(relation.value) && confirmedPublicAuthorityRelation(relation.identifier, item, record.source));
      return { ...relation, published };
    })),
  ]);
  const mapPoint = mapPoints.find((point) => point.authority_id === record.id);
  const icon = headingIcons[record.heading_type ?? ""] ?? "tag";
  const sourceUrl = record.source_url?.startsWith("https://") ? record.source_url : null;
  return <><SiteHeader authorityTitle={record.label} /><main className="container public-authorities public-authority-detail">
    <header className="public-authority-detail__hero"><div className="public-authority-detail__identity"><div className="public-authority-detail__identity-top"><span className="public-authority-detail__type">{publicAuthorityType(language, record.heading_type)}</span></div><div className="public-authority-detail__main"><p className="public-authority-detail__preferred">{detailCopy.preferred}</p><h1 style={{ fontSize: `clamp(1.1rem, ${Math.min(4.4, 100 / Math.max(record.label.length, 15))}vw, 4.4rem)` }}>{record.label}</h1><div className="public-authority-detail__summary"><div className="public-authority-detail__summary-copy"><p className="public-authority-detail__intro">{detailCopy.intro}</p>{record.label_en && <section className="public-authority-detail__equivalents" aria-label={detailCopy.equivalent}><h2>{detailCopy.equivalent}</h2><dl><div><dt>{detailCopy.english} <span lang="en">(EN)</span></dt><dd lang="en">{record.label_en}</dd></div></dl></section>}</div>{mapPoint && <Link className="button button--secondary button--small public-authority-detail__map-link" href={`/autoridades/mapa?autoridade=${encodeURIComponent(record.id)}`}>{detailCopy.map} ↗</Link>}</div></div></div><span aria-hidden="true" className="public-authority-detail__mark"><AppIcon name={icon} /></span></header>
    {!!relationLinks.length && <section className="card authority-map"><div><p className="eyebrow">{extra.related}</p><h2>{extra.related}</h2></div><div className="authority-map__center">{record.label}</div><div className="authority-map__links">{relationLinks.map((relation, index) => <div key={index} className="authority-map__node"><small>{relation.kind || extra.related}</small>{relation.published ? <Link href={`/autoridades/${relation.published.id}`}>{relation.value} ↗</Link> : <span>{relation.value}</span>}</div>)}</div></section>}
    <div className="public-authority-detail__grid"><div className="public-authority-detail__content">
      {!!record.components.length && <section className="card"><p className="eyebrow">01 / {publicCopy.heading}</p><h2>{publicCopy.heading}</h2><ol className="public-authority-detail__components">{record.components.map((part, index) => <li key={index}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{part.kind}</strong><p>{part.value}</p></div></li>)}</ol></section>}
      {!!record.variants.length && <section className="card"><p className="eyebrow">02 / {publicCopy.variants}</p><h2>{publicCopy.variants}</h2><ul className="public-authority-detail__tags">{record.variants.map((part, index) => <li key={index}>{part.value}</li>)}</ul></section>}
      {!!record.relations.length && <section className="card"><p className="eyebrow">03 / {publicCopy.relations}</p><h2>{publicCopy.relations}</h2><ul className="public-authority-detail__relations">{record.relations.map((part, index) => <li key={index}><span>{part.kind || publicCopy.relations}</span><strong>{part.value}</strong></li>)}</ul><p className="public-authority-detail__hint">{copy.relationNote}</p></section>}
      {!!record.notes.length && <section className="card"><p className="eyebrow">04 / {publicCopy.notes}</p><h2>{publicCopy.notes}</h2>{record.notes.map((part, index) => <p key={index}>{part.value}</p>)}</section>}
    </div><aside className="public-authority-detail__aside">
      <details className="authority-professional authority-professional--detail"><summary><span>{publicCopy.professional}</span><small>{publicCopy.record}</small></summary><div className="authority-professional__body"><p>{publicCopy.professionalIntro}</p><section className="card"><p className="eyebrow">{copy.record}</p><h2>{copy.source}</h2><dl><div><dt>{copy.source}</dt><dd>{authoritySources[record.source] ?? record.source}</dd></div>{record.source_identifier && <div><dt>{copy.identifier}</dt><dd>{record.source_identifier}</dd></div>}<div><dt>{copy.rights}</dt><dd>{record.rights_statement}</dd></div></dl>{sourceUrl && <p><a href={sourceUrl} target="_blank" rel="noopener noreferrer">{copy.original} ↗</a></p>}</section><section className="card public-authority-detail__export"><p className="eyebrow">MARC21 / SKOS</p><h2>{copy.export}</h2><p>{copy.exportNote}</p><div className="public-authorities__exports"><a className="button button--secondary" href={`/autoridades/${record.id}/marc.xml`}>{copy.marc}</a><a className="button button--secondary" href={`/autoridades/${record.id}/skos.jsonld`}>{copy.skos}</a></div></section></div></details>
    </aside></div>
    <section className="public-authorities__search-panel" aria-label={copy.search}><h2 className="public-authority-detail__search-title">{detailCopy.more}</h2><AuthorityDiscoverySearch variant="catalog" collapsibleFilters /></section>
  </main></>;
}
