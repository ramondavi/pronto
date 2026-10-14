"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FinalDecisionDialog } from "@/components/final-decision-dialog";
import { ModalCloseButton } from "@/components/modal-close-button";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { RichTextEditor } from "@/components/rich-text-editor";
import { CitationInlineEditor } from "@/components/citation-inline-editor";
import { dismissPanelChange, showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";

type IssueTemplate = { id: string; code: string; label: string; message: string };
export type ReviewField = { key: string; label: string; value: string; multiline?: boolean };
type IssueDetail = { templateId: string; freeJustification: string };
type StudentCorrection = { field_key: string; previous_value: unknown; corrected_value: unknown; submitted_at: string };
type AnalysisDraft = { sourceValues: Record<string, string>; values: Record<string, string>; validated: string[]; selectedFields: string[]; issueDetails: Record<string, IssueDetail>; citation: string; studentReply: string };

const generalIssueCodes = new Set(["required_missing", "work_mismatch", "incomplete_information", "format_standardization"]);
const personIssueFields = new Set(["author", "advisor", "coadvisor"]);

function templateFitsField(templateCode: string, fieldKey: string) {
  if (fieldKey === "public_work_url") return templateCode === "public_link_unavailable" || templateCode === "required_missing";
  if (templateCode === "title_page_name") return personIssueFields.has(fieldKey);
  if (fieldKey === "subtitle" || fieldKey === "equivalent_title") return templateCode !== "required_missing" && generalIssueCodes.has(templateCode);
  return generalIssueCodes.has(templateCode);
}

function fieldIcon(key: string): AppIconName {
  if (key.includes("author") || key.includes("advisor") || key.includes("committee")) return "person";
  if (key.includes("keyword") || key.includes("subject")) return "tag";
  if (key.includes("url")) return "link";
  return "document";
}

function formatPreviousValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(" · ") : "não informado";
  if (value === null || value === undefined || value === "") return "não informado";
  return String(value);
}

function valueForInput(value: unknown) {
  if (Array.isArray(value)) return value.join("\n");
  if (value === null || value === undefined) return "";
  return String(value);
}

