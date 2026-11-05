"use client";

import { useEffect, useRef, useState } from "react";
import { AuthorityDiscoverySearch } from "./authority-discovery-search";
import { AuthorityResultGrid } from "./authority-result-grid";
import Link from "next/link";
import type { PublicAuthority } from "@/lib/public-subject-authority";
import { useInterfaceLanguage } from "./interface-language";
import { AppIcon } from "./app-icon";

type Options = { query: string; source: string; heading: string; sort: string; variantLanguage: string; relation: string };

export function AuthorityCatalogSearch({ options, initialItems, initialTotal, page, labels }: { options: Options; initialItems: PublicAuthority[]; initialTotal: number; page: number; labels: { found: string; results: string; clear: string; variants: string; open: string; empty: string; emptyHint: string; browse: string; browsePlaces: string; professional: string; export: string; professionalIntro: string; exportResults: string; exportLimit: string; catalogue: string; previous: string; next: string; pending: string; failed: string } }) {
  const { language } = useInterfaceLanguage();
  const [draft, setDraft] = useState(options.query);
  const [live, setLive] = useState<{ items: PublicAuthority[]; total: number; query: string; isPreview?: boolean } | null>(null);
  const [activeOptions, setActiveOptions] = useState(options);
  const [appliedQuery, setAppliedQuery] = useState(options.query);
  const [pending, setPending] = useState(false);
  const [currentPage, setCurrentPage] = useState(page);
  const [pageData, setPageData] = useState<{ items: PublicAuthority[]; total: number } | null>(null);
  const [pagePending, setPagePending] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllFound, setSelectAllFound] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [view, setView] = useState<"cards" | "list">("cards");
  const requestVersion = useRef(0);
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
    const version = ++requestVersion.current;
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
        if (!controller.signal.aborted && version === requestVersion.current) { setLive({ ...result, query, isPreview: true }); setSelectedIds([]); setSelectAllFound(false); }
      } catch { if (!controller.signal.aborted && version === requestVersion.current) setLive({ items: [], total: 0, query, isPreview: true }); }
      finally { if (!controller.signal.aborted && version === requestVersion.current) setPending(false); }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [draft, options.query, options.source, options.heading, options.sort, options.variantLanguage, options.relation]);

  const items = live?.items ?? pageData?.items ?? initialItems;
  const total = live?.total ?? pageData?.total ?? initialTotal;
  const query = live?.query ?? appliedQuery;
  const preview = !!live?.isPreview;
  const hrefForPage = (nextPage: number) => `/autoridades?${new URLSearchParams({ busca: appliedQuery, fonte: activeOptions.source, tipo: activeOptions.heading, ordem: activeOptions.sort, idioma: activeOptions.variantLanguage, relacao: activeOptions.relation, pagina: String(nextPage) })}`;
  const loadPage = async (nextPage: number) => {
    setPagePending(true); setPageError(false);
    try {
      const response = await fetch(`/api/autoridades/resultados?${new URL(hrefForPage(nextPage), window.location.origin).searchParams}`, { cache: "no-store" });
      if (!response.ok) throw new Error("page_failed");
      const result = await response.json() as { items: PublicAuthority[]; total: number };
      setLive(null); setPageData(result); setCurrentPage(nextPage);
      document.getElementById("authority-results-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch { setPageError(true); }
    finally { setPagePending(false); }
  };
  const countParts = { pt: ["Exibindo", "de", "resultados"], en: ["Showing", "of", "results"], es: ["Mostrando", "de", "resultados"], de: ["Angezeigt", "von", "Ergebnissen"], fr: ["Affichage de", "sur", "résultats"], it: ["Visualizzati", "di", "risultati"] }[language];
  const emptyMessages = { pt: "Ops, esses temas ainda não deram as caras por aqui.", en: "Oops, these themes haven't shown up here yet.", es: "Vaya, estos temas aún no se han dejado ver por aquí.", de: "Hoppla, diese Themen sind hier noch nicht aufgetaucht.", fr: "Oups, ces thèmes ne se sont pas encore montrés ici.", it: "Ops, questi temi non si sono ancora fatti vedere qui." };
  const exportParams = (format: string) => new URLSearchParams({ busca: appliedQuery, fonte: activeOptions.source, tipo: activeOptions.heading, ordem: activeOptions.sort, idioma: activeOptions.variantLanguage, relacao: activeOptions.relation, formato: format });
  const clearFilters = async (search: string) => {
    requestVersion.current++;
    const reset = { ...options, source: "all", heading: "all", sort: "relevance", variantLanguage: "all", relation: "all" };
    setActiveOptions(reset); setAppliedQuery(search); setPagePending(true); setPageError(false); setCurrentPage(0); setPageData(null); setSelectedIds([]); setSelectAllFound(false);
    try {
      const params = new URLSearchParams({ busca: search, fonte: "all", tipo: "all", ordem: "relevance", idioma: "all", relacao: "all" });
      const response = await fetch(`/api/autoridades/resultados?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("search_failed");
      const result = await response.json() as { items: PublicAuthority[]; total: number };
      setLive({ ...result, query: search });
    } catch { setPageError(true); }
    finally {
      setPagePending(false);
      window.requestAnimationFrame(() => {
        const searchPanel = document.getElementById("catalogue-search");
        const results = document.querySelector<HTMLElement>(".public-authorities__results");
        if (!searchPanel || !results) return;
        const searchBox = searchPanel.getBoundingClientRect();
        const resultsBox = results.getBoundingClientRect();
        const visibleContent = resultsBox.top - searchBox.top + Math.min(resultsBox.height, 110);
        const margin = Math.max(16, (window.innerHeight - visibleContent) / 2);
        window.scrollTo({ top: Math.max(0, window.scrollY + searchBox.top - margin), behavior: "smooth" });
      });
    }
  };
  const selectedCount = selectAllFound ? total : selectedIds.length;
  const exportUrl = (format: string) => {
    const params = exportParams(format);
    if (!selectAllFound) selectedIds.forEach((id) => params.append("id", id));
    return `/autoridades/exportar?${params}`;
  };
  const selectionCopy = { pt: ["Selecionar todos da página", "Selecionar todos os registros encontrados", "Cancelar seleção", "Copiar MARC21", "MARC21 copiado", "Não foi possível copiar"], en: ["Select all on this page", "Select all records found", "Cancel selection", "Copy MARC21", "MARC21 copied", "Could not copy"], es: ["Seleccionar todos de esta página", "Seleccionar todos los registros encontrados", "Cancelar selección", "Copiar MARC21", "MARC21 copiado", "No se pudo copiar"], de: ["Alle auf dieser Seite auswählen", "Alle gefundenen Datensätze auswählen", "Auswahl aufheben", "MARC21 kopieren", "MARC21 kopiert", "Kopieren fehlgeschlagen"], fr: ["Tout sélectionner sur cette page", "Sélectionner toutes les notices trouvées", "Annuler la sélection", "Copier MARC21", "MARC21 copié", "Copie impossible"], it: ["Seleziona tutti in questa pagina", "Seleziona tutti i record trovati", "Annulla selezione", "Copia MARC21", "MARC21 copiato", "Impossibile copiare"] }[language];
  const viewCopy = { pt: ["Visualizar em cartões", "Visualizar em lista"], en: ["Card view", "List view"], es: ["Ver tarjetas", "Ver lista"], de: ["Kartenansicht", "Listenansicht"], fr: ["Vue en cartes", "Vue en liste"], it: ["Vista a schede", "Vista elenco"] }[language];
  const formatCopy = { pt: ["Escolha o formato para os registros selecionados.", "Dados estruturados para outros catálogos e sistemas.", "Registro de autoridade em formato MARC21 XML.", "Copia o registro MARC21 em texto para a área de transferência."], en: ["Choose a format for the selected records.", "Structured data for other catalogues and systems.", "Authority records in MARC21 XML format.", "Copy the MARC21 record as text to the clipboard."], es: ["Elija un formato para los registros seleccionados.", "Datos estructurados para otros catálogos y sistemas.", "Registros de autoridad en formato MARC21 XML.", "Copie el registro MARC21 como texto."], de: ["Format für die ausgewählten Datensätze wählen.", "Strukturierte Daten für andere Kataloge und Systeme.", "Normdatensätze im MARC21-XML-Format.", "MARC21-Datensatz als Text kopieren."], fr: ["Choisissez un format pour les notices sélectionnées.", "Données structurées pour d’autres catalogues et systèmes.", "Notices d’autorité au format MARC21 XML.", "Copier la notice MARC21 en texte."], it: ["Scegli un formato per i record selezionati.", "Dati strutturati per altri cataloghi e sistemi.", "Record di autorità in formato MARC21 XML.", "Copia il record MARC21 come testo."] }[language];
  const copyMarc21 = async () => {
    if (selectedIds.length !== 1 || selectAllFound) return;
    try {
      const response = await fetch(`/autoridades/${selectedIds[0]}/marc.xml`);
      if (!response.ok) throw new Error("marc_unavailable");
      const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
      if (xml.getElementsByTagName("parsererror").length) throw new Error("marc_invalid");
      const lines = [`=LDR  ${xml.getElementsByTagNameNS("*", "leader")[0]?.textContent ?? ""}`];
      for (const field of Array.from(xml.getElementsByTagNameNS("*", "controlfield"))) lines.push(`=${field.getAttribute("tag")}  ${field.textContent ?? ""}`);
      for (const field of Array.from(xml.getElementsByTagNameNS("*", "datafield"))) {
        const values = Array.from(field.getElementsByTagNameNS("*", "subfield")).map((subfield) => `$${subfield.getAttribute("code")}${subfield.textContent ?? ""}`).join("");
        lines.push(`=${field.getAttribute("tag")}  ${field.getAttribute("ind1") || " "}${field.getAttribute("ind2") || " "}${values}`);
      }
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyStatus(selectionCopy[4]);
    } catch { setCopyStatus(selectionCopy[5]); }
  };
  return <>
    <section id="catalogue-search" className="public-authorities__search-panel"><AuthorityDiscoverySearch variant="catalog" initialQuery={options.query} initialSource={options.source} initialHeading={options.heading} initialSort={options.sort} initialLanguage={options.variantLanguage} initialRelation={options.relation} onCatalogQueryChange={setDraft} onClearFilters={(search) => void clearFilters(search)} /></section>
    <section className="public-authorities__results" aria-label={labels.results} aria-busy={pending || pagePending}>
      {(items.length > 0 || pending || pagePending) && <div id="authority-results-title" className="public-authorities__results-heading">
        {selectedCount > 0 && <div className="public-authorities__selection-actions"><button type="button" onClick={() => { setSelectedIds(items.map((item) => item.id)); setSelectAllFound(false); }}><AppIcon name="selectPage" />{selectionCopy[0]}</button><button type="button" disabled={preview || total > 500} title={total > 500 ? labels.exportLimit : undefined} onClick={() => { setSelectAllFound(true); setSelectedIds([]); }}><AppIcon name="selectAll" />{selectionCopy[1]}</button><button type="button" onClick={() => { setSelectedIds([]); setSelectAllFound(false); }}><AppIcon name="cancelSelection" />{selectionCopy[2]}</button><details className="public-authorities__export-menu"><summary><AppIcon name="download" />{labels.export} <strong>{selectedCount}</strong><AppIcon name="chevronDown" /></summary><div className="public-authorities__export-options"><div className="public-authorities__export-heading"><strong>{labels.export}</strong><p>{formatCopy[0]}</p></div><div className="public-authorities__export-files"><a href={exportUrl("skos")}><AppIcon name="globe" /><span><strong>SKOS/JSON-LD</strong><small>{formatCopy[1]}</small></span></a><a href={exportUrl("marc")}><AppIcon name="document" /><span><strong>MARCXML</strong><small>{formatCopy[2]}</small></span></a>{selectedCount === 1 && !selectAllFound && <button type="button" onClick={() => void copyMarc21()}><AppIcon name="copy" /><span><strong>{selectionCopy[3]}</strong><small>{formatCopy[3]}</small></span></button>}</div>{copyStatus && <p role="status">{copyStatus}</p>}</div></details></div>}
        <div className="public-authorities__results-tools"><div className="public-authorities__view-toggle" role="group" aria-label={labels.results}><button type="button" aria-label={viewCopy[0]} title={viewCopy[0]} aria-pressed={view === "cards"} onClick={() => setView("cards")}><AppIcon name="grid" /></button><button type="button" aria-label={viewCopy[1]} title={viewCopy[1]} aria-pressed={view === "list"} onClick={() => setView("list")}><AppIcon name="queue" /></button></div><p className="public-authorities__count" role="status">{pending || pagePending ? labels.pending : <>{countParts[0]} <strong>{items.length}</strong> {countParts[1]} <strong>{total}</strong> {countParts[2]}</>}</p></div>
      </div>}
      {pageError && <p role="alert">{labels.failed}</p>}
      {items.length ? <AuthorityResultGrid key={`${preview}-${query}-${currentPage}`} items={items} page={preview ? 0 : currentPage} query={query} variantsLabel={labels.variants} openLabel={labels.open} selectedIds={selectedIds} allSelected={selectAllFound} view={view} onToggle={(id) => { if (selectAllFound) { setSelectedIds(items.map((item) => item.id).filter((value) => value !== id)); setSelectAllFound(false); } else { setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); } setCopyStatus(""); }} /> : <div className="card public-authorities__empty"><span aria-hidden="true" className="public-authorities__empty-mark">⌕</span><strong>{emptyMessages[language]}</strong><p>{labels.emptyHint}</p><div className="public-authorities__empty-links"><Link className="button button--secondary button--small" href="/autoridades/explorar">{labels.browse} ↗</Link><Link className="button button--secondary button--small" href="/autoridades/mapa">{labels.browsePlaces} ↗</Link></div></div>}
      {!preview && total > 20 && <nav aria-label={labels.catalogue} className="public-authorities__pages">{currentPage > 0 && <button type="button" disabled={pagePending} onClick={() => void loadPage(currentPage - 1)}>{labels.previous}</button>}<span>{currentPage + 1} / {Math.ceil(total / 20)}</span>{(currentPage + 1) * 20 < total && <button type="button" disabled={pagePending} onClick={() => void loadPage(currentPage + 1)}>{labels.next}</button>}</nav>}
    </section>
  </>;
}
