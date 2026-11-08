"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AppIcon } from "./app-icon";
import { KnowledgeRichBody } from "./knowledge-rich-body";
import { HelpSearch } from "./help-search";
import { StaffGuideSearch } from "./staff-guide-search";
import type { KnowledgeItem } from "@/lib/knowledge-base";

type HelpContext = "administracao" | "atendimento" | "estudante" | "painel";
const labels: Record<HelpContext, string> = { administracao: "Administração", atendimento: "Atendimento", estudante: "Sua solicitação", painel: "Painel" };

type GuideSuggestion = { slug: string; title: string; summary: string; section: string };
const adminHints: Record<string, string> = { subjects: "assuntos", cdu: "cdu", guide: "guia", users: "contas", programs: "programas", faq: "ajuda", service: "atendimento", permissions: "permissões", library: "biblioteca", audit: "histórico" };

function StaffGuideHelpWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GuideSuggestion[]>([]);
  const [answers, setAnswers] = useState<KnowledgeItem[]>([]);
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);
  const [failed, setFailed] = useState(false);
  const tab = searchParams.get("aba") ?? "";
  const context = pathname.includes("/admin") ? `admin:${adminHints[tab] ?? tab}` : /\/atendimento|\/fila|\/meus-atendimentos/.test(pathname) ? "atendimento" : "comece-aqui";
  const contextLabel = pathname.includes("/admin") ? tab ? `Administração · ${adminHints[tab] ?? tab}` : "Administração" : context === "atendimento" ? "Atendimento" : "Visão geral";

  useEffect(() => {
    const answerId = searchParams.get("ajuda");
    if (!answerId) return;
    const controller = new AbortController();
    fetch(`/api/central-de-duvidas?context=equipe&id=${encodeURIComponent(answerId)}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : { results: [] })
      .then(({ results }) => { if (results[0]) { setSelected(results[0]); setOpen(true); } })
      .catch(() => {});
    return () => controller.abort();
  }, [searchParams]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(`/api/staff-guide/search?context=${encodeURIComponent(context)}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error("guide_help_failed"); return response.json(); })
      .then(({ results }) => { setItems(results); setFailed(false); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    fetch("/api/central-de-duvidas?context=equipe", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : { results: [] })
      .then(({ results }) => setAnswers(results))
      .catch(() => { if (!controller.signal.aborted) setAnswers([]); });
    return () => controller.abort();
  }, [context, open]);

  return <div className={`backend-help${open ? " is-open" : ""}`}>
    <button className="backend-help__trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="ajuda-contextual" aria-label="Abrir ajuda contextual" title="Ajuda contextual"><AppIcon name="help" /><span>Precisa de ajuda?</span></button>
    <section className="backend-help__panel" id="ajuda-contextual" aria-label="Ajuda contextual do Guia da Equipe" aria-hidden={!open} inert={!open}>
      <header><div><p className="eyebrow">Ajuda da equipe · {contextLabel}</p><h2>{selected ? selected.title : "Como podemos ajudar?"}</h2></div><button className="backend-help__close" type="button" onClick={() => setOpen(false)} aria-label="Fechar ajuda contextual"><AppIcon name="close" /></button></header>
      {selected ? <div className="backend-help__answer">{selected.bodyHtml ? <KnowledgeRichBody html={selected.bodyHtml} /> : <p>{selected.summary}</p>}<button type="button" onClick={() => setSelected(null)}>Voltar para a ajuda</button></div> : <>
        <StaffGuideSearch compact onAnswerSelect={setSelected} />
        {answers.length > 0 && <div className="backend-help__topics"><strong>Respostas rápidas da equipe</strong>{answers.slice(0, 3).map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)}>{item.title}</button>)}</div>}
        {failed ? <p className="backend-help__guide-status">Não foi possível carregar os capítulos agora.</p> : items.length ? <div className="backend-help__topics"><strong>Guias úteis nesta tela</strong>{items.slice(0, 3).map((item) => <Link key={item.slug} href={`/guia-equipe/${item.slug}`} target="_blank" rel="noreferrer">{item.title}<AppIcon name="external" /></Link>)}</div> : <p className="backend-help__guide-status">Os capítulos publicados para esta tela aparecerão aqui.</p>}
        <Link className="backend-help__all" href="/guia-equipe" target="_blank" rel="noreferrer">Abrir Guia da Equipe <AppIcon name="external" /></Link>
      </>}
    </section>
  </div>;
}

