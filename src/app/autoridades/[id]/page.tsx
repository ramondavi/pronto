import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AuthorityValueNote } from "@/components/authority-value-note";
import { AuthorityDiscoverySearch } from "@/components/authority-discovery-search";
import { authorityAsMarcText, authoritySources, confirmedPublicAuthorityRelation, getPublicAuthority, searchPublicAuthorities } from "@/lib/public-subject-authority";
import { publicAuthorityCopy } from "@/lib/public-authority-copy";
import { authorityPublicCopy } from "@/lib/authority-public-copy";
import { foldAuthorityText } from "@/lib/authority-fuzzy";
import { getInterfaceLanguage } from "@/lib/server-language";
import { getPublicAuthorityMapPoints } from "@/lib/authority-map";
import { authorityDetailCopy } from "@/lib/authority-detail-copy";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { publicAuthorityType } from "@/lib/authority-type-public-copy";
import { authorityGuidedCopy } from "@/lib/authority-guided-copy";
import { AuthorityDetailView } from "@/components/authority-detail-view";

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
  const publicCopy = authorityPublicCopy[language];
  const detailCopy = authorityDetailCopy[language];
  const guided = authorityGuidedCopy[language];
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
  const introNoteIndex = record.notes.findIndex((note) => note.value?.trim());
  const introNote = introNoteIndex >= 0 ? record.notes[introNoteIndex].value : null;
  const detailNotes = record.notes.filter((_, index) => index !== introNoteIndex);
  return <><SiteHeader authorityTitle={record.label} /><main className="container public-authorities public-authority-detail">
    <AuthorityDetailView hero={<header className="public-authority-detail__hero"><div className="public-authority-detail__identity"><div className="public-authority-detail__identity-top"><span className="public-authority-detail__type">{publicAuthorityType(language, record.heading_type)}</span></div><div className="public-authority-detail__main"><p className="public-authority-detail__preferred">{detailCopy.preferred}</p><h1 style={{ fontSize: `clamp(1.1rem, ${Math.min(4.4, 100 / Math.max(record.label.length, 15))}vw, 4.4rem)` }}>{record.label}</h1><div className="public-authority-detail__summary"><div className="public-authority-detail__summary-copy">{introNote && <p className="public-authority-detail__intro">{introNote}</p>}{record.label_en && <section className="public-authority-detail__equivalents" aria-label={detailCopy.equivalent}><h2>{detailCopy.equivalent}</h2><dl><div><dt>{detailCopy.english} <span lang="en">(EN)</span></dt><dd lang="en">{record.label_en}</dd></div></dl></section>}</div>{mapPoint && <Link className="button button--secondary button--small public-authority-detail__map-link" href={`/autoridades/mapa?autoridade=${encodeURIComponent(record.id)}`}>{detailCopy.map} ↗</Link>}</div></div></div><span aria-hidden="true" className="public-authority-detail__mark"><AppIcon name={icon} /></span></header>}
      professionalTitle={publicCopy.professional} professionalSubtitle={publicCopy.record} copy={guided} marcText={authorityAsMarcText(record)}
      professionalContent={<>
        <section className="authority-professional__group"><div className="authority-professional__group-heading"><AppIcon name="shield" /><div><h2>{guided.sourceGroup}</h2><p>{guided.sourceHelp}</p></div></div><dl><div><dt>{copy.source}</dt><dd>{authoritySources[record.source] ?? record.source}</dd></div>{record.source_identifier && <div><dt>{copy.identifier}</dt><dd>{record.source_identifier}</dd></div>}<div><dt>{copy.rights}</dt><dd>{record.rights_statement}</dd></div></dl>{sourceUrl && <a className="authority-professional__original" href={sourceUrl} target="_blank" rel="noopener noreferrer">{copy.original}<AppIcon name="external" /></a>}</section>
        <section className="authority-professional__group"><div className="authority-professional__group-heading"><AppIcon name="download" /><div><h2>{guided.downloads}</h2><p>{guided.downloadsHelp}</p></div></div><div className="authority-professional__formats"><a href={`/autoridades/${record.id}/marc.xml`}><AppIcon name="document" /><span><strong>MARCXML</strong><small>{guided.marcHelp}</small></span><AppIcon name="download" /></a><a href={`/autoridades/${record.id}/marc.mrc`}><AppIcon name="document" /><span><strong>ISO 2709 (.mrc)</strong><small>{guided.isoHelp}</small></span><AppIcon name="download" /></a><a href={`/autoridades/${record.id}/skos.jsonld`}><AppIcon name="globe" /><span><strong>SKOS/JSON-LD</strong><small>{guided.skosHelp}</small></span><AppIcon name="download" /></a></div></section>
      </>}
    >
      {!!record.components.length && <section className="card authority-guide"><div className="authority-guide__heading"><span className="authority-guide__icon"><AppIcon name="hierarchy" /></span><div><h2>{publicCopy.heading}</h2><p>{guided.composition}</p></div></div><ol className="public-authority-detail__components">{record.components.map((part, index) => <li key={index}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{part.kind}</strong><p>{part.value}</p></div></li>)}</ol></section>}
      {!!record.variants.length && <section className="card authority-guide"><div className="authority-guide__heading"><span className="authority-guide__icon"><AppIcon name="search" /></span><div><h2>{publicCopy.variants}</h2><p>{guided.variants}</p></div></div><ul className="public-authority-detail__tags">{record.variants.map((part, index) => <li key={index}>{part.value}</li>)}</ul></section>}
      {!!relationLinks.length && <section className="card authority-guide"><div className="authority-guide__heading"><span className="authority-guide__icon"><AppIcon name="link" /></span><div><h2>{publicCopy.relations}</h2><p>{guided.relations}</p></div></div><ul className="public-authority-detail__relations">{relationLinks.map((part, index) => <li key={index}><span>{part.kind || publicCopy.relations}</span>{part.published ? <Link href={`/autoridades/${part.published.id}`}>{part.value}<AppIcon name="arrowRight" /></Link> : <strong>{part.value}</strong>}</li>)}</ul></section>}
      {!!detailNotes.length && <section className="card authority-guide"><div className="authority-guide__heading"><span className="authority-guide__icon"><AppIcon name="document" /></span><div><h2>{publicCopy.notes}</h2><p>{guided.notes}</p></div></div><div className="authority-guide__notes">{detailNotes.map((part, index) => <p key={index}>{part.value}</p>)}</div></section>}
    </AuthorityDetailView>
    <section className="public-authorities__search-panel" aria-label={copy.search}><h2 className="public-authority-detail__search-title">{detailCopy.more}</h2><AuthorityDiscoverySearch variant="catalog" collapsibleFilters /></section>
    <AuthorityValueNote language={language} />
  </main></>;
}
