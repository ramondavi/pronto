"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { LiteraryAvatar } from "@/components/literary-avatar";
import { RelativeDateTime } from "@/components/relative-date-time";
import { createClient } from "@/lib/supabase/client";

export type StaffActivityEvent = {
  event_id: string;
  occurred_at: string;
  action: string;
  request_id: string;
  protocol: string;
  request_title: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  avatar_choice: number | null;
  cancellation_reason?: string | null;
};

const pageSize = 10;
const descriptions: Record<string, { verb: string; label: string; detail: string; icon: AppIconName; tone: string }> = {
  cataloging_request_assumed: { verb: "assumiu um atendimento", label: "Começou a análise", detail: "O protocolo saiu da fila e já tem responsável.", icon: "work", tone: "active" },
  cataloging_request_reassigned: { verb: "atribuiu um atendimento a outra pessoa", label: "Mudou de responsável", detail: "Outra pessoa da equipe dará continuidade ao protocolo.", icon: "person", tone: "active" },
  cataloging_request_released: { verb: "devolveu um atendimento à fila", label: "De volta à fila", detail: "O protocolo aguarda um novo responsável.", icon: "queue", tone: "pending" },
  request_changes_requested: { verb: "pediu ajustes em um trabalho", label: "Aguardando ajustes", detail: "O estudante recebeu orientações para corrigir os dados.", icon: "edit", tone: "pending" },
  request_corrections_submitted: { verb: "reenviou as correções", label: "Correções chegaram", detail: "O trabalho voltou para conferência da equipe.", icon: "review", tone: "active" },
  request_analysis_completed: { verb: "validou os metadados", label: "Análise avançou", detail: "Os metadados foram conferidos e o trabalho seguiu para catalogação.", icon: "check", tone: "done" },
  request_citation_validated: { verb: "validou a referência do trabalho", label: "Referência validada", detail: "A referência bibliográfica passou pela conferência da biblioteca.", icon: "book", tone: "done" },
  cataloging_card_homologated: { verb: "homologou a ficha catalográfica", label: "Ficha homologada", detail: "A ficha passou pela revisão técnica final.", icon: "document", tone: "done" },
  nada_consta_approved: { verb: "aprovou o Nada Consta", label: "Nada Consta aprovado", detail: "A documentação foi conferida e aprovada.", icon: "shield", tone: "done" },
  nada_consta_rejected: { verb: "solicitou um novo Nada Consta", label: "Novo documento solicitado", detail: "O estudante precisa reenviar a documentação.", icon: "shield", tone: "pending" },
  cataloging_request_completed: { verb: "concluiu um atendimento", label: "Atendimento concluído", detail: "A publicação no repositório foi verificada.", icon: "check", tone: "done" },
  request_canceled_failed_declaration: { verb: "cancelou um protocolo", label: "Protocolo cancelado", detail: "Uma declaração obrigatória não foi cumprida.", icon: "close", tone: "canceled" },
  request_priority_set: { verb: "sinalizou um protocolo como prioritário", label: "Prioridade definida", detail: "O protocolo recebeu prioridade operacional com justificativa registrada.", icon: "work", tone: "pending" },
  request_priority_removed: { verb: "retirou a prioridade de um protocolo", label: "Prioridade retirada", detail: "O protocolo voltou à ordem regular de atendimento.", icon: "queue", tone: "active" },
};

