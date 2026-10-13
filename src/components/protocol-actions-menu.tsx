"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app-icon";
import { RequestPriorityControl } from "@/components/request-priority-control";
import { RequestTimelineDialog, type TimelineEvent } from "@/components/request-timeline";
import { createClient } from "@/lib/supabase/client";
import { RequestAuditLogDialog } from "@/components/request-audit-log-dialog";
import { showPanelChange } from "@/components/panel-change-toast";
import { ModalCloseButton } from "@/components/modal-close-button";

type StaffOption = { id: string; fullName: string };

export function ProtocolActionsMenu({ requestId, workUrl, timelineEvents, priorityReasonCode = null, priorityReasonDetail = null, canSetPriority = true, canRevisit = false, showAnalysisNotes = false, canRelease = false, canReassign = false, staff = [], assignedTo = null }: {
  requestId: string;
  workUrl?: string | null;
  timelineEvents?: TimelineEvent[];
  priorityReasonCode?: string | null;
  priorityReasonDetail?: string | null;
  canSetPriority?: boolean;
  canRevisit?: boolean;
  showAnalysisNotes?: boolean;
  canRelease?: boolean;
  canReassign?: boolean;
  staff?: StaffOption[];
  assignedTo?: string | null;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmingRelease, setConfirmingRelease] = useState(false);
  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      const menu = menuRef.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);
  async function release() {
    setBusy(true); setError("");
    const { error: rpcError } = await createClient().rpc("release_cataloging_request", { target_request_id: requestId });
    setBusy(false);
    if (rpcError) { setError("Não foi possível liberar o atendimento."); return; }
    setConfirmingRelease(false);
    showPanelChange("Atendimento liberado para a fila");
    router.push("/painel/fila"); router.refresh();
  }
  async function reassign(targetStaffId: string) {
    if (!targetStaffId) return;
    setBusy(true); setError("");
    const { error: rpcError } = await createClient().rpc("reassign_cataloging_request", { target_request_id: requestId, target_staff_id: targetStaffId });
    setBusy(false);
    if (rpcError) { setError(assignedTo ? "Não foi possível reatribuir o atendimento." : "Não foi possível atribuir o atendimento."); return; }
    showPanelChange("Atendimento atribuído");
    router.push("/painel/fila"); router.refresh();
  }
  return <><details ref={menuRef} className="protocol-actions-menu"><summary aria-label="Ações gerais do protocolo" title="Ações gerais do protocolo"><AppIcon name="settings" /></summary><div className="protocol-actions-menu__panel" role="group" aria-label="Ações gerais do protocolo">{workUrl && <a className="protocol-actions-menu__item" href={workUrl} target="_blank" rel="noopener noreferrer"><AppIcon name="external" />Abrir trabalho completo</a>}<RequestTimelineDialog events={timelineEvents} requestId={timelineEvents ? undefined : requestId} menuItem /><RequestAuditLogDialog requestId={requestId} />{canSetPriority && <RequestPriorityControl requestId={requestId} initialReasonCode={priorityReasonCode} initialReasonDetail={priorityReasonDetail} menuItem />}{showAnalysisNotes && <button className="protocol-actions-menu__item" type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); window.dispatchEvent(new Event("request-analysis:open-notes")); }}><AppIcon name="document" />Anotações da análise</button>}{canRevisit && <Link className="protocol-actions-menu__item protocol-actions-menu__revisit" href={`/painel/atendimento/${requestId}?rever=1`} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); window.dispatchEvent(new Event("request-analysis:revisit")); }}><AppIcon name="review" />Rever declarações</Link>}{canRelease && <button className="protocol-actions-menu__item" type="button" disabled={busy} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setError(""); setConfirmingRelease(true); }}><AppIcon name="queue" />Liberar atendimento para a fila</button>}{canReassign && <label className="protocol-actions-menu__reassign"><span><AppIcon name="person" />{assignedTo ? "Reatribuir para outro bibliotecário" : "Atribuir a um bibliotecário"}</span><select defaultValue="" disabled={busy} onChange={(event) => reassign(event.target.value)}><option value="">Escolha um bibliotecário</option>{staff.filter((person) => person.id !== assignedTo).map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label>}{error && <p className="form-error" role="alert">{error}</p>}</div></details>
    {confirmingRelease && createPortal(<div className="protocol-release-confirmation pronto-modal-overlay" onKeyDown={(event) => { if (event.key === "Escape" && !busy) setConfirmingRelease(false); }}><section className="protocol-release-confirmation__card pronto-modal-surface" role="dialog" aria-modal="true" aria-labelledby="protocol-release-title" aria-describedby="protocol-release-description"><ModalCloseButton onClick={() => setConfirmingRelease(false)} disabled={busy} /><header className="request-priority-control__heading"><span className="timeline-dialog__icon" aria-hidden="true"><AppIcon name="queue" /></span><div><p className="eyebrow">Organização da fila</p><h2 id="protocol-release-title">Liberar atendimento para a fila?</h2></div></header><p id="protocol-release-description">O protocolo ficará disponível na fila para outro profissional assumir. Você deixará de ser o responsável pelo atendimento.</p>{error && <p className="auth-feedback auth-feedback--error" role="alert">{error}</p>}<footer className="protocol-release-confirmation__actions"><button className="button button--secondary" type="button" disabled={busy} onClick={() => setConfirmingRelease(false)}>Cancelar</button><button className="button button--primary button--with-icon" type="button" disabled={busy} onClick={release}><AppIcon name="queue" />{busy ? "Liberando…" : "Liberar para a fila"}</button></footer></section></div>, document.body)}</>;
}
