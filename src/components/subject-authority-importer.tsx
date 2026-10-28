"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuthorityImportPreview } from "./authority-import-preview";
import { AppIcon } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";
import { createClient } from "@/lib/supabase/client";
import { authorityImportError, normalizeSubjectLabel, type SubjectCatalogueMatch } from "@/lib/subject-authority";
import type { AuthorityPreview, AuthoritySource } from "@/lib/authority-preview";
export type ImportedSubject = SubjectCatalogueMatch & { source_code: string; reused: boolean };
export function SubjectAuthorityImporter({ source, requestId, onImported, onClose }: { source: AuthoritySource; requestId?: string; onImported?: (term: ImportedSubject) => void; onClose: () => void }) {
 const content = useRef<HTMLElement>(null);
 const dialog = useRef<HTMLDialogElement>(null); const titleId = useId(); const [mounted, setMounted] = useState(false);
 useEffect(() => { setMounted(true); }, []);
 useEffect(() => { if (!mounted) return; const element = dialog.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, [mounted]);
 const [step, setStep] = useState(1);
 useEffect(() => { const heading = dialog.current?.querySelector<HTMLElement>("[data-authority-step-heading]"); heading?.focus({ preventScroll: true }); content.current?.scrollTo({ top: 0 }); }, [step]);
 const [record, setRecord] = useState<AuthorityPreview | null>(null);
 const [label, setLabel] = useState(""); const [english, setEnglish] = useState(""); const [identifier, setIdentifier] = useState("");
 const [reviewComplete, setReviewComplete] = useState(false);
 const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
 const [candidate, setCandidate] = useState<SubjectCatalogueMatch | null>(null); const [linkConfirmed, setLinkConfirmed] = useState(false);
 const [done, setDone] = useState(false);
 const changeRecord = (r: AuthorityPreview | null) => { setRecord(r); setReviewComplete(false); setLabel(r?.labels.find(l => l.language?.startsWith("pt"))?.value ?? ""); setEnglish(""); setIdentifier(r?.identifier ?? ""); setConfirmed(false); setCandidate(null); setLinkConfirmed(false); setError(""); setDone(false); };
 async function save() {
  if (!record || confirmationPending || busy || done) return;
  setBusy(true); setError("");
  try {
   const client = createClient();
   const search = await client.rpc("search_subject_catalogue", { search_text: normalizeSubjectLabel(label) });
   if (search.error) throw search.error;
   const exact = (search.data as SubjectCatalogueMatch[]).find(t => t.preferred_label_pt.toLocaleLowerCase("pt-BR") === normalizeSubjectLabel(label).toLocaleLowerCase("pt-BR"));
   if (exact && (!candidate || candidate.id !== exact.id || !linkConfirmed)) { setCandidate(exact); setLinkConfirmed(false); setError("Esse texto já existe no catálogo. Confira abaixo antes de vincular a autoridade."); return; }
   const result = await client.rpc("import_subject_authority", { authority_record: { ...record, identifier: identifier.trim() }, label_pt: label, label_en: english || null, existing_term_id: exact?.id ?? null, target_request_id: requestId ?? null });
   if (result.error) throw result.error;
   setDone(true); onImported?.(result.data as ImportedSubject);
  } catch (e) { setError(authorityImportError(e && typeof e === "object" && "message" in e ? String(e.message) : "")); }
  finally { setBusy(false); }
 }
 const obsolete = record?.warnings.some(w => /excluído|obsoleto|descontinuada/i.test(w));
 const confirmationPending = obsolete ? "Use uma autoridade vigente" : !reviewComplete ? "Confira as pendências da leitura" : !identifier.trim() ? "Informe o identificador na fonte" : label.trim().length < 2 ? "Informe o termo em português" : label.length > 120 || english.length > 120 ? "Use até 120 caracteres em cada termo" : candidate && !linkConfirmed ? "Confirme o vínculo com o assunto existente" : !confirmed ? "Confirme a revisão dos dados" : "";
 if (!mounted) return null;
 return createPortal(<dialog ref={dialog} className="pronto-modal subject-authority-dialog" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><header className="catalogue-modal__header"><div><p className="eyebrow">Catálogo de assuntos</p><h2 id={titleId} className="authority-import-wizard__title"><AppIcon name="download" />Importar autoridade</h2></div><ModalCloseButton onClick={onClose} disabled={busy} label="Fechar importação" /></header><section ref={content} className="subject-authority-importer catalogue-workflow" aria-label="Revisão da autoridade">
  <ol className="authority-import-wizard__steps" aria-label="Etapas da importação">{[{title:"Fonte",icon:"globe" as const},{title:"Texto ou arquivo",icon:"document" as const},{title:"Conferência",icon:"search" as const},{title:"Confirmação",icon:"review" as const}].map((item,index) => <li key={item.title} aria-current={step === index+1 ? "step" : undefined} className={step > index+1 ? "is-complete" : ""}><span>{step > index+1 ? <AppIcon name="check" /> : <AppIcon name={item.icon} />}</span><div><small>Etapa {index+1}</small><strong>{item.title}</strong></div></li>)}</ol>
  <AuthorityImportPreview disabled={busy} initialSource={source} onRecordChange={changeRecord} onReviewChange={setReviewComplete} step={step} onStepChange={setStep} onContinue={() => setStep(4)} />
  {step === 4 && record && !done && <section className="subject-authority-importer__confirmation catalogue-workflow__section"><header className="catalogue-workflow__wide"><h3 className="authority-import-wizard__title" data-authority-step-heading tabIndex={-1}><AppIcon name="review" />Confirme a importação</h3><p>Confirme o identificador e a forma em português. Cadastros com o mesmo texto exigem conferência do vínculo.</p></header>
   <label className="catalogue-workflow__wide"><span className="catalogue-field-label"><AppIcon name="link" />Identificador na fonte</span><input value={identifier} disabled={busy} onChange={e => {setIdentifier(e.target.value); setConfirmed(false);}} maxLength={1000} /><span className="field-help">Se ausente no arquivo, copie o identificador da página oficial. Não use um código inventado.</span></label>
   <label><span className="catalogue-field-label"><AppIcon name="tag" />Termo preferido em português, verificado na fonte</span><input value={label} disabled={busy} onChange={e => {setLabel(e.target.value); setCandidate(null); setConfirmed(false);}} maxLength={120} /><span className="field-help">Confira a forma em português na fonte. O sistema não traduz nem presume o idioma do MARC.</span></label>
   <label><span className="catalogue-field-label"><AppIcon name="globe" />Equivalente em inglês (opcional)</span><input value={english} disabled={busy} onChange={e => {setEnglish(e.target.value); setConfirmed(false);}} maxLength={120} /></label>
   {candidate && <label className="checkbox-choice"><input type="checkbox" checked={linkConfirmed} disabled={busy} onChange={e => setLinkConfirmed(e.target.checked)} />Conferi o assunto existente “{candidate.preferred_label_pt}” e confirmo que esta autoridade corresponde ao mesmo conceito. Os rótulos existentes serão preservados.</label>}
   <label className="checkbox-choice"><input type="checkbox" checked={confirmed} disabled={busy || obsolete} onChange={e => setConfirmed(e.target.checked)} />Conferi a fonte, o identificador, o termo em português, as notas e os alertas; confirmo sua adequação ao catálogo.</label>
   {obsolete && <p role="alert">Registro indicado como obsoleto ou excluído. Consulte uma autoridade vigente para novos usos.</p>}

  </section>}
  {error && <p role="alert" className="notice notice--error">{error}</p>}{done && <p role="status">Autoridade importada ou reutilizada. O catálogo preserva os dados e a origem; a ficha continua sujeita ao salvamento e à conferência.</p>}
  {step === 4 && record && !done && <footer className="catalogue-workflow__actions"><button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => setStep(3)}><AppIcon name="undo" />Voltar: conferência</button><button type="button" className="button button--primary button--small" disabled={busy || !!confirmationPending} onClick={save}><AppIcon name={confirmationPending ? "help" : "check"} />{busy ? "Importando…" : confirmationPending || (requestId ? "Importar e adicionar ao assunto" : "Confirmar importação")}</button></footer>}
 </section></dialog>, document.body);
}