export function StaffActivityFeed({ initialEvents, userId, initialLoadError = false }: { initialEvents: StaffActivityEvent[]; userId: string; initialLoadError?: boolean }) {
  const [events, setEvents] = useState(initialEvents);
  const [hasMore, setHasMore] = useState(initialEvents.length === pageSize);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialLoadError);
  const [canScroll, setCanScroll] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(() => new Set());
  const [supabase] = useState(createClient);
  const postsRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef(new Set(initialEvents.map((event) => event.event_id)));
  const initialRefreshDoneRef = useRef(false);
  const entranceTimersRef = useRef<Set<number>>(new Set());
  const scrollHintTimerRef = useRef<number | null>(null);
  const suppressScrollHintRef = useRef(false);
  const hideScrollHint = useCallback(() => {
    if (scrollHintTimerRef.current !== null) window.clearTimeout(scrollHintTimerRef.current);
    scrollHintTimerRef.current = null;
    setShowScrollHint(false);
  }, []);
  const revealScrollHint = useCallback(() => {
    const posts = postsRef.current;
    if (suppressScrollHintRef.current || !posts || posts.scrollHeight <= posts.clientHeight + 2 || posts.scrollTop + posts.clientHeight >= posts.scrollHeight - 2) return;
    hideScrollHint();
    setShowScrollHint(true);
    scrollHintTimerRef.current = window.setTimeout(() => { setShowScrollHint(false); scrollHintTimerRef.current = null; }, 3000);
  }, [hideScrollHint]);
  const returnToTop = () => {
    suppressScrollHintRef.current = true;
    hideScrollHint();
    postsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const refresh = useCallback(async () => {
    const { data, error: requestError } = await supabase.rpc("list_staff_activity_feed", { page_size: pageSize });
    if (requestError) setError(true);
    else {
      const next = (data ?? []) as StaffActivityEvent[];
      const newIds = next.filter((item) => !knownIdsRef.current.has(item.event_id) && descriptions[item.action]).map((item) => item.event_id);
      next.forEach((item) => knownIdsRef.current.add(item.event_id));
      setEvents((current) => [...new Map([...current, ...next].map((item) => [item.event_id, item])).values()].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at) || b.event_id.localeCompare(a.event_id)));
      if (initialRefreshDoneRef.current && newIds.length) {
        setEnteringIds((current) => new Set([...current, ...newIds]));
        const timer = window.setTimeout(() => {
          setEnteringIds((current) => { const remaining = new Set(current); newIds.forEach((id) => remaining.delete(id)); return remaining; });
          entranceTimersRef.current.delete(timer);
        }, 750);
        entranceTimersRef.current.add(timer);
      }
      initialRefreshDoneRef.current = true;
      setError(false);
    }
  }, [supabase]);

  useEffect(() => {
    void refresh();
    const entranceTimers = entranceTimersRef.current;
    const channel = supabase.channel("staff-activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_activity_events" }, () => { void refresh(); })
      .subscribe();
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); entranceTimers.forEach(window.clearTimeout); entranceTimers.clear(); void supabase.removeChannel(channel); };
  }, [refresh, supabase]);

  const loadMore = useCallback(async () => {
    if (busy || !hasMore) return;
    const last = events.at(-1);
    if (!last) return;
    setBusy(true);
    const { data, error: requestError } = await supabase.rpc("list_staff_activity_feed", {
      page_size: pageSize, before_occurred_at: last.occurred_at, before_event_id: last.event_id,
    });
    if (requestError) setError(true);
    else { const next = (data ?? []) as StaffActivityEvent[]; next.forEach((item) => knownIdsRef.current.add(item.event_id)); setEvents((current) => [...new Map([...current, ...next].map((item) => [item.event_id, item])).values()]); setHasMore(next.length === pageSize); setError(false); }
    setBusy(false);
  }, [busy, hasMore, events, supabase]);

  useEffect(() => {
    if (!hasMore || busy || error || !postsRef.current || !endRef.current) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { observer.disconnect(); void loadMore(); } }, { root: postsRef.current, rootMargin: "0px 0px 80px 0px" });
    observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [hasMore, busy, error, events.length, loadMore]);

  useEffect(() => {
    const posts = postsRef.current;
    if (!posts) return;
    const update = () => { const scrollable = posts.scrollHeight > posts.clientHeight + 2; setCanScroll(scrollable); if (!scrollable) setShowScrollHint(false); };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(posts);
    Array.from(posts.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [events.length]);
  useEffect(() => {
    const posts = postsRef.current;
    const side = posts?.closest(".staff-overview-main")?.querySelector<HTMLElement>(".staff-overview-main__side");
    const calendar = side?.querySelector<HTMLElement>(".staff-calendar");
    if (!posts || !side || !calendar || posts.querySelectorAll(":scope > .staff-feed__item").length < 2) return;
    const update = () => {
      const distance = calendar.getBoundingClientRect().bottom - posts.getBoundingClientRect().top;
      const height = `${Math.max(0, Math.floor((distance - 20) / 2))}px`;
      if (posts.style.getPropertyValue("--feed-initial-card-height") !== height) posts.style.setProperty("--feed-initial-card-height", height);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(side);
    observer.observe(posts);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); posts.style.removeProperty("--feed-initial-card-height"); };
  }, [events.length]);
  useEffect(() => () => { if (scrollHintTimerRef.current !== null) window.clearTimeout(scrollHintTimerRef.current); }, []);


  return <section className="staff-feed" aria-label="Novidades dos atendimentos" data-scrollable={canScroll} onMouseEnter={revealScrollHint} onMouseLeave={() => { suppressScrollHintRef.current = false; hideScrollHint(); }} onFocusCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) revealScrollHint(); }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { if (!event.currentTarget.matches(":hover")) suppressScrollHintRef.current = false; hideScrollHint(); } }}>
    {error && <p className="notice notice--error" role="alert">Não foi possível carregar as atualizações. Nova tentativa automática em instantes.</p>}
    {events.length ? <div className="staff-feed__posts" ref={postsRef} tabIndex={0} aria-label="Publicações recentes. Role para ver mais." onScroll={(event) => { hideScrollHint(); setHasScrolled(event.currentTarget.scrollTop > 2); }}>{events.map((event) => {
      const description = descriptions[event.action];
      if (!description) return null;
      const staff = event.actor_role === "cataloger" || event.actor_role === "administrator";
      return <div className={`staff-feed__item${enteringIds.has(event.event_id) ? " staff-feed__item--entering" : ""}`} key={event.event_id}><div className="staff-feed__item-inner"><article className={`staff-feed__post staff-feed__post--${description.tone}`}>
        <div className="staff-feed__post-head"><div className="staff-feed__avatar">{staff && event.actor_id ? <LiteraryAvatar id={event.actor_id} label={event.actor_name} choice={event.avatar_choice} small /> : <span aria-hidden="true">{event.actor_name.charAt(0).toLocaleUpperCase("pt-BR")}</span>}</div><div className="staff-feed__byline"><p><strong>{event.actor_id === userId && staff ? "Você" : event.actor_name}</strong><span className="staff-feed__when"><span className="staff-feed__when-dot" aria-hidden="true" /><RelativeDateTime value={event.occurred_at} /></span></p><span className="staff-feed__action">{description.verb}</span></div></div>
        <div className="staff-feed__story"><span className="staff-feed__story-icon"><AppIcon name={description.icon} /></span><span className="staff-feed__story-label">{description.label}</span><h3>{event.request_title}</h3><span className="staff-feed__protocol">{event.protocol}</span></div>
        <div className="staff-feed__post-foot"><p>{event.action === "request_canceled_failed_declaration" && event.cancellation_reason?.trim() ? `Motivo: ${event.cancellation_reason}` : description.detail}</p><Link href={`/painel/atendimento/${event.request_id}`}>Ver atendimento <AppIcon name="arrowRight" /></Link></div>
      </article></div></div>;
    })}{hasMore && <div ref={endRef} className="staff-feed__loading" role="status" aria-live="polite">{busy ? "Carregando novidades anteriores…" : ""}</div>}</div> : !error && <div className="staff-feed__empty"><AppIcon name="inbox" /><h3>Nenhuma novidade por enquanto</h3><p>As próximas ações da equipe nos atendimentos aparecerão neste feed.</p></div>}
    {canScroll && <div className="staff-feed__scroll-controls"><span className={`staff-feed__scroll-hint${showScrollHint ? " is-visible" : ""}`} aria-hidden="true">Role para ver mais <AppIcon name="arrowRight" /></span><button type="button" className={`staff-feed__back-to-top${hasScrolled ? " is-visible" : ""}`} disabled={!hasScrolled} onClick={returnToTop}><AppIcon name="arrowRight" />Voltar ao topo</button></div>}
  </section>;
}