export function RequestAnalysisWorkspace({ requestId, initialAnalysisNotes, initialInternalNote, initialReviewCompletedAt, initialCorrectionBaselines, initialDraft, studentCorrections, suggestedCitation, initialCitation, citationValidatedAt, citationCurrent, editable, citationEditable = editable, templates, fields, studentMessage, initialStudentReply, studentReplySentAt }: { requestId: string; initialAnalysisNotes: string; initialInternalNote: string; initialSavedAt: string | null; initialReviewCompletedAt: string | null; initialCorrectionBaselines: Record<string, unknown>; initialDraft: unknown; studentCorrections: StudentCorrection[]; suggestedCitation: string | null; initialCitation: string | null; citationValidatedAt: string | null; citationCurrent: boolean; editable: boolean; citationEditable?: boolean; templates: IssueTemplate[]; fields: ReviewField[]; studentMessage?: string | null; initialStudentReply?: string | null; studentReplySentAt?: string | null }) {
  const router = useRouter();
  const draft = !initialReviewCompletedAt && initialDraft && typeof initialDraft === "object" ? initialDraft as Partial<AnalysisDraft> : null;
  const sourceValues = Object.fromEntries(fields.map((field) => [field.key, field.value]));
  const restorableKeys = new Set(fields.filter((field) => draft?.sourceValues?.[field.key] === field.value || draft?.values?.[field.key] === field.value).map((field) => field.key));
  const draftSourceCurrent = fields.every((field) => restorableKeys.has(field.key));
  const [analysisNotes, setAnalysisNotes] = useState(initialAnalysisNotes);
  const internalNote = initialInternalNote;
  const [values, setValues] = useState(() => ({ ...sourceValues, ...Object.fromEntries(Object.entries(draft?.values ?? {}).filter(([key, value]) => restorableKeys.has(key) && typeof value === "string")) }));
  const [validated, setValidated] = useState<string[]>(() => Array.isArray(draft?.validated) ? draft.validated.filter((key) => restorableKeys.has(key)) : []);
  const [corrected, setCorrected] = useState<string[]>(() => Object.keys(initialCorrectionBaselines));
  const [originalValues, setOriginalValues] = useState<Record<string, unknown>>(initialCorrectionBaselines);
  const [editing, setEditing] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>(() => Array.isArray(draft?.selectedFields) ? draft.selectedFields.filter((key) => restorableKeys.has(key)) : []);
  const [issueDetails, setIssueDetails] = useState<Record<string, IssueDetail>>(() => Object.fromEntries(Object.entries(draft?.issueDetails ?? {}).filter(([key]) => restorableKeys.has(key))));
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [returning, setReturning] = useState(false);
  const [adjustmentsSent, setAdjustmentsSent] = useState(false);
  const [reviewCompletedAt, setReviewCompletedAt] = useState<string | null>(initialReviewCompletedAt);
  const [citation, setCitation] = useState(initialCitation && citationCurrent ? initialCitation : draftSourceCurrent ? draft?.citation ?? suggestedCitation ?? "" : suggestedCitation ?? "");
  const [citationApproved, setCitationApproved] = useState(Boolean(citationValidatedAt && citationCurrent));
  useEffect(() => { const invalidate = () => setCitationApproved(false); window.addEventListener("request-analysis:citation-invalidate", invalidate); return () => window.removeEventListener("request-analysis:citation-invalidate", invalidate); }, []);
  useEffect(() => { const update = (event: Event) => { const suggested = (event as CustomEvent<{ suggested: string | null }>).detail?.suggested; setCitationApproved(false); if (suggested) setCitation(suggested); }; window.addEventListener("request-analysis:citation-source-changed", update); return () => window.removeEventListener("request-analysis:citation-source-changed", update); }, []);
  const [citationSaving, setCitationSaving] = useState(false);
  const [citationError, setCitationError] = useState("");
  const [resetting, setResetting] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [restoringField, setRestoringField] = useState<string | null>(null);
  const [confirmingRestoreField, setConfirmingRestoreField] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [actionsTarget, setActionsTarget] = useState<Element | null>(null);
  const [summaryTarget, setSummaryTarget] = useState<Element | null>(null);
  const [citationTarget, setCitationTarget] = useState<Element | null>(null);
  const [studentMessageTarget, setStudentMessageTarget] = useState<Element | null>(null);
  const [studentReply, setStudentReply] = useState(initialStudentReply ?? (draftSourceCurrent ? draft?.studentReply : null) ?? "");
  const [savedStudentReply, setSavedStudentReply] = useState(initialStudentReply ?? "");
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySaved, setReplySaved] = useState(false);
  const savedText = useRef({ analysisNotes: initialAnalysisNotes, internalNote: initialInternalNote });
  const currentAnalysisNotes = useRef(initialAnalysisNotes);
  const noteEditStart = useRef<string | null>(null);
  const pendingNoteNotice = useRef<{ previous: string; saved: string } | null>(null);
  const [undoingAutoSave, setUndoingAutoSave] = useState(false);
  const analysisDraftSnapshot = JSON.stringify({ sourceValues, values, validated, selectedFields, issueDetails, citation, studentReply });
  const savedAnalysisDraft = useRef(initialDraft ? JSON.stringify(initialDraft) : "");
  const analysisDraftQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!ready || !editable || reviewCompletedAt || savedAnalysisDraft.current === analysisDraftSnapshot) return;
    const timer = window.setTimeout(() => {
      const snapshot = analysisDraftSnapshot;
      analysisDraftQueue.current = analysisDraftQueue.current.catch(() => undefined).then(async () => {
        const { error } = await createClient().rpc("save_request_analysis_draft", { target_request_id: requestId, draft_payload: JSON.parse(snapshot) });
        if (error) { showPanelChangeError("Análise não salva", "Não foi possível salvar os campos no banco. Confira a conexão e tente novamente."); return; }
        savedAnalysisDraft.current = snapshot;
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [analysisDraftSnapshot, editable, ready, requestId, reviewCompletedAt]);
  useEffect(() => {
    if (!ready || !editable || reviewCompletedAt || studentReply === savedStudentReply || studentReply.length > 8000) return;
    const timer = window.setTimeout(() => { void saveStudentReply(true); }, 700);
    return () => window.clearTimeout(timer);
  }, [studentReply, savedStudentReply, ready, editable, reviewCompletedAt]);
  useEffect(() => setActionsTarget(document.getElementById("request-analysis-actions-end")), []);
  useEffect(() => { window.dispatchEvent(new CustomEvent("request-analysis:pending-adjustments", { detail: { pending: editable && selectedFields.length > 0 } })); }, [editable, selectedFields]);
  useEffect(() => { const openNotes = () => setNotesOpen(true); window.addEventListener("request-analysis:open-notes", openNotes); return () => window.removeEventListener("request-analysis:open-notes", openNotes); }, []);
  useEffect(() => {
    const advance = () => {
      if (selectedFields.length > 0 && editable) return;
      if (!editable || reviewCompletedAt || adjustmentsSent) {
        window.dispatchEvent(new CustomEvent("request-analysis:navigate", { detail: { tab: "cataloging" } }));
        return;
      }
      if (studentReply !== savedStudentReply) {
        showPanelChangeError("Resposta ainda não guardada", "Aguarde o salvamento automático da resposta antes de validar os metadados.");
        return;
      }
      setConfirmingCompletion(true);
    };
    window.addEventListener("request-analysis:advance-metadata", advance);
    return () => window.removeEventListener("request-analysis:advance-metadata", advance);
  }, [editable, reviewCompletedAt, adjustmentsSent, selectedFields.length, studentReply, savedStudentReply]);
  useEffect(() => setSummaryTarget(document.getElementById("request-analysis-summary-end")), []);
  useEffect(() => setCitationTarget(document.getElementById("request-analysis-citation-end")), []);
  useEffect(() => setStudentMessageTarget(document.getElementById("preanalysis-student-message")), []);
  useEffect(() => { window.dispatchEvent(new CustomEvent("request-analysis:citation-status", { detail: { ready: citationApproved } })); }, [citationApproved]);
  useEffect(() => {
    if (!ready || !editable) return;
    if (analysisNotes === savedText.current.analysisNotes && internalNote === savedText.current.internalNote) return;
    setState("saving");
    const timer = window.setTimeout(async () => {
      const { error } = await createClient().rpc("save_request_analysis", { target_request_id: requestId, analysis_notes_value: analysisNotes, internal_note_value: internalNote });
      if (error) { setState("error"); showPanelChangeError("Registro não salvo", "Confira a conexão e tente novamente. O texto permanece na tela."); } else {
        savedText.current = { analysisNotes, internalNote };

        setState("saved");
        const notice = pendingNoteNotice.current;
        if (notice && notice.saved === analysisNotes && currentAnalysisNotes.current === analysisNotes) {
          pendingNoteNotice.current = null;
          showPanelChange("Registro salvo automaticamente", () => undoAutoSave({ analysisNotes: notice.previous, internalNote }, { analysisNotes, internalNote }));
        }
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [analysisNotes, internalNote, requestId, ready, editable]);

  async function undoAutoSave(previous: { analysisNotes: string; internalNote: string }, saved: { analysisNotes: string; internalNote: string }) {
    if (currentAnalysisNotes.current !== saved.analysisNotes || savedText.current.internalNote !== saved.internalNote) throw new Error("O registro mudou após este salvamento.");
    setUndoingAutoSave(true);
    const { error } = await createClient().rpc("save_request_analysis", { target_request_id: requestId, analysis_notes_value: previous.analysisNotes, internal_note_value: previous.internalNote });
    setUndoingAutoSave(false);
    if (error) { setState("error"); throw error; }
    savedText.current = previous;
    currentAnalysisNotes.current = previous.analysisNotes;
    setAnalysisNotes(previous.analysisNotes);

    setState("saved");
    showPanelChange("Salvamento desfeito");
  }

  function confirmField(fieldKey: string) {
    const wasValidated = validated.includes(fieldKey);
    const wasPending = selectedFields.includes(fieldKey);
    if (wasValidated && !wasPending) return;
    setValidated((current) => current.includes(fieldKey) ? current : [...current, fieldKey]);
    setSelectedFields((current) => current.filter((key) => key !== fieldKey));
    showPanelChange("Campo marcado como conferido", () => {
      setValidated((current) => wasValidated ? current.includes(fieldKey) ? current : [...current, fieldKey] : current.filter((item) => item !== fieldKey));
      setSelectedFields((current) => wasPending ? current.includes(fieldKey) ? current : [...current, fieldKey] : current.filter((item) => item !== fieldKey));
    });
  }

  async function correct(fieldKey: string) {
    const field = fields.find((item) => item.key === fieldKey);
    const raw = values[fieldKey] ?? "";
    const correctedValue = field?.multiline && fieldKey.startsWith("keywords_") ? raw.split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean) : raw;
    const originalValue = field?.multiline && fieldKey.startsWith("keywords_") ? (field.value ?? "").split(/\r?\n|;/).map((item) => item.trim()).filter(Boolean) : field?.value ?? "";
    if (JSON.stringify(correctedValue) === JSON.stringify(originalValue)) {
      setEditing((current) => current.filter((key) => key !== fieldKey));
      setState("idle");
      return;
    }
    setState("saving");
    const { error } = await createClient().rpc("staff_correct_request_field", { target_request_id: requestId, field_key_value: fieldKey, corrected_value: correctedValue });
    if (error) { setState("error"); showPanelChangeError("Campo não salvo", "Confira o valor informado e tente novamente."); return; }
    setEditing((current) => current.filter((key) => key !== fieldKey));
    setValidated((current) => current.includes(fieldKey) ? current : [...current, fieldKey]);
    setCorrected((current) => current.includes(fieldKey) ? current : [...current, fieldKey]);
    setOriginalValues((current) => current[fieldKey] === undefined ? { ...current, [fieldKey]: originalValue } : current);

    if (["title", "subtitle", "author", "academic_program_id"].includes(fieldKey)) { setCitationApproved(false); router.refresh(); }
    setState("saved");
    showPanelChange("Alteração do campo salva");
  }
  async function resetDirectCorrections() {
    setResetting(true); setState("saving");
    const { error } = await createClient().rpc("reset_direct_request_corrections", { target_request_id: requestId });
    if (error) { setState("error"); showPanelChangeError("Correções não restauradas", "Atualize os dados do atendimento e tente novamente."); setResetting(false); setConfirmingReset(false); return; }
    setConfirmingReset(false);
    showPanelChange("Correções diretas restauradas");
    router.refresh();
  }
  async function restoreCorrection(fieldKey: string) {
    const valueBeforeRestore = values[fieldKey];
    setRestoringField(fieldKey); setState("saving");
    const { error } = await createClient().rpc("restore_direct_request_correction", { target_request_id: requestId, field_key_value: fieldKey });
    if (error) { setState("error"); showPanelChangeError("Campo não restaurado", "Atualize os dados do atendimento e tente novamente."); setRestoringField(null); setConfirmingRestoreField(null); return; }
    const originalValue = originalValues[fieldKey];
    setValues((current) => ({ ...current, [fieldKey]: valueForInput(originalValue) }));
    setCorrected((current) => current.filter((key) => key !== fieldKey));
    setValidated((current) => current.filter((key) => key !== fieldKey));
    setOriginalValues((current) => { const next = { ...current }; delete next[fieldKey]; return next; });
    setRestoringField(null); setConfirmingRestoreField(null); setState("saved");
    if (["title", "subtitle", "author", "academic_program_id"].includes(fieldKey)) { setCitationApproved(false); router.refresh(); }
    showPanelChange("Valor do estudante restaurado", async () => {
      const { error: undoError } = await createClient().rpc("staff_correct_request_field", { target_request_id: requestId, field_key_value: fieldKey, corrected_value: valueBeforeRestore });
      if (undoError) throw undoError;
      setValues((current) => ({ ...current, [fieldKey]: valueBeforeRestore }));
      setCorrected((current) => current.includes(fieldKey) ? current : [...current, fieldKey]);
      router.refresh();
    });
  }
  async function validateCitation() {
    setCitationSaving(true); setCitationError("");
    const { error } = await createClient().rpc("validate_request_citation", { target_request_id: requestId, citation_value: citation });
    if (error) { setCitationError("Não foi possível validar a referência. Confira os dados e tente novamente."); showPanelChangeError("Referência não validada", "Confira os dados da referência e tente novamente."); }
    else { setCitationApproved(true); showPanelChange("Referência validada"); }
    setCitationSaving(false);
  }
  async function saveStudentReply(quiet = false) {
    if (studentReply.length > 8000) { setReplyError("A resposta está longa demais. Reduza o texto antes de guardar."); return; }
    setReplySaving(true); setReplyError("");
    const replyContent = studentReply.replace(/<[^>]+>/g, "").trim() ? studentReply : "";
    const { error } = await createClient().rpc("save_student_message_reply", { target_request_id: requestId, reply_text: replyContent });
    if (error) { setReplyError("Não foi possível guardar a resposta. Tente novamente."); showPanelChangeError("Resposta não guardada", "Confira a conexão e tente novamente antes de avançar."); }
    else { setSavedStudentReply(studentReply); setReplySaved(true); if (!quiet) showPanelChange("Resposta guardada"); window.dispatchEvent(new CustomEvent("request-analysis:reply-pending", { detail: { pending: false } })); }
    setReplySaving(false);
  }
  async function completeReview() {
    setCompleting(true); setState("saving");
    const { data, error } = await createClient().rpc("complete_request_analysis", { target_request_id: requestId });
    if (error) { setState("error"); showPanelChangeError("Metadados não validados", "Confira as pendências da análise e tente novamente."); setCompleting(false); return; }
    setReviewCompletedAt(data); setCompleting(false); setState("saved");
    showPanelChange("Metadados validados");
    window.dispatchEvent(new CustomEvent("request-analysis:navigate", { detail: { tab: "cataloging" } }));
    router.refresh();
  }
  async function returnForCorrections() {
    if (!canReturn) return;
    setConfirmingReturn(false);
    setReturning(true);
    const issues = selectedFields.map((fieldKey) => {
      const detail = issueDetails[fieldKey];
      const observation = detail?.freeJustification.trim() ?? "";
      return { fieldKey, templateId: detail?.templateId ?? "", freeJustification: detail?.templateId && observation ? `Observação complementar: ${observation}` : observation };
    });
    const { error } = await createClient().rpc("return_request_for_corrections", { target_request_id: requestId, issues });
    if (error) { setState("error"); showPanelChangeError("Ajustes não enviados", "Confira a orientação de cada campo e tente novamente."); setReturning(false); return; }
    setSelectedFields([]);
    setAdjustmentsSent(true);
    setReturning(false);
    showPanelChange("Solicitação de ajustes enviada");
    router.refresh();
  }

  const returnFields = fields.filter((field) => selectedFields.includes(field.key));
  const missingReturnFields = returnFields.filter((field) => !(issueDetails[field.key]?.templateId || issueDetails[field.key]?.freeJustification.trim()));
  const canReturn = returnFields.length > 0 && missingReturnFields.length === 0;
  const hasRequestedAdjustments = selectedFields.length > 0;
  const actions = <>{editable && hasRequestedAdjustments && <section className="review-action-panel"><h3>Há ajustes para o estudante</h3><button className="button button--danger" type="button" disabled={returning || !canReturn} onClick={() => setConfirmingReturn(true)}><span>Enviar ao estudante para correção ({selectedFields.length}){!canReturn && <small>Inclua uma justificativa para cada campo.</small>}</span></button></section>}{confirmingReturn && <div className="analysis-return-confirmation pronto-modal-overlay" role="alertdialog" aria-modal="true" aria-labelledby="return-confirmation-title" aria-describedby="return-confirmation-description">
  <div className="analysis-return-confirmation__card pronto-modal-surface">
    <ModalCloseButton onClick={() => setConfirmingReturn(false)} disabled={returning} />
    <header className="analysis-return-confirmation__heading">
      <span className="timeline-dialog__icon" aria-hidden="true"><AppIcon name="message" /></span>
      <div><p className="eyebrow">Confirmação necessária</p><h2 id="return-confirmation-title">Enviar pedido de ajustes?</h2></div>
    </header>
    <p id="return-confirmation-description">O estudante receberá por e-mail as orientações abaixo para corrigir {returnFields.length === 1 ? "o campo selecionado" : "os campos selecionados"}.</p>
    <section className="analysis-return-confirmation__summary" aria-label="Orientações que serão enviadas">
      <strong>{returnFields.length === 1 ? "Campo selecionado" : `${returnFields.length} campos selecionados`}</strong>
      <ul>{returnFields.map((field) => {
        const detail = issueDetails[field.key];
        const templateMessage = templates.find((template) => template.id === detail?.templateId)?.message;
        return <li key={field.key}><strong>{field.label}</strong>{templateMessage && <p>{templateMessage}</p>}{detail?.freeJustification.trim() && <p>{templateMessage && <strong>Observação complementar: </strong>}{detail.freeJustification.trim()}</p>}</li>;
      })}</ul>
    </section>
    <p className="analysis-return-confirmation__note"><AppIcon name="work" />O protocolo permanece com você. A catalogação pode ser adiantada enquanto o estudante responde; a validação e a liberação aguardam a conferência das correções.</p>
    <footer className="analysis-return-confirmation__actions"><button className="button button--secondary" type="button" disabled={returning} onClick={() => setConfirmingReturn(false)}>Voltar à análise</button><button className="button button--primary button--with-icon" type="button" disabled={returning || !canReturn} onClick={returnForCorrections}><AppIcon name="message" />{returning ? "Enviando…" : "Confirmar envio"}</button></footer>
  </div>
</div>}{confirmingReset && <FinalDecisionDialog title="Limpar correções diretas?" description="Os campos alterados diretamente nesta análise voltarão aos valores enviados pelo estudante. A restauração ficará registrada no histórico." confirmLabel="Limpar correções" confirmDanger busy={resetting} onCancel={() => setConfirmingReset(false)} onConfirm={() => void resetDirectCorrections()} />}{confirmingCompletion && <FinalDecisionDialog title="Validar metadados e seguir?" description="A revisão dos metadados será registrada e você seguirá para a catalogação da ficha." confirmLabel="Confirmar validação" busy={completing} onCancel={() => setConfirmingCompletion(false)} onConfirm={completeReview} />}</>;
  const renderField = (field: ReviewField) => {
      const isEditing = editing.includes(field.key); const isPending = selectedFields.includes(field.key); const isValidated = validated.includes(field.key); const isCorrected = corrected.includes(field.key); const detail = issueDetails[field.key] ?? { templateId: "", freeJustification: "" };
      const studentCorrection = studentCorrections.find((item) => item.field_key === field.key && !isCorrected && valueForInput(item.corrected_value) === values[field.key]);
      return <article id={`review-field-${field.key}`} tabIndex={0} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === "Enter" && editable && !isEditing && field.key !== "public_work_url") { event.preventDefault(); confirmField(field.key); } else if (event.key === "ArrowDown" || event.key === "ArrowUp") { const cards = Array.from(document.querySelectorAll<HTMLElement>(".analysis-workspace__main .field-review")); const next = cards[cards.indexOf(event.currentTarget) + (event.key === "ArrowDown" ? 1 : -1)]; if (next) { event.preventDefault(); next.focus(); } } }} className={`field-review ${isValidated ? "field-review--valid" : ""} ${isCorrected ? "field-review--corrected" : ""} ${isPending ? "field-review--invalid" : ""} ${studentCorrection && !isValidated ? "field-review--student-corrected" : ""}`} key={field.key}>
        <div className="field-review__value"><span><AppIcon name={fieldIcon(field.key)} />{field.label}</span>{studentCorrection && <span className="field-review__student-badge"><AppIcon name="edit" />Reenviado pelo estudante</span>}{isEditing ? field.multiline ? <textarea autoFocus rows={3} value={values[field.key]} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setEditing((current) => current.filter((key) => key !== field.key)); } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void correct(field.key); } }} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /> : <input autoFocus value={values[field.key]} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void correct(field.key); } else if (event.key === "Escape") { event.preventDefault(); setEditing((current) => current.filter((key) => key !== field.key)); } }} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))} /> : <strong>{values[field.key] || "—"}</strong>}{studentCorrection && <p className="field-review__student-previous"><strong>Antes da correção:</strong> {formatPreviousValue(studentCorrection.previous_value)}{!isValidated && <small>Confira o valor reenviado antes de validá-lo.</small>}</p>}{isCorrected && <div className="field-review__previous-value"><p><strong>Informação anterior — corrigida e sem validade:</strong> {formatPreviousValue(originalValues[field.key])}</p>{editable && <button className="button button--secondary button--small" type="button" disabled={restoringField === field.key} onClick={() => setConfirmingRestoreField(field.key)}><AppIcon name="review" />{restoringField === field.key ? "Restaurando…" : "Restaurar esta informação"}</button>}</div>}</div>
        {editable && <div className="field-review__actions">{isEditing ? <><button className="button button--small field-review__action--editing" type="button" onClick={() => correct(field.key)}><AppIcon name="check" />Salvar alteração</button><button className="text-action" type="button" onClick={() => setEditing((current) => current.filter((key) => key !== field.key))}><AppIcon name="close" />Descartar</button></> : <>{field.key !== "public_work_url" && <><button className={`button button--secondary button--small field-review__action--validate ${isCorrected ? "field-review__action--corrected" : isValidated ? "field-review__action--valid" : ""}`} type="button" onClick={() => confirmField(field.key)}><AppIcon name="check" />{isCorrected ? "Alterado" : "Está correto"}</button><button className="button button--secondary button--small field-review__action--edit" type="button" onClick={() => { dismissPanelChange(); setEditing((current) => [...current, field.key]); }}><AppIcon name="edit" />Editar dado</button></>}<button className={`button button--secondary button--small field-review__action--request ${isPending ? "field-review__action--invalid" : ""}`} type="button" onClick={() => { dismissPanelChange(); if (field.key === "public_work_url") window.dispatchEvent(new CustomEvent("request-analysis:link-blocked", { detail: { blocked: !isPending } })); setSelectedFields((current) => field.key === "public_work_url" ? current.includes(field.key) ? [] : [field.key] : current.includes(field.key) ? current.filter((key) => key !== field.key) : [...current, field.key]); setValidated((current) => current.filter((key) => key !== field.key)); }}><AppIcon name="message" />Pedir ajuste</button></>}</div>}
        {isPending && <div className="field-review__issue"><p>O estudante verá esta orientação para ajustar <strong>{field.label.toLocaleLowerCase("pt-BR")}</strong>.</p><label>Modelo de mensagem<select value={detail.templateId} onChange={(event) => setIssueDetails((current) => ({ ...current, [field.key]: { ...detail, templateId: event.target.value } }))}><option value="">Escrever uma mensagem</option>{templates.filter((template) => templateFitsField(template.code, field.key)).map((template) => <option value={template.id} key={template.id}>{template.label}</option>)}</select></label><label>Orientação complementar<textarea rows={2} maxLength={2000} value={detail.freeJustification} onChange={(event) => setIssueDetails((current) => ({ ...current, [field.key]: { ...detail, freeJustification: event.target.value } }))} placeholder={detail.templateId ? "Opcional: informe detalhes específicos" : "Obrigatório: explique o ajuste necessário"} /></label></div>}
      </article>;
    };
  const metadataValidated = Boolean(reviewCompletedAt) && selectedFields.length === 0;
  const reviewedCount = fields.filter((field) => validated.includes(field.key) || corrected.includes(field.key) || selectedFields.includes(field.key)).length;
  const pendingFields = fields.filter((field) => selectedFields.includes(field.key));
  const uncheckedFields = fields.filter((field) => !selectedFields.includes(field.key) && !validated.includes(field.key) && !corrected.includes(field.key));
  const checkedFields = fields.filter((field) => !selectedFields.includes(field.key) && (validated.includes(field.key) || corrected.includes(field.key)));
  const metadataSummary = <section className="review-cataloging-summary analysis-metadata-summary"><div className="review-cataloging-summary__heading"><div><strong>Metadados do estudante</strong><span>{selectedFields.length ? `${selectedFields.length} ajuste(s) marcado(s)` : metadataValidated ? "Metadados validados" : "Nenhum ajuste marcado"}</span></div><span className={selectedFields.length ? "review-cataloging-summary__status" : metadataValidated ? "review-cataloging-summary__status is-ready" : "review-cataloging-summary__status"}>{selectedFields.length ? "Ação necessária" : metadataValidated ? "Concluído" : "Aguardando validação"}</span></div>{selectedFields.length ? <div className="review-cataloging-pending"><strong>Antes de liberar a ficha, envie estes ajustes ao estudante:</strong><ul>{returnFields.map((field) => <li key={field.key}><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("request-analysis:navigate", { detail: { tab: "metadata", fieldId: `review-field-${field.key}` } }))}><span>Metadados</span>{field.label}<b aria-hidden="true">→</b></button></li>)}</ul></div> : <p className="field-help">Nenhum ajuste marcado.</p>}</section>;

  const citationBlock = <section className="panel analysis-citation"><div><h2><AppIcon name="book" />Referência do trabalho</h2><p>Confira o texto e ajuste o negrito, se necessário.</p></div>{suggestedCitation ? <><CitationInlineEditor value={citation} editable={citationEditable} onChange={(next) => { setCitation(next); setCitationApproved(false); }} /><div className="analysis-citation__footer"><span className={citationApproved ? "review-cataloging-summary__status is-ready" : "review-cataloging-summary__status"}>{citationApproved ? "Referência validada" : "Aguardando validação"}</span>{citationEditable && <button className="button button--secondary button--small" type="button" disabled={citationSaving || citation.trim().length < 20} onClick={validateCitation}><AppIcon name="check" />{citationSaving ? "Validando…" : citationApproved ? "Revalidar referência" : "Validar referência"}</button>}</div>{citationError && <p className="form-error" role="alert">{citationError}</p>}</> : <p className="field-help">Faltam dados essenciais ou este programa ainda não tem modelo aprovado para gerar a referência.</p>}</section>;
  return <><section className="analysis-workspace">
    <div className="analysis-workspace__heading"><div><h2>Dados do trabalho</h2><p>Confira os dados enviados pelo estudante antes de validar ou pedir ajustes.</p></div><span className="sr-only" role="status">{state === "error" ? "Não foi possível salvar. Verifique os dados ou a conexão." : state === "saving" ? "Salvando alterações" : ""}</span></div>
    <div className="analysis-workspace__layout"><div className="analysis-workspace__main">
      {pendingFields.length > 0 && <section className="analysis-field-group analysis-field-group--pending"><h3><AppIcon name="message" /> Ajustes solicitados <span>{pendingFields.length}</span></h3><div className="field-review-list">{pendingFields.map(renderField)}</div></section>}
      {uncheckedFields.length > 0 && <section className="analysis-field-group"><h3><AppIcon name="review" /> Por conferir <span>{uncheckedFields.length}</span></h3><div className="field-review-list">{uncheckedFields.map(renderField)}</div></section>}
      {checkedFields.length > 0 && <section className="analysis-field-group analysis-field-group--checked"><h3><AppIcon name="check" /> Conferidos <span>{checkedFields.length}</span></h3><div className="field-review-list">{checkedFields.map(renderField)}</div></section>}

    </div><aside className="analysis-workspace__sidebar" aria-label="Resumo e encaminhamento"><div className="analysis-workspace__summary-panel"><h3>Resumo da conferência</h3>
    <div className="analysis-review-overview" aria-label="Resumo da conferência"><div><AppIcon name="check" /><span><strong>{reviewedCount} de {fields.length}</strong> campos sinalizados</span></div><div><AppIcon name="message" /><span><strong>{selectedFields.length}</strong> {selectedFields.length === 1 ? "ajuste solicitado" : "ajustes solicitados"}</span></div><div><AppIcon name="document" /><span><strong>{uncheckedFields.length}</strong> {uncheckedFields.length === 1 ? "campo por conferir" : "campos por conferir"}</span></div></div>
      {editable && corrected.length > 0 && <div className="analysis-workspace__correction-tools"><div><strong>Correções diretas</strong><small>Restaure os valores enviados pelo estudante para os campos alterados nesta análise.</small></div><button className="button button--secondary button--small" type="button" disabled={resetting || completing} onClick={() => setConfirmingReset(true)}><AppIcon name="close" />Limpar correções diretas</button></div>}
      <div id="request-analysis-actions-end" /></div>
    </aside></div>
  </section>{notesOpen && createPortal(<div className="analysis-notes-dialog pronto-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="analysis-notes-title"><div className="analysis-notes-dialog__card pronto-modal-surface"><ModalCloseButton onClick={() => setNotesOpen(false)} /><p className="eyebrow">Visível somente à equipe</p><h2 id="analysis-notes-title">Anotações da análise</h2><p className="field-help">Registre os critérios, decisões e pendências desta revisão.</p><label className="analysis-workspace__notes">Registro<textarea rows={8} maxLength={20000} value={analysisNotes} onFocus={() => { noteEditStart.current = analysisNotes; pendingNoteNotice.current = null; }} onBlur={() => { const previous = noteEditStart.current; noteEditStart.current = null; if (previous === null || previous === analysisNotes) return; pendingNoteNotice.current = { previous, saved: analysisNotes }; if (savedText.current.analysisNotes === analysisNotes) { pendingNoteNotice.current = null; showPanelChange("Registro salvo automaticamente", () => undoAutoSave({ analysisNotes: previous, internalNote }, { analysisNotes, internalNote })); } }} onChange={(event) => { currentAnalysisNotes.current = event.target.value; pendingNoteNotice.current = null; dismissPanelChange(); setAnalysisNotes(event.target.value); }} disabled={!editable || undoingAutoSave} placeholder="Critérios e decisões desta revisão" /></label>{internalNote.trim() && <aside className="legacy-internal-note"><strong>Recado interno anterior</strong><p>{internalNote}</p></aside>}<button className="button button--secondary" type="button" onClick={() => setNotesOpen(false)}>Fechar</button></div></div>, document.body)}{studentMessage?.trim() && studentMessageTarget ? createPortal(<details className="student-message-note"><summary><AppIcon name="message" /><span><strong>Mensagem do estudante</strong><small>{replySaved ? "Resposta guardada" : "Ver mensagem e responder"}</small></span></summary><div className="student-message-note__body"><p className="student-message-note__original">{studentMessage}</p><div className="student-message-note__reply"><strong>Resposta ao estudante</strong><RichTextEditor variant="reply" value={studentReply} editable={editable && !reviewCompletedAt && !studentReplySentAt} onChange={(html) => { setStudentReply(html); setReplySaved(false); setReplyError(""); window.dispatchEvent(new CustomEvent("request-analysis:reply-pending", { detail: { pending: html !== savedStudentReply } })); }} /><p className="field-help">{studentReplySentAt ? "Resposta enviada por e-mail." : reviewCompletedAt ? "A etapa de resposta foi encerrada com a validação dos metadados." : "A resposta é salva automaticamente e será enviada por e-mail quando os metadados forem validados e o protocolo avançar."}</p>{editable && !reviewCompletedAt && !studentReplySentAt && replyError && <button className="button button--secondary button--small" type="button" disabled={replySaving || studentReply === savedStudentReply} onClick={() => void saveStudentReply()}><AppIcon name="check" />{replySaving ? "Salvando…" : "Tentar salvar agora"}</button>}{replySaved && !replyError && <p className="student-message-note__saved" role="status"><AppIcon name="check" /> Resposta guardada. O estudante receberá o e-mail quando a análise avançar.</p>}{studentReply !== savedStudentReply && <p className="field-help">Salvando a resposta automaticamente. Aguarde antes de avançar.</p>}{replyError && <p className="form-error" role="alert">{replyError}</p>}</div></div></details>, studentMessageTarget) : null}{citationTarget ? createPortal(citationBlock, citationTarget) : null}{actionsTarget && actions ? createPortal(actions, actionsTarget) : null}{summaryTarget ? createPortal(metadataSummary, summaryTarget) : null}{confirmingRestoreField && <FinalDecisionDialog title="Restaurar informação do estudante?" description={`O campo ${fields.find((field) => field.key === confirmingRestoreField)?.label ?? "selecionado"} voltará ao valor informado pelo estudante. A restauração ficará registrada no histórico.`} confirmLabel="Restaurar campo" busy={restoringField !== null} onCancel={() => setConfirmingRestoreField(null)} onConfirm={() => void restoreCorrection(confirmingRestoreField)} />}</>;
}
