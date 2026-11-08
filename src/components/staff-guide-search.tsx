"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { AppIcon } from "./app-icon";
import type { KnowledgeItem } from "@/lib/knowledge-base";

type Result = { slug: string; title: string; summary: string; section: string };
const sectionLabel: Record<string, string> = { "comece-aqui": "Comece aqui", atendimento: "Atendimento e catalogação", administracao: "Administração" };

export function StaffGuideSearch({ compact = false, onAnswerSelect }: { compact?: boolean; onAnswerSelect?: (item: KnowledgeItem) => void }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [answers, setAnswers] = useState<KnowledgeItem[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults([]); setAnswers([]); setResolvedQuery(""); setFailed(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const [guideResponse, answerResponse] = await Promise.all([
          fetch(`/api/staff-guide/search?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: "no-store" }),
          compact ? fetch(`/api/central-de-duvidas?context=equipe&q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: "no-store" }) : Promise.resolve(null),
        ]);
        if (!guideResponse.ok || answerResponse && !answerResponse.ok) throw new Error("search_failed");
        setResults((await guideResponse.json()).results);
        setAnswers(answerResponse ? (await answerResponse.json()).results : []);
        setFailed(false);
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { if (!controller.signal.aborted) setResolvedQuery(term); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, compact]);
  return <div className={`staff-docs__search${compact ? " staff-docs__search--compact" : ""}`} role="search" aria-label={compact ? "Buscar ajuda da equipe" : "Buscar no Guia da Equipe"}><label className="sr-only" htmlFor={id}>{compact ? "Buscar ajuda da equipe" : "Buscar no Guia da Equipe"}</label><div className="staff-docs__search-field"><AppIcon name="search" /><input id={id} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={compact ? "Buscar guia ou resposta rápida…" : "Buscar no guia da equipe…"} autoComplete="off" aria-autocomplete="list" aria-controls={query.trim().length >= 2 ? `${id}-results` : undefined} /></div>
    {query.trim().length >= 2 && <div className="staff-docs__search-results" id={`${id}-results`} role="region" aria-live="polite">{resolvedQuery !== query.trim() ? <div className="search-results-pending" aria-hidden="true" /> : failed ? <p>Não foi possível buscar agora. Tente novamente.</p> : results.length || answers.length ? <ul>{answers.map((item) => <li key={item.id}><button type="button" onClick={() => { setQuery(""); onAnswerSelect?.(item); }}><small>Resposta rápida da equipe · {item.category}</small><strong>{item.title}</strong><span>{item.summary}</span></button></li>)}{results.map((item) => <li key={item.slug}><Link href={`/guia-equipe/${item.slug}`} target={compact ? "_blank" : undefined} rel={compact ? "noreferrer" : undefined} onClick={() => setQuery("")}><small>Guia da equipe · {sectionLabel[item.section] ?? item.section}</small><strong>{item.title}</strong><span>{item.summary}</span></Link></li>)}</ul> : <p>Nenhum conteúdo encontrado. Confira a grafia ou tente um termo mais geral.</p>}</div>}
  </div>;
}
