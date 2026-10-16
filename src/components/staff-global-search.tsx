"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { BookLoadingIcon } from "@/components/book-loading-icon";
import { SearchEmptyState } from "@/components/search-empty-state";

type SearchResult = { id: string; type: string; title: string; detail: string; href: string };

const searchGreetings = [
  (name: string) => `${name}, o que você procura hoje?`,
  (name: string) => `Posso ajudar, ${name}. Por onde começamos?`,
  (name: string) => `${name}, vamos encontrar o que você precisa.`,
  (name: string) => `Em que posso ajudar você, ${name}?`,
  (name: string) => `${name}, qual informação posso encontrar?`,
  (name: string) => `Vamos direto ao ponto, ${name}?`,
];

export function StaffGlobalSearch({ prominent = false, firstName = "", greetingVariant = 0 }: { prominent?: boolean; firstName?: string; greetingVariant?: number }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("Buscar em todo o painel…");
  useEffect(() => { if (prominent) input.current?.focus(); }, [prominent]);
  useEffect(() => {
    if (query || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const suggestions = ["Buscar protocolos…", "Buscar assuntos…", "Buscar códigos CDU…", "Buscar datas do calendário…", "Buscar configurações…"];
    let suggestion = 0;
    let letters = 0;
    let removing = false;
    let timer = 0;
    const type = () => {
      const current = suggestions[suggestion];
      letters += removing ? -1 : 1;
      setPlaceholder(current.slice(0, letters));
      if (!removing && letters === current.length) { removing = true; timer = window.setTimeout(type, 1100); return; }
      if (removing && letters === 0) { removing = false; suggestion = (suggestion + 1) % suggestions.length; timer = window.setTimeout(type, 180); return; }
      timer = window.setTimeout(type, removing ? 20 : 38);
    };
    timer = window.setTimeout(type, 350);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) { setResults([]); setResolvedQuery(""); setLoading(false); setFailed(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/painel/busca?q=${encodeURIComponent(value)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("search_failed");
        const data = await response.json() as { results: SearchResult[] };
        setResults(data.results);
        setFailed(false);
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { if (!controller.signal.aborted) { setResolvedQuery(value); setLoading(false); } }
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  return <section className={`staff-global-search${prominent ? " staff-global-search--prominent" : ""}`} role="search" aria-label="Busca no painel">
    {prominent && <div className="staff-global-search__architecture" aria-hidden="true"><svg><defs><pattern id="staff-search-architecture" width="600" height="190" patternUnits="userSpaceOnUse"><rect x="30" y="-36" width="148" height="110" /><rect x="225" y="110" width="126" height="96" /><rect x="442" y="-52" width="128" height="102" /><rect x="62" y="130" width="92" height="84" /><rect x="352" y="25" width="76" height="76" /><path d="M0 103h148m-24-8v16M468 0v80m-9-13h18" /></pattern></defs><rect className="staff-global-search__pattern-plane" width="100%" height="100%" /></svg></div>}
    {prominent && <div className="staff-global-search__intro"><h2>{searchGreetings[greetingVariant % searchGreetings.length](firstName)}</h2><p>Pesquise protocolos, pessoas, assuntos e configurações.</p></div>}
    <label className="sr-only" htmlFor={id}>Buscar no painel</label>
    <div className="staff-global-search__field"><AppIcon name="search" /><input ref={input} id={id} type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} aria-controls={`${id}-results`} />{(loading || query.trim().length >= 2 && resolvedQuery !== query.trim()) && <span className="staff-global-search__busy" role="status" aria-label="Buscando resultados"><BookLoadingIcon compact /></span>}</div>
    {query.trim().length >= 2 && <div className="staff-global-search__results" id={`${id}-results`} aria-live="polite">{resolvedQuery !== query.trim() || loading ? <div className="search-results-pending" aria-hidden="true" /> : failed ? <p>Não foi possível buscar agora. Tente novamente.</p> : results.length === 0 ? <SearchEmptyState scope="panel" /> : <ul>{results.map((result) => <li key={result.id}><Link href={result.href} onClick={() => setQuery("")}><span>{result.type}</span><strong>{result.title}</strong><small>{result.detail}</small><AppIcon name="arrowRight" /></Link></li>)}</ul>}</div>}
  </section>;
}
