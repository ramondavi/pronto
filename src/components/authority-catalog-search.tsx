"use client";

import { useEffect, useState } from "react";
import { AuthorityDiscoverySearch } from "./authority-discovery-search";
import { AuthorityResultGrid } from "./authority-result-grid";
import Link from "next/link";
import type { PublicAuthority } from "@/lib/public-subject-authority";
import { useInterfaceLanguage } from "./interface-language";

type Options = { query: string; source: string; heading: string; sort: string; variantLanguage: string; relation: string };

export function AuthorityCatalogSearch({ options, initialItems, initialTotal, page, labels }: { options: Options; initialItems: PublicAuthority[]; initialTotal: number; page: number; labels: { found: string; results: string; clear: string; variants: string; open: string; empty: string; emptyHint: string; browse: string; browsePlaces: string; professional: string; export: string; professionalIntro: string; exportResults: string; exportLimit: string; catalogue: string; previous: string; next: string; pending: string; failed: string } }) {
  const { language } = useInterfaceLanguage();
  const [draft, setDraft] = useState(options.query);
  const [live, setLive] = useState<{ items: PublicAuthority[]; total: number; query: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [currentPage, setCurrentPage] = useState(page);
  const [pageData, setPageData] = useState<{ items: PublicAuthority[]; total: number } | null>(null);
  const [pagePending, setPagePending] = useState(false);
  const [pageError, setPageError] = useState(false);
  useEffect(() => {
    if (!options.query && options.source === "all" && options.heading === "all" && options.variantLanguage === "all" && options.relation === "all") return;
    const frame = window.requestAnimationFrame(() => document.getElementById("catalogue-search")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [options.query, options.source, options.heading, options.variantLanguage, options.relation]);

  useEffect(() => {
    if (!draft || draft === options.query) return;
    const timer = window.setTimeout(() => document.getElementById("catalogue-search")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    return () => window.clearTimeout(timer);
  }, [draft, options.query]);

  useEffect(() => {
    if (draft === options.query) { setLive(null); setPending(false); return; }
    const controller = new AbortController();
    setPending(true);
    const timer = window.setTimeout(async () => {
      // The preview searches words broadly. Boolean syntax, truncation and pending filters apply on submit.
      const terms = draft.match(/[^\s"*?]+/g)?.filter((word) => !/^(AND|OR|NOT)$/i.test(word)).slice(0, 8) ?? [];
      const query = terms.join(" OR ");
      try {
        const params = new URLSearchParams({ busca: query, fonte: options.source, tipo: options.heading, ordem: options.sort, idioma: options.variantLanguage, relacao: options.relation });
        const response = await fetch(`/api/autoridades/resultados?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("search_failed");
        const result = await response.json() as { items: PublicAuthority[]; total: number };
        if (!controller.signal.aborted) setLive({ ...result, query });
      } catch { if (!controller.signal.aborted) setLive({ items: [], total: 0, query }); }
      finally { if (!controller.signal.aborted) setPending(false); }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [draft, options.query, options.source, options.heading, options.sort, options.variantLanguage, options.relation]);

  const items = live?.items ?? pageData?.items ?? initialItems;
  const total = live?.total ?? pageData?.total ?? initialTotal;
  const query = live?.query ?? options.query;
  const preview = !!live;
  const hrefForPage = (nextPage: number) => `/autoridades?${new URLSearchParams({ busca: options.query, fonte: options.source, tipo: options.heading, ordem: options.sort, idioma: options.variantLanguage, relacao: options.relation, pagina: String(nextPage) })}`;
  const loadPage = async (nextPage: number) => {
    setPagePending(true); setPageError(false);
    try {
      const response = await fetch(`/api/autoridades/resultados?${new URL(hrefForPage(nextPage), window.location.origin).searchParams}`, { cache: "no-store" });
      if (!response.ok) throw new Error("page_failed");
      const result = await response.json() as { items: PublicAuthority[]; total: number };
      setPageData(result); setCurrentPage(nextPage);
      document.getElementById("authority-results-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch { setPageError(true); }
    finally { setPagePending(false); }
  };
  const countParts = { pt: ["resultados exibidos abaixo de", "encontrados"], en: ["results shown below out of", "found"], es: ["resultados mostrados abajo de", "encontrados"], de: ["von", "gefundenen Ergebnissen angezeigt"], fr: ["résultats affichés ci-dessous sur", "trouvés"], it: ["risultati mostrati qui sotto su", "trovati"] }[language];
  const emptyMessages = { pt: "Ops, esses temas ainda não deram as caras por aqui.", en: "Oops, these themes haven't shown up here yet.", es: "Vaya, estos temas aún no se han dejado ver por aquí.", de: "Hoppla, diese Themen sind hier noch nicht aufgetaucht.", fr: "Oups, ces thèmes ne se sont pas encore montrés ici.", it: "Ops, questi temi non si sono ancora fatti vedere qui." };
  const exportParams = (format: string) => new URLSearchParams({ busca: options.query, fonte: options.source, tipo: options.heading, ordem: options.sort, idioma: options.variantLanguage, relacao: options.relation, formato: format });
  return <>
    <section id="catalogue-search" className="public-authorities__search-panel"><AuthorityDiscoverySearch variant="catalog" initialQuery={options.query} initialSource={options.source} initialHeading={options.heading} initialSort={options.sort} initialLanguage={options.variantLanguage} initialRelation={options.relation} onCatalogQueryChange={setDraft} /></section>
    <section className="public-authorities__results" aria-label={labels.results} aria-busy={pending || pagePending}>
      {(items.length > 0 || pending || pagePending) && <div id="authority-results-title" className="public-authorities__results-heading"><p className="public-authorities__count" role="status">{pending || pagePending ? labels.pending : <><strong>{items.length}</strong> {countParts[0]} <strong>{total}</strong> {countParts[1]}</>}</p></div>}
      {pageError && <p role="alert">{labels.failed}</p>}
      {items.length ? <AuthorityResultGrid key={`${preview}-${query}-${currentPage}`} items={items} page={preview ? 0 : currentPage} query={query} variantsLabel={labels.variants} openLabel={labels.open} /> : <div className="card public-authorities__empty"><span aria-hidden="true" className="public-authorities__empty-mark">⌕</span><strong>{emptyMessages[language]}</strong><p>{labels.emptyHint}</p><div className="public-authorities__empty-links"><Link className="button button--secondary button--small" href="/autoridades/explorar">{labels.browse} ↗</Link><Link className="button button--secondary button--small" href="/autoridades/mapa">{labels.browsePlaces} ↗</Link></div></div>}
      {!preview && total > 0 && <details className="authority-professional"><summary><span>{labels.export}</span></summary><div className="authority-professional__body"><p>{labels.professionalIntro}</p><div className="public-authorities__bulk"><strong>{labels.exportResults}</strong><div><a className="button button--secondary button--small" href={`/autoridades/exportar?${exportParams("skos")}`}>SKOS/JSON-LD</a><a className="button button--secondary button--small" href={`/autoridades/exportar?${exportParams("marc")}`}>MARCXML</a></div><p>{labels.exportLimit}</p></div></div></details>}
      {!preview && total > 20 && <nav aria-label={labels.catalogue} className="public-authorities__pages">{currentPage > 0 && <button type="button" disabled={pagePending} onClick={() => void loadPage(currentPage - 1)}>{labels.previous}</button>}<span>{currentPage + 1} / {Math.ceil(total / 20)}</span>{(currentPage + 1) * 20 < total && <button type="button" disabled={pagePending} onClick={() => void loadPage(currentPage + 1)}>{labels.next}</button>}</nav>}
    </section>
  </>;
}
