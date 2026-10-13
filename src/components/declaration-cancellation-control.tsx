"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FinalDecisionDialog } from "@/components/final-decision-dialog";
import { AppIcon } from "@/components/app-icon";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";

const declarations = [
  { key: "defense_approval", label: "O trabalho foi defendido e aprovado por banca." },
  { key: "final_file", label: "O arquivo disponibilizado é completo e final." },
  { key: "approval_page", label: "O arquivo contém ata, página ou folha de aprovação datada e assinada por todos os membros da banca." },
];

export function DeclarationCancellationControl({ requestId, publicWorkUrl, initiallyReviewed, initiallyLinkVerified, waitingForStudent, replyPending = false, onContinue, onBack }: { requestId: string; publicWorkUrl: string; initiallyReviewed: boolean; initiallyLinkVerified: boolean; waitingForStudent: boolean; replyPending?: boolean; onContinue: () => void; onBack?: () => void }) {
  const router = useRouter();
  const [reviews, setReviews] = useState<Record<string, "fulfilled" | "failed">>(() => initiallyReviewed ? Object.fromEntries(declarations.map((item) => [item.key, "fulfilled" as const])) : {});
  const failed = declarations.filter((item) => reviews[item.key] === "failed").map((item) => item.key);
  const allReviewed = declarations.every((item) => Boolean(reviews[item.key]));
  const [confirming, setConfirming] = useState<"continue" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [linkVerified, setLinkVerified] = useState(initiallyLinkVerified);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [requestingAdjustment, setRequestingAdjustment] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState("access");
  const [adjustmentDetail, setAdjustmentDetail] = useState("");

  async function verifyLink() {
    setLinkBusy(true); setLinkError("");
    const { error: rpcError } = await createClient().rpc("confirm_public_work_link", { target_request_id: requestId });
    setLinkBusy(false);
    if (rpcError) { setLinkError("Não foi possível registrar a conferência do link. Tente novamente."); showPanelChangeError("Conferência do link não salva", "Confira o acesso ao arquivo e tente novamente."); return; }
    setLinkVerified(true);
    showPanelChange("Acesso ao arquivo confirmado");
    router.refresh();
  }
  async function requestLinkAdjustment() {
    setLinkBusy(true); setLinkError("");
    const guidance = adjustmentReason === "wrong_file" ? "O link abre um arquivo diferente do trabalho final informado." : adjustmentReason === "missing" ? "O link não abre o arquivo do trabalho." : "O arquivo não está compartilhado para leitura pela biblioteca.";
    const { error: rpcError } = await createClient().rpc("return_request_for_corrections", { target_request_id: requestId, issues: [{ fieldKey: "public_work_url", templateId: "", freeJustification: `${guidance} ${adjustmentDetail.trim()}`.trim() }] });
    setLinkBusy(false);
    if (rpcError) { setLinkError("Não foi possível pedir o ajuste do link. Tente novamente."); showPanelChangeError("Pedido de ajuste não enviado", "Confira a orientação e tente novamente."); return; }
    setRequestingAdjustment(false);
    setLinkVerified(false);
    showPanelChange("Pedido de ajuste enviado");
    router.refresh();
  }

  async function cancelRequest() {
    setBusy(true);
    setError(false);
    const { error: rpcError } = await createClient().rpc("cancel_request_for_failed_declaration", { target_request_id: requestId, failed_declarations: failed, explanation: "" });
    if (rpcError) { setError(true); showPanelChangeError("Cancelamento não registrado", "Atualize o atendimento e tente novamente."); setBusy(false); setConfirming(null); return; }
    showPanelChange("Protocolo cancelado");
    router.push("/painel/fila");
    router.refresh();
  }
  async function continueAnalysis() {
    if (replyPending) return;
    setBusy(true);
    setError(false);
    const { error: rpcError } = await createClient().rpc("confirm_request_declarations", { target_request_id: requestId });
    setBusy(false);
    setConfirming(null);
    if (rpcError) { setError(true); showPanelChangeError("Declarações não confirmadas", "Confira as respostas e o link antes de tentar novamente."); return; }
    showPanelChange("Declarações conferidas");
    onContinue();
    router.refresh();
  }

  return <section className="panel declaration-review" aria-label="Conferência das declarações do estudante">
    <h2>Declarações e acesso ao trabalho</h2>
    <section className="declaration-link-check" aria-labelledby="declaration-link-title"><div className="declaration-link-check__heading"><AppIcon name="link" /><div><h3 id="declaration-link-title">Acesso ao trabalho completo</h3><p>Abra o trabalho e confirme o acesso ao arquivo correto.</p></div></div><a href={publicWorkUrl} target="_blank" rel="noopener noreferrer">Abrir arquivo do trabalho <AppIcon name="external" /></a><p className="declaration-link-check__url">{publicWorkUrl}</p>{waitingForStudent ? <p className="declaration-link-check__waiting"><AppIcon name="lock" /> Aguardando o estudante corrigir o link. A análise ficará disponível após nova conferência.</p> : <div className="declaration-link-check__actions"><span>{linkVerified ? "Link conferido nesta rodada" : "Conferência do link pendente"}</span><button className="button button--secondary button--small" type="button" disabled={linkBusy} onClick={() => setRequestingAdjustment((current) => !current)}>Solicitar ajuste do link</button><button className="button button--success button--small" type="button" disabled={linkBusy || linkVerified} onClick={verifyLink}>{linkBusy ? "Registrando…" : linkVerified ? "Link conferido" : "Confirmar acesso ao arquivo"}</button></div>}{requestingAdjustment && !waitingForStudent && <div className="declaration-link-check__adjustment"><label>Problema encontrado<select value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)}><option value="access">Permissão de acesso insuficiente</option><option value="missing">Arquivo não abre</option><option value="wrong_file">Arquivo diferente do trabalho final</option></select></label><label>Detalhes para o estudante (opcional)<textarea rows={2} maxLength={1000} value={adjustmentDetail} onChange={(event) => setAdjustmentDetail(event.target.value)} /></label><button className="button button--primary button--small" type="button" disabled={linkBusy} onClick={requestLinkAdjustment}>{linkBusy ? "Enviando…" : "Enviar pedido de ajuste"}</button></div>}{linkError && <p className="form-error" role="alert">{linkError}</p>}</section>
    <div className="declarations">{declarations.map((item) => <div className="declaration-review__item" role="group" aria-labelledby={`declaration-label-${item.key}`} key={item.key}><strong id={`declaration-label-${item.key}`}>{item.label}</strong><div className="declaration-review__choices"><label className={reviews[item.key] === "fulfilled" ? "is-selected" : ""}><input type="radio" name={`declaration-${item.key}`} disabled={waitingForStudent} checked={reviews[item.key] === "fulfilled"} onChange={() => setReviews((current) => ({ ...current, [item.key]: "fulfilled" }))} /><AppIcon name="check" />Cumpriu</label><label className={reviews[item.key] === "failed" ? "is-selected is-failed" : ""}><input type="radio" name={`declaration-${item.key}`} disabled={waitingForStudent} checked={reviews[item.key] === "failed"} onChange={() => setReviews((current) => ({ ...current, [item.key]: "failed" }))} /><AppIcon name="close" />Não cumpriu</label></div></div>)}</div>
    {failed.length > 0 && <div className="declaration-review__outcome" role="status"><strong>Cancelamento necessário</strong><p>O estudante será informado sobre {failed.length === 1 ? "a declaração não cumprida" : "as declarações não cumpridas"} por uma mensagem padronizada.</p></div>}
    {replyPending && <p className="field-help" role="status">Guarde a resposta ao estudante antes de seguir para a análise.</p>}{error && <p className="form-error" role="alert">Não foi possível registrar a decisão. Tente novamente.</p>}
    <div className="declaration-review__actions"><span className="declaration-review__progress">{Object.keys(reviews).length} de {declarations.length} declarações avaliadas</span>{onBack && linkVerified && !requestingAdjustment && !replyPending && <button className="text-action" type="button" onClick={onBack}>Descartar revisão e retomar metadados</button>}{!waitingForStudent && failed.length > 0 ? <button className="button button--danger button--with-icon declaration-review__decision" type="button" disabled={busy} onClick={() => setConfirming("cancel")}><AppIcon name="close" />Confirmar cancelamento</button> : !waitingForStudent && allReviewed && linkVerified && !requestingAdjustment ? <button className="button button--success button--with-icon declaration-review__decision" type="button" disabled={busy || replyPending} onClick={() => setConfirming("continue")}><AppIcon name="check" />{initiallyReviewed ? "Salvar revisão e retomar metadados" : "Confirmar e iniciar metadados"}</button> : null}</div>
    {confirming === "cancel" && <FinalDecisionDialog title="Cancelar este protocolo?" description={`O cancelamento será registrado imediatamente. O estudante receberá uma mensagem padronizada informando ${failed.length === 1 ? "qual declaração não foi cumprida" : "quais declarações não foram cumpridas"}. Este protocolo não poderá ser reaberto.`} confirmLabel="Confirmar cancelamento" confirmDanger busy={busy} onCancel={() => setConfirming(null)} onConfirm={cancelRequest} />}
    {confirming === "continue" && <FinalDecisionDialog title={initiallyReviewed ? "Salvar revisão das declarações?" : "Confirmar conferência inicial?"} description="As decisões sobre as declarações e o acesso ao arquivo serão registradas." confirmLabel={initiallyReviewed ? "Salvar e retomar metadados" : "Confirmar e iniciar metadados"} busy={busy} onCancel={() => setConfirming(null)} onConfirm={continueAnalysis} />}
  </section>;
}
