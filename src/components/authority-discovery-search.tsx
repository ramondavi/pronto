"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { useInterfaceLanguage } from "./interface-language";
import { authorityDiscoveryCopy } from "@/lib/authority-discovery-copy";
import { authorityDiscoveryExtras } from "@/lib/authority-discovery-extras";
import { authorityPublicCopy } from "@/lib/authority-public-copy";
import { authorityHeadingTypes } from "@/lib/authority-heading-types";
import { publicAuthorityType } from "@/lib/authority-type-public-copy";
import { authorityLanguageName } from "@/lib/authority-language-names";
import { AuthoritySearchHelp } from "./authority-search-help";
import { CatalogueSelect } from "./catalogue-select";
import { clearVisitorSearches, readVisitorSearches, rememberVisitorSearch, type VisitorSearch, type VisitorSearchFilters } from "@/lib/authority-visitor-search";

type Suggestion = { id: string; label: string; label_en: string | null; source: string; heading_type: string | null };
type SearchResponse = { results: Suggestion[]; related: Suggestion[]; correction: Suggestion | null };
type Props = { variant: "home" | "catalog"; collapsibleFilters?: boolean; initialQuery?: string; initialSource?: string; initialHeading?: string; initialSort?: string; initialLanguage?: string; initialRelation?: string; onCatalogQueryChange?: (query: string) => void; onClearFilters?: (query: string) => void };
const sourceNames: Record<string, string> = { pronto: "Pronto!", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", bn: "Biblioteca Nacional", loc: "Library of Congress", aat: "Getty AAT" };
const examples = ["habitação", "patrimônio"];
const placeExamples = ["Salvador (BA) - Liberdade", "Salvador (BA) - Dique do Tororó"];
const catalogSubmit = { pt: "Buscar tema", en: "Search themes", es: "Buscar temas", de: "Themen suchen", fr: "Rechercher", it: "Cerca temi" } as const;
const typingTerms = {
  pt: ["habitação social", "patrimônio cultural", "Salvador", "paisagem urbana", "Brasília", "-12.9711, -38.5108"],
  en: ["social housing", "cultural heritage", "Salvador", "urban landscape", "Brasília", "-12.9711, -38.5108"],
  es: ["vivienda social", "patrimonio cultural", "Salvador", "paisaje urbano", "Brasília", "-12.9711, -38.5108"],
  de: ["sozialer Wohnungsbau", "Kulturerbe", "Salvador", "Stadtlandschaft", "Brasília", "-12.9711, -38.5108"],
  fr: ["logement social", "patrimoine culturel", "Salvador", "paysage urbain", "Brasília", "-12.9711, -38.5108"],
  it: ["edilizia sociale", "patrimonio culturale", "Salvador", "paesaggio urbano", "Brasília", "-12.9711, -38.5108"],
} as const;

export function AuthorityDiscoverySearch({ variant, collapsibleFilters = false, initialQuery = "", initialSource = "all", initialHeading = "all", initialSort = "relevance", initialLanguage = "all", initialRelation = "all", onCatalogQueryChange, onClearFilters }: Props) {
  const { language } = useInterfaceLanguage();
  const router = useRouter();
  const t = authorityDiscoveryCopy[language];
  const extra = authorityDiscoveryExtras[language];
  const publicCopy = authorityPublicCopy[language];
  const [query, setQuery] = useState(initialQuery);
  const [source, setSource] = useState(initialSource);
  const [heading, setHeading] = useState(initialHeading);
  const [sort, setSort] = useState(initialSort);
  const [variantLanguage, setVariantLanguage] = useState(initialLanguage);
  const [relation, setRelation] = useState(initialRelation);
  const [filtersOpen, setFiltersOpen] = useState(!collapsibleFilters);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [resolved, setResolved] = useState("");
  const [failed, setFailed] = useState(false);
  const [related, setRelated] = useState<Suggestion[]>([]);
  const [correction, setCorrection] = useState<Suggestion | null>(null);
  const [history, setHistory] = useState<VisitorSearch[]>([]);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState<string>(t.placeholder);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => { setHistory(readVisitorSearches()); }, []);
  useEffect(() => {
    if (variant !== "home" || !open) return;
    const updateRoom = () => {
      const control = wrapperRef.current?.querySelector(".authority-discovery-search__control");
      if (!control) return;
      const room = Math.max(0, window.innerHeight - control.getBoundingClientRect().bottom - 24);
      wrapperRef.current?.style.setProperty("--authority-suggestion-room", `${room}px`);
    };
    updateRoom();
    window.addEventListener("resize", updateRoom);
    window.addEventListener("scroll", updateRoom, { passive: true });
    return () => { window.removeEventListener("resize", updateRoom); window.removeEventListener("scroll", updateRoom); };
  }, [variant, open, query]);
  useEffect(() => {
    if (variant !== "home") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) { setAnimatedPlaceholder(t.placeholder); return; }
    let term = 0;
    let position = 0;
    let deleting = false;
    let timer = 0;
    const tick = () => {
      if (reduced.matches) { setAnimatedPlaceholder(t.placeholder); timer = window.setTimeout(tick, 500); return; }
      if (document.visibilityState === "hidden") { timer = window.setTimeout(tick, 500); return; }
      const word = typingTerms[language][term];
      setAnimatedPlaceholder(`${word.slice(0, position)}▍`);
      if (!deleting && position === word.length) { deleting = true; timer = window.setTimeout(tick, 1400); return; }
      if (deleting && position === 0) { deleting = false; term = (term + 1) % typingTerms[language].length; timer = window.setTimeout(tick, 420); return; }
      position += deleting ? -1 : 1;
      timer = window.setTimeout(tick, deleting ? 45 : 88);
    };
    timer = window.setTimeout(tick, 350);
    return () => window.clearTimeout(timer);
  }, [language, t.placeholder, variant]);
  const currentFilters: VisitorSearchFilters = { source, heading, sort, language: variantLanguage, relation };
  const remember = (value: string) => setHistory(rememberVisitorSearch(value, variant === "catalog" ? currentFilters : undefined));
  const choose = (value: string) => { setQuery(value); setOpen(true); inputRef.current?.focus(); };
  const recent = [...history].sort((a, b) => b.lastUsed - a.lastUsed).slice(0, variant === "home" ? 5 : 20);
  const historyUrl = (item: VisitorSearch) => `/autoridades?${new URLSearchParams({ busca: item.query, fonte: item.filters?.source ?? "all", tipo: item.filters?.heading ?? "all", ordem: item.filters?.sort ?? "relevance", idioma: item.filters?.language ?? "all", relacao: item.filters?.relation ?? "all" })}`;
  const filterSummary = (item: VisitorSearch) => {
    const filters = item.filters;
    if (!filters) return [];
    const sortLabel = ({ az: t.az, za: t.za, recent: t.recent, source: t.sourceSort } as Record<string, string>)[filters.sort];
    const relationLabel = ({ broader: extra.broader, narrower: extra.narrower, related: extra.associated } as Record<string, string>)[filters.relation];
    return [filters.source !== "all" ? sourceNames[filters.source] ?? filters.source : "", filters.heading !== "all" ? publicAuthorityType(language, filters.heading) : "", filters.language !== "all" ? authorityLanguageName(language, filters.language as "pt" | "en" | "es" | "de" | "fr" | "it") : "", filters.relation !== "all" ? relationLabel ?? filters.relation : "", filters.sort !== "relevance" ? sortLabel ?? filters.sort : ""].filter(Boolean);
  };
  const changeFilter = (name: keyof VisitorSearchFilters, value: string) => {
    const next = { ...currentFilters, [name]: value };
    const params = new URLSearchParams({ busca: query, fonte: next.source, tipo: next.heading, ordem: next.sort, idioma: next.language, relacao: next.relation });
    router.replace(`/autoridades?${params}`, { scroll: false });
  };
  const clearFilters = () => {
    setSource("all"); setHeading("all"); setSort("relevance"); setVariantLanguage("all"); setRelation("all");
    if (onClearFilters) onClearFilters(query);
    else router.push(`/autoridades?${new URLSearchParams({ busca: query })}`, { scroll: false });
  };

  useEffect(() => {
    if (variant !== "home" || !open || query.trim().length < 2) { setSuggestions([]); setRelated([]); setCorrection(null); setResolved(""); return; }
    const controller = new AbortController();
    const term = query.trim();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: term, fonte: source, tipo: heading, ordem: sort, idioma: variantLanguage, relacao: relation });
        const response = await fetch(`/api/autoridades?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("authority_search_failed");
        const result = await response.json() as SearchResponse;
        setSuggestions(result.results);
        setRelated(result.related);
        setCorrection(result.correction);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setResolved(term);
      }
    }, term ? 180 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, source, heading, sort, variantLanguage, relation, variant]);

  return <div className={`authority-discovery-search authority-discovery-search--${variant}`} ref={wrapperRef}
    onBlur={(event) => { if (!wrapperRef.current?.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); inputRef.current?.focus(); } }}>
    <form action="/autoridades" method="get" role="search" onSubmit={() => remember(query)}>
      <label htmlFor={`authority-query-${id}`}>{t.label}</label>
      <div className="authority-discovery-search__input-wrap"><div className="authority-discovery-search__control"><AppIcon name="search" aria-hidden="true" /><input ref={inputRef} id={`authority-query-${id}`} name="busca" type="search" value={query} onChange={(event) => { setQuery(event.target.value); onCatalogQueryChange?.(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); wrapperRef.current?.querySelector<HTMLAnchorElement>(".authority-discovery-search__suggestions a")?.focus(); } }} placeholder={variant === "home" ? animatedPlaceholder : t.placeholder} maxLength={200} autoComplete="off" aria-autocomplete={variant === "home" ? "list" : "none"} aria-controls={variant === "home" && open && query.trim().length >= 2 ? `authority-suggestions-${id}` : undefined} />{variant === "catalog" && <button className="button button--primary" type="submit"><AppIcon name="arrowRight" />{catalogSubmit[language]}</button>}</div>
      {variant === "home" && open && query.trim().length >= 2 && <div id={`authority-suggestions-${id}`} className="authority-discovery-search__suggestions" role="region" aria-live="polite" aria-label={t.suggestions}>{resolved !== query.trim() ? <p className="authority-discovery-search__pending">{t.pending}</p> : failed ? <p>{t.failed}</p> : suggestions.length ? <><small>{t.suggestions}</small><ul>{suggestions.map((item) => <li key={item.id}><Link href={`/autoridades/${item.id}`} onClick={() => remember(query || item.label)}><span className="authority-suggestion-badges"><b>{sourceNames[item.source] ?? item.source}</b>{item.heading_type && <b>{publicAuthorityType(language, item.heading_type)}</b>}</span><strong>{item.label}</strong>{item.label_en && <em>{item.label_en}</em>}</Link></li>)}</ul>{!!related.length && <div className="authority-discovery-search__suggestion-group"><small>{extra.related}</small>{related.map(item => <Link key={item.id} href={`/autoridades/${item.id}`} onClick={() => remember(item.label)}>{item.label}</Link>)}</div>}</> : <><p>{query.trim() ? t.noSuggestions : null}</p>{correction && <div className="authority-discovery-search__suggestion-group"><small>{extra.correction}</small><Link href={`/autoridades/${correction.id}`} onClick={() => remember(correction.label)}>{correction.label}</Link></div>}{!!related.length && <div className="authority-discovery-search__suggestion-group"><small>{extra.related}</small>{related.map(item => <Link key={item.id} href={`/autoridades/${item.id}`} onClick={() => remember(item.label)}>{item.label}</Link>)}</div>}</>}</div>}</div>
      {variant === "catalog" && !!recent.length && <div className="authority-discovery-search__catalog-history"><span className="authority-discovery-search__recent-label">{extra.recent}</span><div className="authority-discovery-search__catalog-history-list">{recent.map((item) => <Link key={`${item.query}-${JSON.stringify(item.filters)}`} href={historyUrl(item)}><span>{item.query || filterSummary(item).join(" · ")}</span>{!!item.query && filterSummary(item).length > 0 && <small>{filterSummary(item).join(" · ")}</small>}</Link>)}</div><button className="authority-discovery-search__clear-icon authority-discovery-search__clear-history" type="button" title={extra.clearHistory} aria-label={extra.clearHistory} onClick={() => { clearVisitorSearches(); setHistory([]); }}><AppIcon name="trash" /></button></div>}
      {variant === "catalog" && <section className="authority-discovery-search__advanced" aria-label={publicCopy.advanced}><h2 className="authority-discovery-search__advanced-title">{collapsibleFilters ? <button type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(value => !value)}><AppIcon name="settings" aria-hidden="true" /><span>{publicCopy.advanced}</span><AppIcon className="authority-discovery-search__chevron" name="chevronDown" aria-hidden="true" /></button> : <><AppIcon name="settings" aria-hidden="true" />{publicCopy.advanced}</>}</h2><div className="authority-discovery-search__filters" key={language} hidden={collapsibleFilters && !filtersOpen}><label>{t.source}<CatalogueSelect name="fonte" value={source} onChange={(event) => { setSource(event.target.value); changeFilter("source", event.target.value); }}><option value="all">{t.allSources}</option>{Object.entries(sourceNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</CatalogueSelect></label><label>{t.type}<CatalogueSelect name="tipo" value={heading} onChange={(event) => { setHeading(event.target.value); changeFilter("heading", event.target.value); }}><option value="all">{t.allTypes}</option>{authorityHeadingTypes.map((item) => <option key={item.tag} value={item.kind}>{publicAuthorityType(language, item.kind)}</option>)}</CatalogueSelect></label><label>{extra.language}<CatalogueSelect name="idioma" value={variantLanguage} onChange={(event) => { setVariantLanguage(event.target.value); changeFilter("language", event.target.value); }}><option value="all">{extra.allLanguages}</option>{(["pt","en","es","de","fr","it"] as const).map(value => <option key={value} value={value}>{authorityLanguageName(language, value)}</option>)}</CatalogueSelect></label><label>{extra.relation}<CatalogueSelect name="relacao" value={relation} onChange={(event) => { setRelation(event.target.value); changeFilter("relation", event.target.value); }}><option value="all">{extra.allRelations}</option><option value="broader">{extra.broader}</option><option value="narrower">{extra.narrower}</option><option value="related">{extra.associated}</option></CatalogueSelect></label><label>{t.sort}<CatalogueSelect name="ordem" value={sort} onChange={(event) => { setSort(event.target.value); changeFilter("sort", event.target.value); }}><option value="relevance">{t.relevance}</option><option value="az">{t.az}</option><option value="za">{t.za}</option><option value="recent">{t.recent}</option><option value="source">{t.sourceSort}</option></CatalogueSelect></label><button className="authority-discovery-search__clear-icon authority-discovery-search__clear-filters" type="button" title={t.clear} aria-label={t.clear} onClick={clearFilters}><AppIcon name="refresh" /></button></div></section>}
    </form>
    {variant === "catalog" && <AuthoritySearchHelp />}
    {variant === "home" && <div className="authority-discovery-search__extras"><div className="authority-discovery-search__extras-inner"><div className="authority-discovery-search__examples"><span>{t.examples}</span>{[...examples, ...placeExamples].map((example) => <button key={example} type="button" onClick={() => choose(example)}>{example}</button>)}</div>{!!recent.length && <div className="authority-discovery-search__recent"><span className="authority-discovery-search__recent-label">{extra.recent}</span><div className="authority-discovery-search__recent-list">{recent.map(item => <button key={item.query} type="button" onClick={() => choose(item.query)}>{item.query}</button>)}<button className="authority-discovery-search__recent-clear authority-discovery-search__clear-icon" type="button" title={extra.clearHistory} aria-label={extra.clearHistory} onClick={() => { clearVisitorSearches(); setHistory([]); }}><AppIcon name="trash" /></button></div></div>}</div></div>}
  </div>;
}