export function BackendHelpWidget({ role }: { role: string }) {
  return role === "cataloger" || role === "administrator" ? <StaffGuideHelpWidget /> : <StudentHelpWidget role={role} />;
}

function StudentHelpWidget({ role }: { role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [activeContext, setActiveContext] = useState<HelpContext>("painel");
  const [history, setHistory] = useState<HelpContext[]>([]);
  const [selected, setSelected] = useState<KnowledgeItem | null>(null);
  const pageContext: HelpContext = pathname.includes("/admin") ? "administracao" : pathname.includes("/atendimento") || pathname.includes("/fila") ? "atendimento" : role === "student" ? "estudante" : "painel";

  useEffect(() => {
    if (!open) return;
    setActiveContext((previous) => {
      if (previous !== pageContext) setHistory((entries) => [previous, ...entries.filter((entry) => entry !== previous)].slice(0, 4));
      return pageContext;
    });
    setSelected(null);
  }, [open, pageContext]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/central-de-duvidas?context=${activeContext}`)
      .then((response) => response.ok ? response.json() : { results: [] })
      .then(({ results }) => setItems(results));
  }, [activeContext, open]);

  const reopen = (context: HelpContext) => {
    setActiveContext(context);
    setHistory((entries) => entries.filter((entry) => entry !== context));
    setSelected(null);
  };

  return <div className={`backend-help${open ? " is-open" : ""}`}>
    <button className="backend-help__trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="ajuda-contextual" aria-label="Abrir ajuda contextual" title="Ajuda contextual"><AppIcon name="help" /><span>Precisa de ajuda?</span></button>
    <section className="backend-help__panel" id="ajuda-contextual" aria-label="Ajuda contextual" aria-hidden={!open} inert={!open}>
      <header><div><p className="eyebrow">Ajuda para {labels[activeContext]}</p><h2>{selected ? selected.title : "Como podemos ajudar?"}</h2></div><button className="backend-help__close" type="button" onClick={() => setOpen(false)} aria-label="Fechar ajuda contextual"><AppIcon name="close" /></button></header>
      {selected ? <div className="backend-help__answer">{selected.bodyHtml ? <KnowledgeRichBody html={selected.bodyHtml} /> : <p>{selected.summary}</p>}<button type="button" onClick={() => setSelected(null)}>Voltar para as sugestões</button></div> : <>
        <HelpSearch compact context={activeContext} onAnswerSelect={setSelected} openArticlesInNewTab />
        {items.length > 0 && <div className="backend-help__topics"><strong>Mais útil nesta tela</strong>{items.slice(0, 3).map((item) => item.slug ? <Link key={item.id} href={`/ajuda/artigos/${item.slug}`} target="_blank" rel="noreferrer">{item.title}<AppIcon name="external" /></Link> : <button key={item.id} type="button" onClick={() => setSelected(item)}>{item.title}</button>)}</div>}
        {history.length > 0 && <div className="backend-help__history"><strong>Contextos anteriores</strong>{history.map((context) => <button key={context} type="button" onClick={() => reopen(context)}>Reabrir ajuda: {labels[context]}</button>)}</div>}
        <Link className="backend-help__all" href="/ajuda" target="_blank" rel="noreferrer">Abrir Central de ajuda <AppIcon name="external" /></Link>
      </>}
    </section>
  </div>;
}
