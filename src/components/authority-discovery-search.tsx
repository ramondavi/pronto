"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { useInterfaceLanguage } from "./interface-language";
import { authorityDiscoveryCopy } from "@/lib/authority-discovery-copy";

type Suggestion = { id: string; label: string; label_en: string | null; source: string };
type Props = { variant: "home" | "catalog"; initialQuery?: string; initialSource?: string; initialHeading?: string; initialSort?: string };
const sourceNames: Record<string, string> = { bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", loc: "Library of Congress", pronto: "Pronto!" };
const headingNames: Record<string, string> = { topic: "Temático", geographic: "Geográfico", personal: "Pessoa", corporate: "Entidade", title: "Título" };
const examples = ["habitação", "patrimônio", "paisagem", "urbanismo"];

export function AuthorityDiscoverySearch({ variant, initialQuery = "", initialSource = "all", initialHeading = "all", initialSort = "relevance" }: Props) {
  const { language } = useInterfaceLanguage();
  const t = authorityDiscoveryCopy[language];
  const [query, setQuery] = useState(initialQuery);
  const [source, setSource] = useState(initialSource);
  const [heading, setHeading] = useState(initialHeading);
  const [sort, setSort] = useState(initialSort);
  const [advancedOpen, setAdvancedOpen] = useState(source !== "all" || heading !== "all" || sort !== "relevance");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [resolved, setResolved] = useState("");
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open || query.trim().length === 1) { setSuggestions([]); setResolved(""); return; }
    const controller = new AbortController();
    const term = query.trim();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: term, fonte: source, tipo: heading, ordem: sort });
        const response = await fetch(`/api/autoridades?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("authority_search_failed");
        const result = await response.json() as { results: Suggestion[] };
        setSuggestions(result.results);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setResolved(term);
      }
    }, term ? 180 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, source, heading, sort]);

  return <div className={`authority-discovery-search authority-discovery-search--${variant}`} ref={wrapperRef}
    onBlur={(event) => { if (!wrapperRef.current?.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); inputRef.current?.focus(); } }}>
    <form action="/autoridades" method="get" role="search">
      <label htmlFor={`authority-query-${id}`}>{t.label}</label>
      <div className="authority-discovery-search__input-wrap"><div className="authority-discovery-search__control"><AppIcon name="search" aria-hidden="true" /><input ref={inputRef} id={`authority-query-${id}`} name="busca" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); wrapperRef.current?.querySelector<HTMLAnchorElement>(".authority-discovery-search__suggestions a")?.focus(); } }} placeholder={t.placeholder} maxLength={200} autoComplete="off" aria-autocomplete="list" aria-controls={open ? `authority-suggestions-${id}` : undefined} /><button className="button button--primary" type="submit">{t.submit}<AppIcon name="arrowRight" aria-hidden="true" /></button></div>
      {open && query.trim().length !== 1 && <div id={`authority-suggestions-${id}`} className="authority-discovery-search__suggestions" role="region" aria-live="polite" aria-label={t.suggestions}>{resolved !== query.trim() ? <p className="authority-discovery-search__pending">{t.pending}</p> : failed ? <p>{t.failed}</p> : suggestions.length ? <><small>{t.suggestions}</small><ul>{suggestions.map((item) => <li key={item.id}><Link href={`/autoridades/${item.id}`}><span>{sourceNames[item.source] ?? item.source}</span><strong>{item.label}</strong>{item.label_en && <em>{item.label_en}</em>}</Link></li>)}</ul></> : <p>{t.noSuggestions}</p>}</div>}</div>
      {variant === "catalog" && <details className="authority-discovery-search__advanced" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}><summary><AppIcon name="settings" aria-hidden="true" />{t.advanced}</summary><div className="authority-discovery-search__filters"><label>{t.source}<select name="fonte" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">{t.allSources}</option>{Object.entries(sourceNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>{t.type}<select name="tipo" value={heading} onChange={(event) => setHeading(event.target.value)}><option value="all">{t.allTypes}</option>{Object.entries(headingNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>{t.sort}<select name="ordem" value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">{t.relevance}</option><option value="az">{t.az}</option><option value="za">{t.za}</option><option value="recent">{t.recent}</option><option value="source">{t.sourceSort}</option></select></label></div><p className="authority-discovery-search__operators">{t.operators} <code>&quot;habitação social&quot; AND patrimônio NOT paisagem</code></p></details>}
    </form>
    {variant === "home" && <div className="authority-discovery-search__examples"><span>{t.examples}</span>{examples.map((example) => <button key={example} type="button" onClick={() => { setQuery(example); setOpen(true); inputRef.current?.focus(); }}>{example}</button>)}</div>}
  </div>;
}
