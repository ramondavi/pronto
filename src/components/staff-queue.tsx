"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { showPanelChange } from "@/components/panel-change-toast";
import type { QueueRequest, StaffOption } from "@/domain/staff-queue/types";
import { AppIcon } from "./app-icon";
import { RelativeDateTime } from "./relative-date-time";
import { PriorityBadge } from "./priority-badge";
import { RequestTimelineDialog } from "./request-timeline";
import { RequestPriorityControl } from "./request-priority-control";
import { formatWorkTitle } from "@/lib/work-title";
import { ModalCloseButton } from "./modal-close-button";
import { requestStatusIcons, requestStatusKey } from "@/domain/request-status-ui";
import { RequestCancellationReason } from "./request-cancellation-reason";

const statusLabels: Record<string, string> = { submitted: "Na fila", in_review: "Em análise", changes_requested: "Correções solicitadas", approved: "Homologada", completed: "Concluída", canceled: "Cancelada" };
const visibleStatus = (item: QueueRequest) => requestStatusKey(item.status, item.progressTone === "done");
const isClosed = (item: QueueRequest) => ["completed", "canceled"].includes(visibleStatus(item));
const attentionRank = (item: QueueRequest) => item.nadaConstaStatus === "pending" && item.hasHomologation && !isClosed(item) ? 3 : item.isPriority ? 2 : item.nadaConstaStatus === "pending" && !isClosed(item) ? 1 : 0;
const timelineStages = ["Fila", "Análise", "Liberação", "Autodepósito", "Concluído"] as const;
const timelineStatusByStep = ["submitted", "in_review", "approved", "approved", "completed"] as const;
function timelineStageStatus(item: QueueRequest, index: number) {
  if (item.status === "canceled" && index === 1) return "canceled";
  if (item.status === "changes_requested" && index === item.progressStep) return "changes_requested";
  return timelineStatusByStep[index] ?? "submitted";
}
type QueueSort = "priority" | "updated" | "oldest" | "newest";
const pageSize = 20;
const staffDisplayName = (fullName: string | null) => {
  if (!fullName?.trim()) return "não atribuído";
  const names = fullName.trim().split(/\s+/);
  return names.length === 1 ? names[0] : `${names[0]} ${names[names.length - 1]}`;
};

