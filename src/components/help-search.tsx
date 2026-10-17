"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { KnowledgeItem } from "@/lib/knowledge-base";
import { AppIcon } from "./app-icon";
import { SearchEmptyState } from "./search-empty-state";
import { useInterfaceLanguage } from "./interface-language";
import { helpCopy, helpCategoryLabel, helpKindLabel } from "@/lib/help-copy";

export function HelpSearch({ compact = false, context, onAnswerSelect, openArticlesInNewTab = false }: { compact?: boolean; context?: string; onAnswerSelect?: (item: KnowledgeItem) => void; openArticlesInNewTab?: boolean }) {
  const { language } = useInterfaceLanguage();
  const t = helpCopy[language];
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);
  const answerRef = useRef<HTMLElement>(null);
  const id = useId();

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults([]); setResolvedQuery(""); setFailed(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: term });
        if (context) params.set("context", context);
        const response = await fetch(`/api/central-de-duvidas?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("search_failed");
        setResults((await response.json()).results);
        setFailed(false);
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setResolvedQuery(term);
      }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [context, query]);

  useEffect(() => {
    if (!selected) return;
    answerRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    answerRef.current?.focus({ preventScroll: true });
  }, [selected]);

  const selectAnswer = (item: KnowledgeItem) => {
    setQuery("");
    if (onAnswerSelect) { onAnswerSelect(item); return; }
    if (item.kind === "Pergunta frequente") {
      const details = document.getElementById(`ajuda-${item.id}`);
      if (details instanceof HTMLDetailsElement) {
        details.open = true;
        window.requestAnimationFrame(() => {
          details.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
          details.querySelector("summary")?.focus({ preventScroll: true });
        });
        return;
      }
    }
    setSelected(item);
  };

  return <section className={`help-search${compact ? " help-search--compact" : " container"}`} aria-labelledby={`busca-${id}`}>
    <label id={`busca-${id}`} htmlFor={`busca-input-${id}`}>{compact ? t.compactSearch : t.search}</label>
    <div className="help-search__field"><input id={`busca-input-${id}`} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder={t.placeholder} autoComplete="off" aria-autocomplete="list" aria-controls={query.trim().length >= 2 ? `sugestoes-${id}` : undefined} /><span aria-hidden="true">⌕</span></div>
    {query.trim().length >= 2 && <div className="help-search__suggestions" id={`sugestoes-${id}`} role="region" aria-live="polite">
      {resolvedQuery !== query.trim() ? <div className="search-results-pending" aria-hidden="true" /> : failed ? <p>Não foi possível buscar agora. Tente novamente.</p> : results.length ? <ul>{results.map((item) => <li key={`${item.kind}-${item.id}`}>
        {item.slug ? <Link href={`/ajuda/artigos/${item.slug}`} target={openArticlesInNewTab ? "_blank" : undefined} rel={openArticlesInNewTab ? "noreferrer" : undefined}><small>{helpKindLabel(language, item.kind)} · {helpCategoryLabel(language, item.category)}</small><strong>{item.title}{openArticlesInNewTab && <AppIcon name="external" />}</strong><span>{item.summary}</span></Link>
          : <button type="button" onClick={() => selectAnswer(item)}><small>{helpKindLabel(language, item.kind)} · {helpCategoryLabel(language, item.category)}</small><strong>{item.title}</strong><span>{item.summary}</span></button>}
      </li>)}</ul> : <SearchEmptyState language={language} scope="help" />}
    </div>}
    {selected && !onAnswerSelect && <section className="help-search__answer knowledge-rich-content" ref={answerRef} tabIndex={-1} aria-label={selected.title}>
      <h2>{selected.title}</h2>
      {selected.bodyHtml ? <div dangerouslySetInnerHTML={{ __html: selected.bodyHtml }} /> : <p>{selected.summary}</p>}
    </section>}
  </section>;
}
