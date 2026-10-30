"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { useInterfaceLanguage } from "./interface-language";
import { authorityDiscoveryCopy } from "@/lib/authority-discovery-copy";
import { authorityDiscoveryExtras } from "@/lib/authority-discovery-extras";
import { authorityPublicCopy } from "@/lib/authority-public-copy";
import { clearVisitorSearches, readVisitorSearches, rememberVisitorSearch, type VisitorSearch } from "@/lib/authority-visitor-search";

type Suggestion = { id: string; label: string; label_en: string | null; source: string };
type SearchResponse = { results: Suggestion[]; related: Suggestion[]; correction: Suggestion | null };
type Props = { variant: "home" | "catalog"; initialQuery?: string; initialSource?: string; initialHeading?: string; initialSort?: string; initialLanguage?: string; initialRelation?: string };
const sourceNames: Record<string, string> = { bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", loc: "Library of Congress", pronto: "Pronto!" };
const headingNames: Record<string, string> = { topic: "Temático", geographic: "Geográfico", personal: "Pessoa", corporate: "Entidade", title: "Título" };
const examples = ["habitação", "patrimônio", "paisagem", "urbanismo"];
const typingTerms = {
  pt: ["habitação social", "patrimônio cultural", "paisagem urbana", "urbanismo"],
  en: ["social housing", "cultural heritage", "urban landscape", "urban planning"],
  es: ["vivienda social", "patrimonio cultural", "paisaje urbano", "urbanismo"],
  de: ["sozialer Wohnungsbau", "Kulturerbe", "Stadtlandschaft", "Stadtplanung"],
  fr: ["logement social", "patrimoine culturel", "paysage urbain", "urbanisme"],
  it: ["edilizia sociale", "patrimonio culturale", "paesaggio urbano", "urbanistica"],
} as const;

export function AuthorityDiscoverySearch({ variant, initialQuery = "", initialSource = "all", initialHeading = "all", initialSort = "relevance", initialLanguage = "all", initialRelation = "all" }: Props) {
  const { language } = useInterfaceLanguage();
  const t = authorityDiscoveryCopy[language];
  const extra = authorityDiscoveryExtras[language];
  const publicCopy = authorityPublicCopy[language];
  const [query, setQuery] = useState(initialQuery);
  const [source, setSource] = useState(initialSource);
  const [heading, setHeading] = useState(initialHeading);
  const [sort, setSort] = useState(initialSort);
  const [variantLanguage, setVariantLanguage] = useState(initialLanguage);
  const [relation, setRelation] = useState(initialRelation);
  const [advancedOpen, setAdvancedOpen] = useState(source !== "all" || heading !== "all" || sort !== "relevance" || variantLanguage !== "all" || relation !== "all");
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
  const remember = (value: string) => setHistory(rememberVisitorSearch(value));
  const choose = (value: string) => { setQuery(value); setOpen(true); inputRef.current?.focus(); };
  const recent = [...history].sort((a, b) => b.lastUsed - a.lastUsed).slice(0, 4);

  useEffect(() => {
    if (!open || query.trim().length === 1) { setSuggestions([]); setResolved(""); return; }
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
  }, [open, query, source, heading, sort, variantLanguage, relation]);

  return <div className={`authority-discovery-search authority-discovery-search--${variant}`} ref={wrapperRef}
    onBlur={(event) => { if (!wrapperRef.current?.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); inputRef.current?.focus(); } }}>
    <form action="/autoridades" method="get" role="search" onSubmit={() => remember(query)}>
      <label htmlFor={`authority-query-${id}`}>{t.label}</label>
      <div className="authority-discovery-search__input-wrap"><div className="authority-discovery-search__control"><AppIcon name="search" aria-hidden="true" /><input ref={inputRef} id={`authority-query-${id}`} name="busca" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); wrapperRef.current?.querySelector<HTMLAnchorElement>(".authority-discovery-search__suggestions a")?.focus(); } }} placeholder={variant === "home" ? animatedPlaceholder : t.placeholder} maxLength={200} autoComplete="off" aria-autocomplete="list" aria-controls={open ? `authority-suggestions-${id}` : undefined} />{variant === "catalog" && <button className="button button--primary" type="submit">{t.submit}<AppIcon name="arrowRight" aria-hidden="true" /></button>}</div>
      {open && query.trim().length !== 1 && <div id={`authority-suggestions-${id}`} className="authority-discovery-search__suggestions" role="region" aria-live="polite" aria-label={t.suggestions}>{resolved !== query.trim() ? <p className="authority-discovery-search__pending">{t.pending}</p> : failed ? <p>{t.failed}</p> : suggestions.length ? <><small>{t.suggestions}</small><ul>{suggestions.map((item) => <li key={item.id}><Link href={`/autoridades/${item.id}`} onClick={() => remember(query || item.label)}><span>{sourceNames[item.source] ?? item.source}</span><strong>{item.label}</strong>{item.label_en && <em>{item.label_en}</em>}</Link></li>)}</ul>{!!related.length && <div className="authority-discovery-search__suggestion-group"><small>{extra.related}</small>{related.map(item => <Link key={item.id} href={`/autoridades/${item.id}`} onClick={() => remember(item.label)}>{item.label}</Link>)}</div>}</> : <><p>{query.trim() ? t.noSuggestions : null}</p>{correction && <div className="authority-discovery-search__suggestion-group"><small>{extra.correction}</small><Link href={`/autoridades/${correction.id}`} onClick={() => remember(correction.label)}>{correction.label}</Link></div>}{!!related.length && <div className="authority-discovery-search__suggestion-group"><small>{extra.related}</small>{related.map(item => <Link key={item.id} href={`/autoridades/${item.id}`} onClick={() => remember(item.label)}>{item.label}</Link>)}</div>}{!query.trim() && !!recent.length && <div className="authority-discovery-search__suggestion-group"><small>{extra.recent}</small>{recent.map(item => <button key={item.query} type="button" onClick={() => choose(item.query)}>{item.query}</button>)}</div>}</>}</div>}</div>
      {variant === "catalog" && <details className="authority-discovery-search__advanced" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}><summary><AppIcon name="settings" aria-hidden="true" />{publicCopy.professional} · {publicCopy.advanced}</summary><div className="authority-discovery-search__filters"><label>{t.source}<select name="fonte" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">{t.allSources}</option>{Object.entries(sourceNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>{t.type}<select name="tipo" value={heading} onChange={(event) => setHeading(event.target.value)}><option value="all">{t.allTypes}</option>{Object.entries(headingNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>{extra.language}<select name="idioma" value={variantLanguage} onChange={(event) => setVariantLanguage(event.target.value)}><option value="all">{extra.allLanguages}</option>{["pt","en","es","de","fr","it"].map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}</select></label><label>{extra.relation}<select name="relacao" value={relation} onChange={(event) => setRelation(event.target.value)}><option value="all">{extra.allRelations}</option><option value="broader">{extra.broader}</option><option value="narrower">{extra.narrower}</option><option value="related">{extra.associated}</option></select></label><label>{t.sort}<select name="ordem" value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">{t.relevance}</option><option value="az">{t.az}</option><option value="za">{t.za}</option><option value="recent">{t.recent}</option><option value="source">{t.sourceSort}</option></select></label></div><p className="authority-discovery-search__operators">{t.operators} <code>&quot;habitação social&quot; AND patrimônio NOT paisagem</code></p></details>}
    </form>
    {variant === "home" && <div className="authority-discovery-search__extras"><div className="authority-discovery-search__examples"><span>{t.examples}</span>{examples.map((example) => <button key={example} type="button" onClick={() => choose(example)}>{example}</button>)}</div>{!!recent.length && <div className="authority-discovery-search__examples"><span>{extra.recent}</span>{recent.map(item => <button key={item.query} type="button" onClick={() => choose(item.query)}>{item.query}</button>)}<button type="button" onClick={() => { clearVisitorSearches(); setHistory([]); }}>{extra.clearHistory}</button></div>}</div>}
  </div>;
}