function AnalysisNotesDialog({ protocol, note }: { protocol: string; note: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return <><button className="queue-item__note" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}><AppIcon name="document" />Anotações da análise</button>{open && <div className="queue-note-overlay pronto-modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="queue-note-dialog pronto-modal-surface" role="dialog" aria-modal="true" aria-label={`Anotações da análise de ${protocol}`}><div className="timeline-dialog__header"><span className="timeline-dialog__icon" aria-hidden="true"><AppIcon name="document" /></span><div><p className="eyebrow">{protocol}</p><h2>Anotações da análise</h2></div><ModalCloseButton onClick={() => setOpen(false)} /></div><p className="queue-note-dialog__body">{note}</p></section></div>}</>;
}

export function StaffQueue({ initialRequests, staff, currentUserId, isAdministrator }: { initialRequests: QueueRequest[]; staff: StaffOption[]; currentUserId: string; isAdministrator: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const targetRequestId = params.get("solicitacao");
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [closedView, setClosedView] = useState(false);
  const [sort, setSort] = useState<QueueSort>("priority");
  const [page, setPage] = useState(1);
  const [program, setProgram] = useState("");
  const [monographType, setMonographType] = useState("");
  const [assignee, setAssignee] = useState(params.get("responsavel") === "me" ? "me" : "");
  const [age, setAge] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMineView = assignee === "me";
  const activeFilters = [status, program, monographType, age, assignee && assignee !== "me" ? assignee : ""].filter(Boolean).length;
  const waitingCount = requests.filter((item) => !item.assignedTo && !isClosed(item)).length;
  const mineCount = requests.filter((item) => item.assignedTo === currentUserId && !isClosed(item)).length;
  const scopedRequests = requests.filter((item) => !isMineView || item.assignedTo === currentUserId);
  const activeCount = scopedRequests.filter((item) => !isClosed(item)).length;
  const closedCount = scopedRequests.length - activeCount;

  useEffect(() => { setRequests(initialRequests); }, [initialRequests]);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("staff-queue-priorities")
      .on("postgres_changes", { event: "*", schema: "public", table: "request_priorities" }, () => router.refresh())
      .subscribe();
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("staff:nada-consta-uploaded", onFocus);
    return () => { window.removeEventListener("focus", onFocus); window.removeEventListener("staff:nada-consta-uploaded", onFocus); void supabase.removeChannel(channel); };
  }, [router]);

  useEffect(() => {
    setAssignee(params.get("responsavel") === "me" ? "me" : "");
  }, [params]);
  useEffect(() => {
    if (!openActionsId) return;
    const closeOnOutside = (event: PointerEvent) => { if (!(event.target instanceof Element) || !event.target.closest("[data-queue-actions]")) setOpenActionsId(null); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenActionsId(null); };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [openActionsId]);

  const programs = useMemo(() => [...new Set(requests.map((item) => item.programLabel).filter((label) => label !== "Programa não identificado"))].sort((a, b) => a.localeCompare(b, "pt-BR")), [requests]);
  const monographTypes = useMemo(() => [...new Set(requests.filter((item) => !program || item.programLabel === program).map((item) => item.monographType))].sort((a, b) => a.localeCompare(b, "pt-BR")), [requests, program]);
  const filtered = useMemo(() => requests.filter((item) => {
    if (targetRequestId) return item.id === targetRequestId;
    const query = search.trim().toLocaleLowerCase("pt-BR");
    const searchable = `${item.studentName} ${item.registrationNumber ?? ""} ${item.protocol} ${item.title} ${item.subtitle ?? ""} ${item.advisorName}`.toLocaleLowerCase("pt-BR");
    const days = Math.floor((Date.now() - new Date(item.submittedAt).getTime()) / 86400000);
    return (Boolean(query) || Boolean(status) || isClosed(item) === closedView)
      && (!query || searchable.includes(query))
      && (!status || visibleStatus(item) === status)
      && (!program || item.programLabel === program)
      && (!monographType || item.monographType === monographType)
      && (!assignee || (assignee === "unassigned" ? !item.assignedTo : assignee === "me" ? item.assignedTo === currentUserId : item.assignedTo === assignee))
      && (!age || days >= Number(age));
  }).sort((a, b) => sort === "priority" ? attentionRank(b) - attentionRank(a) || (attentionRank(a) === 3 || attentionRank(a) === 1 ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt)) : sort === "updated" ? b.updatedAt.localeCompare(a.updatedAt) : sort === "oldest" ? a.submittedAt.localeCompare(b.submittedAt) : b.submittedAt.localeCompare(a.submittedAt)), [requests, search, status, closedView, program, monographType, assignee, age, sort, currentUserId, targetRequestId]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRequests = targetRequestId ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setPage(1); }, [search, status, closedView, program, monographType, assignee, age, sort, targetRequestId]);

  useEffect(() => {
    if (!targetRequestId || !filtered.some((item) => item.id === targetRequestId)) return;
    const frame = window.requestAnimationFrame(() => document.getElementById(`queue-request-${targetRequestId}`)?.scrollIntoView({ block: "center" }));
    return () => window.cancelAnimationFrame(frame);
  }, [targetRequestId, filtered]);

  function runAction(name: "assume_cataloging_request" | "release_cataloging_request", requestId: string) {
    setError(undefined);
    startTransition(async () => {
      const supabase = createClient();
      const { error: actionError } = await supabase.rpc(name, { target_request_id: requestId });
      if (actionError) {
        setError(actionError.message.includes("request_already_assigned") ? "Outro bibliotecário assumiu este atendimento antes de você." : "Não foi possível atualizar o atendimento.");
        router.refresh();
        return;
      }
      setRequests((current) => current.map((item) => item.id === requestId ? { ...item, assignedTo: name.startsWith("assume") ? currentUserId : null, assigneeName: name.startsWith("assume") ? "Você" : null, status: name.startsWith("assume") ? "in_review" : "submitted", progressLabel: name.startsWith("assume") ? "Em análise bibliotecária" : "Aguardando responsável", progressTone: name.startsWith("assume") ? "active" : "waiting", progressStep: name.startsWith("assume") ? 1 : 0 } : item));
      setOpenActionsId(null);
      showPanelChange(name.startsWith("assume") ? "Atendimento assumido" : "Atendimento liberado", async () => {
        const inverse = name.startsWith("assume") ? "release_cataloging_request" : "assume_cataloging_request";
        const { error: undoError } = await createClient().rpc(inverse, { target_request_id: requestId });
        if (undoError) throw undoError;
        router.refresh();
      });
      router.refresh();
    });
  }

  function reassign(requestId: string, targetStaffId: string) {
    if (!targetStaffId) return;
    const previousAssignee = requests.find((item) => item.id === requestId)?.assignedTo;
    setError(undefined);
    startTransition(async () => {
      const supabase = createClient();
      const { error: actionError } = await supabase.rpc("reassign_cataloging_request", { target_request_id: requestId, target_staff_id: targetStaffId });
      if (actionError) { setError(requests.find((item) => item.id === requestId)?.assignedTo ? "Não foi possível reatribuir o atendimento." : "Não foi possível atribuir o atendimento."); return; }
      const target = staff.find((item) => item.id === targetStaffId);
      setRequests((current) => current.map((item) => item.id === requestId ? { ...item, assignedTo: targetStaffId, assigneeName: target?.fullName ?? "Equipe", status: "in_review", progressLabel: "Em análise bibliotecária", progressTone: "active", progressStep: 1 } : item));
      setOpenActionsId(null);
      showPanelChange(previousAssignee ? "Atendimento reatribuído" : "Atendimento atribuído", previousAssignee ? async () => {
        const { error: undoError } = await createClient().rpc("reassign_cataloging_request", { target_request_id: requestId, target_staff_id: previousAssignee });
        if (undoError) throw undoError;
        router.refresh();
      } : undefined);
      router.refresh();
    });
  }

  return <>
    <div className="page-heading queue-heading"><div className="queue-heading__intro"><h1><AppIcon className="panel-heading-icon" name={isMineView ? "work" : "queue"} />{isMineView ? "Meus atendimentos" : "Fila de solicitações"}</h1></div><div className="queue-heading__stats"><div><AppIcon name="inbox" /><span>Aguardando responsável</span><strong>{waitingCount}</strong></div><div><AppIcon name="work" /><span>Com você</span><strong>{mineCount}</strong></div></div></div>
    <nav className="queue-views" aria-label="Visões dos atendimentos"><Link href="/painel/fila" className={!isMineView ? "is-active" : ""} aria-current={!isMineView ? "page" : undefined}><AppIcon name="queue" />Fila geral</Link><Link href="/painel/fila?responsavel=me" className={isMineView ? "is-active" : ""} aria-current={isMineView ? "page" : undefined}><AppIcon name="work" />Meus atendimentos</Link></nav>
    {!targetRequestId && <div className="queue-lifecycle"><div className="queue-lifecycle__tabs" role="group" aria-label="Situação dos atendimentos"><button type="button" className={!closedView ? "is-active" : ""} aria-pressed={!closedView} onClick={() => { setClosedView(false); setStatus(""); setSearch(""); }}>Ativos <span>{activeCount}</span></button><button type="button" className={closedView ? "is-active" : ""} aria-pressed={closedView} onClick={() => { setClosedView(true); setStatus(""); setSearch(""); }}>Encerrados <span>{closedCount}</span></button></div><div className="queue-status-legend" aria-label="Legenda dos estados"><strong>Legenda</strong>{Object.entries(statusLabels).map(([value, label]) => <span className={`queue-status-color queue-status-color--${value}`} key={value}><i aria-hidden="true" /><AppIcon name={requestStatusIcons[value]} />{label}</span>)}</div></div>}
    {error && <div className="auth-feedback auth-feedback--error" role="alert">{error}</div>}
    {targetRequestId && <p className="queue-filters__notice"><AppIcon name="help" /><span>Protocolo aberto pelo aviso. <button className="text-button" type="button" onClick={() => router.replace("/painel/fila")}>Ver toda a fila</button></span></p>}
    <div className="queue-toolbar"><div className="queue-search"><label htmlFor="queue-search-input"><AppIcon name="search" />Buscar atendimento</label><div className="queue-search__field"><input id="queue-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Estudante, matrícula, protocolo, título ou orientador" /><button className="queue-more-filters" type="button" aria-expanded={filtersOpen} aria-controls="queue-extra-filters" onClick={() => setFiltersOpen((open) => !open)}><AppIcon name="settings" />Mais filtros{activeFilters > 0 && <span className="queue-filter-count">{activeFilters} {activeFilters === 1 ? "ativo" : "ativos"}</span>}<AppIcon className={`queue-more-filters__chevron${filtersOpen ? " is-open" : ""}`} name="arrowRight" /></button>{filtersOpen && <div className="queue-filters" id="queue-extra-filters" aria-label="Filtros da fila">
      <fieldset className="queue-status-filter"><legend>Status</legend><div><button type="button" className={!status ? "is-active" : ""} aria-pressed={!status} onClick={() => setStatus("")}>Todos</button>{Object.entries(statusLabels).map(([value, label]) => <button type="button" className={`queue-status-color queue-status-color--${value}${status === value ? " is-active" : ""}`} aria-pressed={status === value} key={value} onClick={() => setStatus(value)}><AppIcon name={requestStatusIcons[value]} />{label}</button>)}</div></fieldset>
      <label>Programa <select value={program} onChange={(e) => { setProgram(e.target.value); setMonographType(""); }}><option value="">Todos</option>{programs.map((label) => <option key={label} value={label}>{label}</option>)}</select></label>
      <label>Tipo de monografia <select value={monographTypes.length === 1 ? monographTypes[0] : monographType} onChange={(e) => setMonographType(e.target.value)} disabled={monographTypes.length === 1}><option value="">Todos</option>{monographTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
      <label>Responsável técnico <select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Todos</option><option value="unassigned">Sem responsável</option><option value="me">Meus atendimentos</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></label>
      <label>Tempo na fila <select value={age} onChange={(e) => setAge(e.target.value)}><option value="">Qualquer</option><option value="1">1 dia ou mais</option><option value="3">3 dias ou mais</option><option value="7">7 dias ou mais</option></select></label>
      <div className="queue-filter-footer"><p className="queue-filters__notice"><AppIcon name="help" /><span>Concluídos e cancelados ficam em <strong>Encerrados</strong>. A busca e o filtro de status localizam protocolos em ambas as visões.</span></p>{(activeFilters > 0 || search) && <button className="text-button queue-clear-filters" type="button" onClick={() => { setSearch(""); setStatus(""); setProgram(""); setMonographType(""); setAge(""); setAssignee(isMineView ? "me" : ""); }}>Limpar filtros</button>}</div>
    </div>}</div></div><label className="queue-sort"><span><AppIcon name="settings" />Ordenar por</span><select value={sort} onChange={(event) => setSort(event.target.value as QueueSort)}><option value="priority">Padrão</option><option value="updated">Atualizados recentemente</option><option value="oldest">Solicitações mais antigas</option><option value="newest">Solicitações mais recentes</option></select></label><span className="queue-count"><strong>{filtered.length}</strong><span>{filtered.length <= 1 ? "resultado" : "resultados"}</span></span></div>
    <section className="queue-list" aria-label="Solicitações">
      {visibleRequests.map((item) => <article className={`queue-item queue-item--status-${visibleStatus(item)}${item.id === targetRequestId ? " queue-item--target" : ""}`} id={`queue-request-${item.id}`} key={item.id}>
        <div className="queue-item__top"><div className="queue-item__identity"><span className="queue-item__protocol"><AppIcon name="document" />{item.protocol}</span>{item.isPriority && <PriorityBadge />}{item.nadaConstaStatus === "pending" && !isClosed(item) && <Link className="queue-item__document-alert" href={`/painel/atendimento/${item.id}?etapa=documentation`} title="Abrir a conferência do Nada Consta"><AppIcon name="document" />{item.hasHomologation ? "Ficha pronta · conferir Nada Consta" : "Nada Consta recebido · conferir"}</Link>}{item.analysisNotes && <AnalysisNotesDialog protocol={item.protocol} note={item.analysisNotes} />}</div></div>
        <div className="queue-item__main"><h2>{formatWorkTitle(item.title, item.subtitle)}</h2><p className="queue-item__student"><span className="queue-item__student-detail"><AppIcon name="person" /><strong>Solicitante:</strong> {item.studentName}</span>{item.registrationNumber && <span className="queue-item__student-detail queue-item__registration"><AppIcon name="idCard" /><strong>Matrícula:</strong> {item.registrationNumber}</span>}</p><dl className="queue-item__facts"><div><dt><AppIcon name="book" />Programa</dt><dd title={item.programName}>{item.programLabel}</dd></div><div><dt><AppIcon name="document" />Tipo de monografia</dt><dd>{item.monographType}</dd></div><div><dt><AppIcon name="person" />Orientador</dt><dd>{item.advisorName || "Não informado"}</dd></div><div><dt><AppIcon name="calendar" />Solicitado</dt><dd><RelativeDateTime value={item.submittedAt} /></dd></div><div><dt><AppIcon name="review" />Atualizado</dt><dd><RelativeDateTime value={item.updatedAt} /></dd></div></dl>{item.status === "canceled" && <RequestCancellationReason reason={item.cancellationReason ?? null} compact />}</div>
        <div className="queue-item__footer"><div className="queue-item__progress"><div className="queue-item__state" tabIndex={0} aria-label={`${item.progressLabel}. Passe o mouse ou use o teclado para ver as etapas.`}><span className={`progress-badge progress-badge--${item.progressTone} queue-status-color queue-status-color--${visibleStatus(item)}`}><AppIcon name={requestStatusIcons[visibleStatus(item)]} />{item.progressLabel}</span><ol className="queue-item__timeline" aria-label={`Etapa atual: ${item.status === "canceled" ? "Cancelado" : timelineStages[item.progressStep]}`}>
          {(item.status === "canceled" ? ["Fila", "Cancelado"] : timelineStages).map((stage, index) => <li key={stage} className={index === item.progressStep ? `queue-status-color--${timelineStageStatus(item, index)} is-current` : index < item.progressStep ? "is-complete" : ""} aria-current={index === item.progressStep ? "step" : undefined}><span className="queue-item__timeline-dot" aria-hidden="true" />{stage}</li>)}
        </ol></div></div><div className="queue-item__actions">{item.assignedTo && <span className="queue-item__assignee" title={item.assigneeName ?? "Responsável técnico"}><AppIcon name="work" /><span>Responsável técnico: <strong>{staffDisplayName(item.assigneeName)}</strong></span></span>}<div className={`queue-item__menu${openActionsId === item.id ? " is-open" : ""}`} data-queue-actions onKeyDown={(event) => { if (event.key === "Escape") { setOpenActionsId(null); event.currentTarget.querySelector<HTMLButtonElement>(".queue-item__menu-button")?.focus(); } }}><button className="queue-item__menu-button" type="button" aria-label={`Ações de ${item.protocol}`} title="Ações" aria-expanded={openActionsId === item.id} aria-controls={openActionsId === item.id ? `queue-actions-${item.id}` : undefined} onClick={() => setOpenActionsId((current) => current === item.id ? null : item.id)}><AppIcon name="settings" /></button>{openActionsId === item.id && <div className="queue-item__menu-panel" id={`queue-actions-${item.id}`}><strong>Outras ações</strong><RequestTimelineDialog requestId={item.id} menuItem />{item.assignedTo === currentUserId && item.canRevisitDeclarations && <Link href={`/painel/atendimento/${item.id}?rever=1${isMineView ? "&origem=meus" : ""}`}><AppIcon name="review" />Rever declarações</Link>}{!isClosed(item) && <RequestPriorityControl requestId={item.id} initialReasonCode={item.priorityReasonCode} initialReasonDetail={item.priorityReasonDetail} menuItem />}{item.assignedTo === currentUserId && !isClosed(item) && <button type="button" disabled={pending} onClick={() => runAction("release_cataloging_request", item.id)}><AppIcon name="inbox" />Devolver à fila</button>}{isAdministrator && !isClosed(item) && <label>{item.assignedTo ? "Reatribuir atendimento" : "Atribuir atendimento"}<select aria-label={`${item.assignedTo ? "Reatribuir" : "Atribuir"} ${item.protocol}`} defaultValue="" onChange={(event) => reassign(item.id, event.target.value)} disabled={pending}><option value="">Escolha um profissional</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></label>}</div>}</div>{!item.assignedTo && !isClosed(item) && <button className="button button--primary button--small button--with-icon" disabled={pending} onClick={() => runAction("assume_cataloging_request", item.id)}><AppIcon name="work" />Assumir atendimento</button>}{isClosed(item) && <Link className="button button--secondary button--small button--with-icon" href={`/painel/atendimento/${item.id}${isMineView ? "?origem=meus" : ""}`}><AppIcon name="search" />Visualizar</Link>}{item.assignedTo === currentUserId && !isClosed(item) && <Link className="button button--primary button--small button--with-icon" href={`/painel/atendimento/${item.id}${isMineView ? "?origem=meus" : ""}`}><AppIcon name="review" />Abrir análise</Link>}{item.assignedTo && item.assignedTo !== currentUserId && !isClosed(item) && <Link className="button button--secondary button--small button--with-icon" href={`/painel/atendimento/${item.id}${isMineView ? "?origem=meus" : ""}`}><AppIcon name="search" />Visualizar</Link>}</div></div>
      </article>)}
      {filtered.length === 0 && <div className={`history-empty${!targetRequestId && !closedView && !search && !activeFilters && activeCount === 0 ? " history-empty--clear" : ""}`}><div><p className="eyebrow">Fila</p><h2>{targetRequestId ? "Protocolo indisponível na fila" : !closedView && !search && !activeFilters && activeCount === 0 ? "Tudo pronto por aqui" : "Nenhuma solicitação encontrada"}</h2></div><p>{targetRequestId ? "O protocolo pode ter sido removido ou seu acesso pode ter mudado." : !closedView && !search && !activeFilters && activeCount === 0 ? "Nenhum atendimento aberto por enquanto. A fila tirou uma folga; novos protocolos aparecerão aqui." : "Altere os filtros ou aguarde a entrada de novos protocolos."}</p>{!targetRequestId && !closedView && !search && !activeFilters && activeCount === 0 && <span className="queue-clear-art" aria-hidden="true"><i /><i /><i /><i /><i /></span>}</div>}
    </section>
    {!targetRequestId && pageCount > 1 && <nav className="queue-pagination" aria-label="Páginas da fila"><button type="button" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); document.querySelector(".queue-toolbar")?.scrollIntoView({ block: "start" }); }}>Anterior</button><span>Página {currentPage} de {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => { setPage(currentPage + 1); document.querySelector(".queue-toolbar")?.scrollIntoView({ block: "start" }); }}>Próxima</button></nav>}
  </>;
}
