"use client";

import { useRef, useState } from "react";
import { AppIcon, type AppIconName } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";
import { createClient } from "@/lib/supabase/client";

type FieldChange = { field_key: string; field_label: string; previous_value?: unknown; new_value?: unknown };
type AuditEvent = { event_id: string; occurred_at: string; action: string; actor_key: string; actor_name: string; actor_role: string; field_changes?: FieldChange[] };
type AuditActor = { actor_key: string; actor_name: string; actor_role: string };
const pageSize = 20;
const fullDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bahia" });
function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Não informado";
  if (Array.isArray(value)) return value.length ? value.map(displayValue).join("; ") : "Não informado";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return JSON.stringify(value);
}
const actions: Record<string, { label: string; icon: AppIconName }> = {
  cataloging_request_assumed: { label: "Assumiu o atendimento", icon: "work" },
  cataloging_request_reassigned: { label: "Atribuiu ou mudou o responsável técnico", icon: "person" },
  cataloging_request_released: { label: "Devolveu o atendimento à fila", icon: "queue" },
  request_changes_requested: { label: "Solicitou correções ao estudante", icon: "edit" },
  request_corrections_submitted: { label: "Reenviou as correções", icon: "upload" },
  request_analysis_completed: { label: "Validou os metadados", icon: "check" },
  request_field_corrected_by_staff: { label: "Corrigiu um campo na análise", icon: "edit" },
  request_direct_corrections_reset: { label: "Restaurou correções da análise", icon: "review" },
  request_direct_correction_restored: { label: "Restaurou um campo corrigido", icon: "review" },
  request_citation_validated: { label: "Validou a referência bibliográfica", icon: "book" },
  cataloging_card_homologated: { label: "Homologou a ficha catalográfica", icon: "document" },
  nada_consta_uploaded: { label: "Enviou o Nada Consta", icon: "upload" },
  nada_consta_approved: { label: "Aprovou o Nada Consta", icon: "shield" },
  nada_consta_rejected: { label: "Devolveu o Nada Consta", icon: "shield" },
  repository_deposit_started: { label: "Iniciou o autodepósito", icon: "external" },
  repository_publication_verified: { label: "Verificou a publicação no repositório", icon: "check" },
  cataloging_request_completed: { label: "Encerrou o protocolo", icon: "check" },
  request_canceled_failed_declaration: { label: "Cancelou o protocolo após conferência das declarações", icon: "close" },
  request_priority_set: { label: "Marcou o protocolo como prioritário", icon: "star" },
  request_priority_removed: { label: "Retirou a prioridade", icon: "star" },
  public_work_link_checked: { label: "Conferiu o link público do trabalho", icon: "link" },
  card_equivalent_title_decided: { label: "Definiu o uso do título equivalente na ficha", icon: "document" },
  author_birth_year_validation_revoked: { label: "Revogou a validação do ano de nascimento", icon: "person" },
  coordination_magic_link_issued: { label: "Emitiu o acesso da coordenação", icon: "link" },
  coordination_magic_link_invalidated: { label: "Invalidou o acesso da coordenação", icon: "lock" },
};

