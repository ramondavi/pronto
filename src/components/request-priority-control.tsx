"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { ModalCloseButton } from "./modal-close-button";
import { AppIcon } from "./app-icon";

export const priorityReasons: Record<string, string> = {
  institutional_deadline: "Prazo institucional próximo",
  urgent_correction: "Correção urgente após devolução",
  coordination_request: "Demanda da coordenação",
  other_documented: "Outro motivo documentado",
};

export function RequestPriorityControl({ requestId, initialReasonCode, initialReasonDetail, menuItem = false, compact = false }: {
  requestId: string; initialReasonCode: string | null; initialReasonDetail: string | null; menuItem?: boolean; compact?: boolean;
}) {
  const router = useRouter();
  const [savedCode, setSavedCode] = useState(initialReasonCode);
  const [savedDetail, setSavedDetail] = useState(initialReasonDetail);
  const [reasonCode, setReasonCode] = useState(initialReasonCode ?? "");
  const [reasonDetail, setReasonDetail] = useState(initialReasonDetail ?? "");
  const [editing, setEditing] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => { setSavedCode(initialReasonCode); setSavedDetail(initialReasonDetail); setReasonCode(initialReasonCode ?? ""); setReasonDetail(initialReasonDetail ?? ""); }, [initialReasonCode, initialReasonDetail]);
  useEffect(() => {
    const openFromBadge = (event: Event) => {
      if ((event as CustomEvent<{ requestId: string }>).detail?.requestId !== requestId) return;
      setConfirmingRemoval(false);
      setError("");
      setEditing(true);
    };
    window.addEventListener("request-priority:open", openFromBadge);
    return () => window.removeEventListener("request-priority:open", openFromBadge);
  }, [requestId]);

  function closeDialog() {
    setReasonCode(savedCode ?? "");
    setReasonDetail(savedDetail ?? "");
    setError("");
    setConfirmingRemoval(false);
    setEditing(false);
  }

  function save(code: string | null) {
    setError("");
    if (code === "other_documented" && reasonDetail.trim().length < 10) {
      setError("Descreva o motivo em pelo menos 10 caracteres.");
      return;
    }
    startTransition(async () => {
      const previousCode = savedCode;
      const previousDetail = savedDetail;
      const detail = code === "other_documented" ? reasonDetail.trim() : null;
      const { error: saveError } = await createClient().rpc("set_request_priority", {
        target_request_id: requestId, selected_reason_code: code, selected_reason_detail: detail,
      });
      if (saveError) { setError("Não foi possível atualizar a prioridade. Tente novamente."); showPanelChangeError("Prioridade não salva", "Confira a conexão e tente novamente."); return; }
      setSavedCode(code);
      setSavedDetail(detail);
      setReasonCode(code ?? "");
      setReasonDetail(detail ?? "");
      setConfirmingRemoval(false);
      setEditing(false);
      showPanelChange(code ? "Prioridade salva" : "Prioridade retirada", async () => {
        const { error: undoError } = await createClient().rpc("set_request_priority", { target_request_id: requestId, selected_reason_code: previousCode, selected_reason_detail: previousDetail });
        if (undoError) throw undoError;
        setSavedCode(previousCode); setSavedDetail(previousDetail); setReasonCode(previousCode ?? ""); setReasonDetail(previousDetail ?? ""); router.refresh();
      });
      router.refresh();
    });
  }

  return <div className="request-priority-control" aria-label="Prioridade do atendimento">
    <button className={menuItem || compact ? "protocol-actions-menu__item" : `button button--small button--with-icon ${savedCode ? "request-priority-control__button--active" : "button--secondary"}`} type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setConfirmingRemoval(false); setEditing(true); setError(""); }} aria-haspopup="dialog" aria-label={savedCode ? "Atendimento prioritário. Alterar prioridade" : "Marcar como prioritário"} title={savedCode ? `Prioritário: ${priorityReasons[savedCode] ?? "motivo registrado"}. Clique para alterar.` : undefined}><AppIcon name="star" />{savedCode ? "Alterar prioridade" : "Marcar como prioritário"}</button>
    {editing && createPortal(<div className="request-priority-control__overlay pronto-modal-overlay" onKeyDown={(event) => { if (event.key === "Escape" && !pending) closeDialog(); }}><section className={`request-priority-control__dialog pronto-modal-surface${confirmingRemoval ? " is-removing" : ""}`} role="dialog" aria-modal="true" aria-labelledby={`priority-dialog-title-${requestId}`} aria-describedby={`priority-dialog-description-${requestId}`}>
      <ModalCloseButton onClick={closeDialog} disabled={pending} />
      <header className="request-priority-control__heading"><span className="timeline-dialog__icon" aria-hidden="true"><AppIcon name={confirmingRemoval ? "close" : "star"} /></span><div><p className="eyebrow">Organização da fila</p><h2 id={`priority-dialog-title-${requestId}`}>{confirmingRemoval ? "Retirar prioridade?" : savedCode ? "Alterar prioridade" : "Marcar como prioritário"}</h2></div></header>
      <p id={`priority-dialog-description-${requestId}`} className="request-priority-control__description">{confirmingRemoval ? "O protocolo voltará à ordenação normal da fila. A retirada ficará registrada para a equipe." : "Defina o motivo para destacar este protocolo na fila. A marca é visível somente para a equipe."}</p>
      {!confirmingRemoval && <>{savedCode && <div className="request-priority-control__current"><span>Prioridade atual</span><strong>{priorityReasons[savedCode] ?? "Motivo registrado"}</strong>{savedDetail && <p>{savedDetail}</p>}<button className="request-priority-control__remove" type="button" disabled={pending} onClick={() => setConfirmingRemoval(true)}>Retirar prioridade</button></div>}
      <div className="request-priority-control__form"><label>Motivo da prioridade<select autoFocus value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} required><option value="">Selecione o motivo</option>{Object.entries(priorityReasons).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      {reasonCode === "other_documented" && <label>Detalhe do motivo<textarea value={reasonDetail} onChange={(event) => setReasonDetail(event.target.value)} minLength={10} maxLength={500} rows={2} placeholder="Explique a necessidade de prioridade" required /><small>Informe pelo menos 10 caracteres.</small></label>}</div></>}
      {error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}
      <footer className="request-priority-control__actions"><div><button className="button button--secondary" type="button" disabled={pending} onClick={confirmingRemoval ? () => setConfirmingRemoval(false) : closeDialog}>Cancelar</button>{confirmingRemoval ? <button className="button button--danger button--with-icon" type="button" disabled={pending} onClick={() => save(null)}><AppIcon name="close" />{pending ? "Retirando…" : "Retirar prioridade"}</button> : <button className="button button--primary button--with-icon" type="button" disabled={pending || !reasonCode || (reasonCode === "other_documented" && reasonDetail.trim().length < 10)} onClick={() => save(reasonCode)}><AppIcon name="star" />{pending ? "Salvando…" : savedCode ? "Salvar alterações" : "Marcar prioridade"}</button>}</div></footer>
    </section></div>, document.body)}
  </div>;
}
