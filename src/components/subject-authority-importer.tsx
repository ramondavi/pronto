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
 const dialog = useRef<HTMLDialogElement>(null); const titleId = useId(); const [mounted, setMounted] = useState(false);
 useEffect(() => { setMounted(true); }, []);
 useEffect(() => { if (!mounted) return; const element = dialog.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, [mounted]);
 const [record, setRecord] = useState<AuthorityPreview | null>(null);
 const [label, setLabel] = useState(""); const [english, setEnglish] = useState(""); const [identifier, setIdentifier] = useState("");
 const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
 const [candidate, setCandidate] = useState<SubjectCatalogueMatch | null>(null); const [linkConfirmed, setLinkConfirmed] = useState(false);
 const [done, setDone] = useState(false);
 const changeRecord = (r: AuthorityPreview | null) => { setRecord(r); setLabel(r?.labels.find(l => l.language?.startsWith("pt"))?.value ?? ""); setEnglish(""); setIdentifier(r?.identifier ?? ""); setConfirmed(false); setCandidate(null); setLinkConfirmed(false); setError(""); setDone(false); };
 async function save() {
  if (!record || !confirmed || busy || done) return;
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
 if (!mounted) return null;
 return createPortal(<dialog ref={dialog} className="pronto-modal subject-authority-dialog" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><h2 id={titleId}>Importar autoridade</h2><ModalCloseButton onClick={onClose} disabled={busy} label="Fechar importação" /><section className="subject-authority-importer" aria-label="Revisão da autoridade">
  <div className="catalogue-form-heading"><AppIcon name="upload" /><div><p>Confira o registro completo antes de cadastrar. Importar não homologa a ficha.</p></div></div>
  <AuthorityImportPreview disabled={busy} initialSource={source} onRecordChange={changeRecord} />
  {record && !done && <div className="subject-authority-importer__confirmation">
   <label><span className="catalogue-field-label"><AppIcon name="link" />Identificador na fonte</span><input value={identifier} disabled={busy} onChange={e => {setIdentifier(e.target.value); setConfirmed(false);}} maxLength={1000} /><span className="field-help">Se ausente no arquivo, copie o identificador da página oficial. Não use um código inventado.</span></label>
   <label><span className="catalogue-field-label"><AppIcon name="tag" />Termo preferido em português, verificado na fonte</span><input value={label} disabled={busy} onChange={e => {setLabel(e.target.value); setCandidate(null); setConfirmed(false);}} maxLength={120} /><span className="field-help">Confira a forma em português na fonte. O sistema não traduz nem presume o idioma do MARC.</span></label>
   <label><span className="catalogue-field-label"><AppIcon name="globe" />Equivalente em inglês (opcional)</span><input value={english} disabled={busy} onChange={e => {setEnglish(e.target.value); setConfirmed(false);}} maxLength={120} /></label>
   {candidate && <label className="checkbox-choice"><input type="checkbox" checked={linkConfirmed} disabled={busy} onChange={e => setLinkConfirmed(e.target.checked)} />Conferi o assunto existente “{candidate.preferred_label_pt}” e confirmo que esta autoridade corresponde ao mesmo conceito. Os rótulos existentes serão preservados.</label>}
   <label className="checkbox-choice"><input type="checkbox" checked={confirmed} disabled={busy || obsolete} onChange={e => setConfirmed(e.target.checked)} />Conferi a fonte, o identificador, o termo em português, as notas e os alertas; confirmo sua adequação ao catálogo.</label>
   {obsolete && <p role="alert">Registro indicado como obsoleto ou excluído. Consulte uma autoridade vigente para novos usos.</p>}
   <button type="button" className="button button--primary button--small" disabled={busy || !confirmed || !identifier.trim() || label.trim().length < 2 || obsolete || (!!candidate && !linkConfirmed)} onClick={save}><AppIcon name="check" />{busy ? "Importando…" : requestId ? "Importar e adicionar ao assunto" : "Confirmar importação"}</button>
  </div>}
  {error && <p role="alert" className="form-error">{error}</p>}{done && <p role="status">Autoridade importada ou reutilizada. O catálogo preserva os dados e a origem; a ficha continua sujeita ao salvamento e à conferência.</p>}
  <button type="button" disabled={busy} className="button button--secondary button--small" onClick={onClose}><AppIcon name="close" />Fechar importação</button>
 </section></dialog>, document.body);
}