export function RequestAuditLogDialog({ requestId }: { requestId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"unavailable" | "failed" | null>(null);
  const [actors, setActors] = useState<AuditActor[]>([]);
  const [actorFilter, setActorFilter] = useState("");
  const [backendFilterAvailable, setBackendFilterAvailable] = useState(true);
  const loadVersion = useRef(0);

  async function load(older: boolean, actorKey = actorFilter) {
    if (older && busy) return;
    const version = older ? loadVersion.current : ++loadVersion.current;
    setBusy(true);
    setError(null);
    const last = older ? events.at(-1) : undefined;
    const client = createClient();
    let { data, error: loadError } = await client.rpc("list_request_staff_audit_log_filtered", {
      target_request_id: requestId,
      page_size: pageSize,
      before_occurred_at: last?.occurred_at ?? null,
      before_event_id: last?.event_id ?? null,
      filter_actor_key: actorKey || null,
    });
    const missingNewFunction = loadError?.code === "PGRST202" || loadError?.code === "42883";
    if (missingNewFunction) {
      const fallback = await client.rpc("list_request_staff_audit_log", {
        target_request_id: requestId,
        page_size: pageSize,
        before_occurred_at: last?.occurred_at ?? null,
        before_event_id: last?.event_id ?? null,
      });
      data = fallback.data;
      loadError = fallback.error;
      setBackendFilterAvailable(false);
    }
    if (version !== loadVersion.current) return;
    if (loadError) setError(loadError.code === "PGRST202" || loadError.code === "42883" ? "unavailable" : "failed");
    else {
      const page = ((data ?? []) as AuditEvent[]).map((event) => ({ ...event, actor_key: event.actor_key ?? `name:${event.actor_name}` }));
      setEvents((current) => older ? [...current, ...page] : page);
      setHasMore(page.length === pageSize);
    }
    setBusy(false);
  }

  function open() {
    dialogRef.current?.showModal();
    setEvents([]);
    setActorFilter("");
    setActors([]);
    setBackendFilterAvailable(true);
    setHasMore(false);
    void load(false, "");
    void createClient().rpc("list_request_audit_actors", { target_request_id: requestId }).then(({ data, error: actorError }) => {
      if (!actorError) setActors((data ?? []) as AuditActor[]);
    });
  }

  function chooseActor(actorKey: string) {
    setActorFilter(actorKey);
    if (!backendFilterAvailable) return;
    setEvents([]);
    setHasMore(false);
    void load(false, actorKey);
  }

  const availableActors = backendFilterAvailable ? actors : Array.from(new Map(events.map((event) => [event.actor_key, { actor_key: event.actor_key, actor_name: event.actor_name, actor_role: event.actor_role }])).values()).sort((first, second) => first.actor_name.localeCompare(second.actor_name, "pt-BR"));
  const visibleEvents = backendFilterAvailable || !actorFilter ? events : events.filter((event) => event.actor_key === actorFilter);
  const groups = visibleEvents.reduce<Array<{ actor: AuditActor; items: AuditEvent[] }>>((result, event) => {
    const key = event.actor_key;
    const group = result.find((item) => item.actor.actor_key === key);
    if (group) group.items.push(event);
    else result.push({ actor: { actor_key: key, actor_name: event.actor_name, actor_role: event.actor_role }, items: [event] });
    return result;
  }, []);

  return <>
    <button className="protocol-actions-menu__item" type="button" onClick={open}><AppIcon name="archive" />Ver registro de ações</button>
    <dialog className="request-audit-dialog pronto-modal" ref={dialogRef} aria-label="Registro de ações do atendimento">
      <div className="timeline-dialog__header"><span className="timeline-dialog__icon" aria-hidden="true"><AppIcon name="archive" /></span><div><p className="eyebrow">Uso interno da equipe</p><h2>Registro de ações</h2></div><ModalCloseButton onClick={() => dialogRef.current?.close()} /></div>
      <div className="request-audit-dialog__body">
      <p className="request-audit-dialog__intro">Quem fez cada ação e quando. Os detalhes sensíveis não são exibidos aqui.</p>
      <div className="request-audit-dialog__filter"><label htmlFor="request-audit-actor"><AppIcon name="person" />Pessoa</label><select id="request-audit-actor" value={actorFilter} onChange={(event) => chooseActor(event.target.value)}><option value="">Todas as pessoas</option>{availableActors.map((actor) => <option key={actor.actor_key} value={actor.actor_key}>{actor.actor_name}</option>)}</select>{!backendFilterAvailable && <small>Por enquanto, o filtro mostra as ações já carregadas. Carregue as anteriores para ampliar a busca.</small>}</div>
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error === "unavailable" ? "O registro ainda não está disponível neste ambiente. A atualização do banco precisa ser aplicada." : <>Não foi possível carregar o registro. <button type="button" className="text-button" onClick={() => void load(events.length > 0)}>Tentar novamente</button></>}</p>}
      {busy && events.length === 0 && <p className="request-audit-dialog__empty" role="status">Carregando ações…</p>}
      {!busy && !error && visibleEvents.length === 0 && <p className="request-audit-dialog__empty">{actorFilter ? backendFilterAvailable || !hasMore ? "Nenhuma ação desta pessoa neste atendimento." : "Nenhuma ação desta pessoa entre as ações carregadas." : "Nenhuma ação registrada para este atendimento."}</p>}
      {groups.map((group) => <section className="request-audit-dialog__group" key={group.actor.actor_key} aria-label={`Ações de ${group.actor.actor_name}`}><div className="request-audit-dialog__group-heading"><AppIcon name="person" /><strong>{group.actor.actor_name}</strong><em>{group.actor.actor_role === "student" ? "Estudante" : group.actor.actor_role === "cataloger" ? "Bibliotecário(a)" : group.actor.actor_role === "administrator" ? "Administrador(a)" : "Sistema"}</em><span>{group.items.length} {group.items.length === 1 ? "ação carregada" : "ações carregadas"}</span></div><ol className="request-audit-dialog__list">{group.items.map((event) => { const description = actions[event.action]; return <li key={event.event_id}><span className="request-audit-dialog__event-icon" aria-hidden="true"><AppIcon name={description?.icon ?? "review"} /></span><div><strong>{description?.label ?? "Ação registrada"}</strong>{event.field_changes && event.field_changes.length > 0 && <div className="request-audit-dialog__changes">{event.field_changes.map((change, index) => <div className="request-audit-dialog__change" key={`${change.field_key}-${index}`}><b>{change.field_label}</b>{Object.hasOwn(change, "previous_value") && <p><span>Antes</span><span>{displayValue(change.previous_value)}</span></p>}{Object.hasOwn(change, "new_value") && <p><span>{event.action === "request_direct_correction_restored" ? "Restaurado" : "Depois"}</span><span>{displayValue(change.new_value)}</span></p>}{event.action === "request_corrections_submitted" && change.field_key === "public_work_url" && displayValue(change.previous_value) === displayValue(change.new_value) && <small>Acesso confirmado pelo estudante sem mudar o endereço.</small>}</div>)}</div>}</div><time dateTime={event.occurred_at}>{fullDate.format(new Date(event.occurred_at))}</time></li>; })}</ol></section>)}
      {hasMore && <div className="request-audit-dialog__footer"><button className="button button--secondary button--small request-audit-dialog__more" type="button" disabled={busy} onClick={() => void load(true)}>{busy ? "Carregando…" : "Carregar ações anteriores"}</button></div>}
      </div>
    </dialog>
  </>;
}
