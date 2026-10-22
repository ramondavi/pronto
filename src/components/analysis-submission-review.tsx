"use client";

import { AppIcon } from "@/components/app-icon";

type Group = { id: string; title: string; status: string; complete: boolean; tab: "metadata" | "cataloging" | "review" | "documentation"; target: string; items: { label: string; value: string }[] };
export function AnalysisSubmissionReview({ groups }: { groups: Group[] }) {
  const pending = groups.filter((group) => !group.complete);
  function navigate(group: Group) { window.dispatchEvent(new CustomEvent("request-analysis:navigate", { detail: { tab: group.tab, fieldId: group.target } })); }
  function render(group: Group) {
    return <details className="analysis-submission-group" key={group.id} open={!group.complete}><summary><AppIcon name={group.complete ? "check" : "review"} /><span><strong>{group.title}</strong><small>{group.status}</small></span></summary><dl>{group.items.map((item, index) => <div key={`${item.label}-${index}`}><dt>{item.label}</dt><dd>{item.value || "Não informado"}</dd></div>)}</dl><button className="button button--secondary button--small" type="button" onClick={() => navigate(group)}>Ir à conferência deste grupo<AppIcon name="arrowRight" /></button></details>;
  }
  return <section className="panel analysis-submission-review"><h2>Revisão do trabalho enviado</h2><p>Confira o conjunto dos dados e retome a etapa correspondente para revisar. Este resumo acompanha a análise; a homologação continua sendo uma decisão da Biblioteca.</p><div className={`review-action-summary review-action-summary--${pending.length ? "pending" : "ok"}`}><AppIcon name={pending.length ? "review" : "check"} /><span><strong>{pending.length ? `${pending.length} grupos com conferência pendente` : "Conferências concluídas"}</strong></span></div>{pending.map(render)}{groups.some((group) => group.complete) && <details className="analysis-submission-completed"><summary>Grupos conferidos ({groups.length - pending.length})</summary>{groups.filter((group) => group.complete).map(render)}</details>}</section>;
}
