"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppIcon } from "./app-icon";
import { RelativeDateTime } from "./relative-date-time";
import { ModalCloseButton } from "./modal-close-button";
import { useInterfaceLanguage } from "./interface-language";
import { uiText } from "@/lib/ui-text";

export type TimelineEvent = { event_key?: string; key?: string; label: string; occurred_at: string };

const protocolMilestones = [
  { key: "request_submitted", label: "Solicitação aberta" },
  { key: "service_started", label: "Atendimento iniciado" },
  { key: "card_homologated", label: "Ficha catalográfica homologada" },
  { key: "nada_uploaded", label: "Nada Consta enviado" },
  { key: "nada_approved", label: "Nada Consta validado" },
  { key: "card_released", label: "Ficha liberada ao estudante" },
  { key: "repository_started", label: "Autodepósito no RI/UFBA iniciado" },
  { key: "repository_verified", label: "Publicação no RI/UFBA verificada" },
  { key: "request_completed", label: "Protocolo encerrado" },
];

export function RequestTimeline({ events, showHeading = true, highlightCurrent = false }: { events: TimelineEvent[]; showHeading?: boolean; highlightCurrent?: boolean }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const eventLabel = (event: TimelineEvent) => {
    const key = event.event_key ?? event.key ?? "";
    const round = key.match(/^(changes_requested|corrections_sent)_(\d+)$/);
    if (round) return uiText(language, round[1] === "changes_requested" ? "Correções solicitadas — rodada {number}" : "Correções reenviadas — rodada {number}", { number: round[2] });
    return t(event.label);
  };
  const currentEvent = events.reduce<TimelineEvent | null>((latest, event) => !latest || new Date(event.occurred_at).getTime() >= new Date(latest.occurred_at).getTime() ? event : latest, null);
  const recordedKeys = new Set(events.map((event) => event.event_key ?? event.key));
  const canceled = recordedKeys.has("request_canceled");
  const latestNadaEvent = events.filter((event) => (event.event_key ?? event.key)?.startsWith("nada_")).at(-1);
  const needsNewNadaConsta = Boolean((latestNadaEvent?.event_key ?? latestNadaEvent?.key)?.startsWith("nada_rejected"));
  const future = canceled ? [] : protocolMilestones.flatMap((milestone) => {
    if (milestone.key === "nada_approved" && needsNewNadaConsta) return [{ key: "nada_resubmitted", label: "Novo Nada Consta enviado" }, milestone];
    return recordedKeys.has(milestone.key) ? [] : [milestone];
  });
  return <section className="panel protocol-timeline">{showHeading && <><p className="eyebrow">{t("Linha do tempo")}</p><h2>{t("Histórico completo do protocolo")}</h2></>}<ol>{events.map((event) => <li className={highlightCurrent && event === currentEvent ? "protocol-timeline__current" : "protocol-timeline__done"} key={`${event.event_key ?? event.key}-${event.occurred_at}`}><span aria-hidden="true" /><div><strong>{eventLabel(event)}</strong>{highlightCurrent && event === currentEvent && <small>{t("Marco atual do atendimento")}</small>}<RelativeDateTime value={event.occurred_at} /></div></li>)}{future.map((milestone) => <li className="protocol-timeline__future" key={milestone.key}><span aria-hidden="true" /><div><strong>{t(milestone.label)}</strong><small>{t("Etapa ainda não realizada")}</small></div></li>)}</ol></section>;
}

export function RequestTimelineDialog({ events = [], requestId, menuItem = false }: { events?: TimelineEvent[]; requestId?: string; menuItem?: boolean }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [loadedEvents, setLoadedEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState("");
  async function open() {
    setError("");
    if (requestId) {
      const result = await createClient().rpc("request_timeline", { target_request_id: requestId });
      if (result.error) { setError(t("Não foi possível carregar o histórico.")); return; }
      setLoadedEvents((result.data ?? []) as TimelineEvent[]);
    }
    dialogRef.current?.showModal();
  }
  return <><button className={menuItem ? "protocol-actions-menu__item" : "button button--secondary button--small button--with-icon"} type="button" onClick={open}><AppIcon name="calendar" />{t("Ver histórico do atendimento")}</button>{error && <span className="form-error" role="alert">{error}</span>}<dialog className="timeline-dialog pronto-modal" ref={dialogRef} aria-label={t("Histórico do atendimento")}><div className="timeline-dialog__header"><span className="timeline-dialog__icon" aria-hidden="true"><AppIcon name="calendar" /></span><div><p className="eyebrow">{t("Histórico do atendimento")}</p><h2>{t("Marcos do protocolo")}</h2></div><ModalCloseButton onClick={() => dialogRef.current?.close()} /></div><RequestTimeline events={loadedEvents ?? events} showHeading={false} highlightCurrent /></dialog></>;
}
