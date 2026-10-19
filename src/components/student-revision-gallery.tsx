"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { AppIcon } from "@/components/app-icon";
import { RelativeDateTime } from "@/components/relative-date-time";
import { splitGuidance } from "@/domain/issues/split-guidance";
import { useInterfaceLanguage } from "@/components/interface-language";
import { uiText } from "@/lib/ui-text";

export type StudentRevision = {
  id: string;
  round_number: number;
  returned_at: string;
  responded_at: string | null;
  issues: { field_key: string; field_label: string; justification: string; original_value: unknown }[];
  corrections: { field_key: string; corrected_value: unknown; submitted_at: string }[];
};

function formatValue(value: unknown, empty: string) {
  if (Array.isArray(value)) return value.join(" · ");
  if (value === null || value === undefined || value === "") return empty;
  return String(value);
}

export function StudentRevisionGallery({ revisions }: { revisions: StudentRevision[] }) {
  const { language } = useInterfaceLanguage();
  const t = (source: string, values?: Record<string, string | number>) => uiText(language, source, values);
  const [active, setActive] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const multiple = revisions.length > 1;
  const goTo = (next: number) => setActive(Math.max(0, Math.min(revisions.length - 1, next)));
  useEffect(() => {
    const card = viewportRef.current?.querySelectorAll<HTMLElement>(".revision-card")[active];
    if (!card) return;
    const updateHeight = () => setViewportHeight(Math.ceil(card.getBoundingClientRect().height) + 2);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(card);
    const completedStage = viewportRef.current?.closest("details");
    completedStage?.addEventListener("toggle", updateHeight);
    return () => { observer.disconnect(); completedStage?.removeEventListener("toggle", updateHeight); };
  }, [active, revisions]);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      goTo(active + (event.key === "ArrowRight" ? 1 : -1));
    }
  };

  return <section className="revision-history" aria-labelledby="revision-history-title" onKeyDown={onKeyDown}>
    <div className="revision-history__heading"><span className="revision-history__icon"><AppIcon name="review" /></span><div><p className="eyebrow">{t("Registro da solicitação")}</p><h2 id="revision-history-title">{t("Devoluções e correções")}</h2></div><span className="revision-history__count">{revisions.length} {t(revisions.length === 1 ? "rodada" : "rodadas")}</span></div>
    <div className="revision-gallery">
      {multiple && <button className="revision-gallery__arrow revision-gallery__arrow--previous" type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label={t("Ver rodada anterior")}><AppIcon name="arrowRight" /></button>}
      <div className="revision-gallery__viewport" ref={viewportRef} style={{ height: viewportHeight ?? undefined }}>
        <div className="revision-gallery__track" style={{ transform: `translateX(-${active * 100}%)` } as CSSProperties}>
          {revisions.map((revision, index) => <article className="revision-card" key={revision.id} aria-hidden={index !== active} inert={index !== active}>
            <header className="revision-card__header"><div className="revision-card__identity"><span>{t("Rodada {number} de {total}", { number: revision.round_number, total: revisions.length })}</span><h3>{revision.issues.length} {t(revision.issues.length === 1 ? "campo solicitado" : "campos solicitados")}</h3></div><span className={revision.responded_at ? "revision-state revision-state--done" : "revision-state"}><AppIcon name={revision.responded_at ? "check" : "edit"} />{t(revision.responded_at ? "Correção enviada" : "Aguardando sua correção")}</span></header>
            <div className="revision-card__dates"><span><AppIcon name="calendar" />{t("Pedido da biblioteca:")} <RelativeDateTime value={revision.returned_at} focusable={false} /></span>{revision.responded_at && <span><AppIcon name="check" />{t("Sua resposta:")} <RelativeDateTime value={revision.responded_at} focusable={false} /></span>}</div>
            <ol className="revision-card__issues">{revision.issues.map((issue) => { const correction = revision.corrections.find((item) => item.field_key === issue.field_key); const guidance = splitGuidance(issue.justification); return <li className="revision-issue" key={issue.field_key}><div className="revision-issue__title"><AppIcon name="edit" /><h4>{t(issue.field_label)}</h4></div><div className="revision-issue__guidance"><AppIcon name="message" /><div><strong>{t("Orientação da biblioteca")}</strong>{guidance.standard && <p>{t(guidance.standard)}</p>}{guidance.observation && <div className="revision-issue__observation"><strong>{t("Observação complementar")}</strong><p>{guidance.observation}</p></div>}</div></div>{correction && <div className="revision-issue__answer"><AppIcon name="check" /><div><strong>{t("Informação reenviada")}</strong><p>{formatValue(correction.corrected_value, t("campo deixado em branco"))}</p></div></div>}</li>; })}</ol>
          </article>)}
        </div>
      </div>
      {multiple && <button className="revision-gallery__arrow revision-gallery__arrow--next" type="button" onClick={() => goTo(active + 1)} disabled={active === revisions.length - 1} aria-label={t("Ver próxima rodada")}><AppIcon name="arrowRight" /></button>}
    </div>
    {multiple && <nav className="revision-gallery__pagination" aria-label={t("Ir para uma rodada")}>{revisions.map((revision, index) => <button className={index === active ? "is-active" : ""} type="button" key={revision.id} onClick={() => goTo(index)} aria-label={t("Ir para a rodada {number}", { number: revision.round_number })} aria-current={index === active ? "step" : undefined}><span /></button>)}</nav>}
  </section>;
}
