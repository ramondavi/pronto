"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AuthorityImportPreview } from "./authority-import-preview";
import { AppIcon } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";
import { createClient } from "@/lib/supabase/client";
import { authorityImportError, normalizeSubjectLabel, type SubjectCatalogueMatch } from "@/lib/subject-authority";
import { suggestedAuthorityLabels, type AuthorityPreview, type AuthoritySource } from "@/lib/authority-preview";
import { authorityHeadingTag, authorityHeadingTypes, headingTypeByTag, headingTagByKind, type AuthorityHeadingTag } from "@/lib/authority-heading-types";
import { AuthorityPlaceFields, authorityPlaceComplete, emptyAuthorityPlace, saveAuthorityPlace, type AuthorityPlaceDraft } from "./authority-place-fields";
export type ImportedSubject = SubjectCatalogueMatch & { source_code: string; reused: boolean; active?:boolean };
export function SubjectAuthorityImporter({ source, requestId, onImported, onClose }: { source: AuthoritySource; requestId?: string; onImported?: (term: ImportedSubject) => void; onClose: () => void }) {
 const content = useRef<HTMLElement>(null);
 const dialog = useRef<HTMLDialogElement>(null); const titleId = useId(); const [mounted, setMounted] = useState(false);
 useEffect(() => { setMounted(true); }, []);
 useEffect(() => { if (!mounted) return; const element = dialog.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, [mounted]);
 const [step, setStep] = useState(1);
 useEffect(() => { const heading = dialog.current?.querySelector<HTMLElement>("[data-authority-step-heading]"); heading?.focus({ preventScroll: true }); content.current?.scrollTo({ top: 0 }); }, [step]);
 const [record, setRecord] = useState<AuthorityPreview | null>(null);
 const [headingType, setHeadingType] = useState("");
 const [typeReason, setTypeReason] = useState("");
 const [places, setPlaces] = useState<Record<number, AuthorityPlaceDraft>>({});
 const [label, setLabel] = useState(""); const [english, setEnglish] = useState(""); const [identifier, setIdentifier] = useState("");
 const [reviewComplete, setReviewComplete] = useState(false);
 const [confirmed, setConfirmed] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
 const [candidate, setCandidate] = useState<SubjectCatalogueMatch | null>(null); const [linkConfirmed, setLinkConfirmed] = useState(false);
 const [done, setDone] = useState(false);
 const [reused, setReused] = useState(false);
 const changeRecord = (r: AuthorityPreview | null) => { const suggestions = r ? suggestedAuthorityLabels(r) : null; const tag = r ? authorityHeadingTag(r) : null; const nextPlaces: Record<number, AuthorityPlaceDraft> = {}; if (r && (tag === "151" || tag === "181")) nextPlaces[0] = emptyAuthorityPlace(r.components[0]?.value ?? ""); if (r && tag === "110") nextPlaces[-1] = emptyAuthorityPlace(r.fields?.find(f => f.tag === "370")?.subfields?.find(s => s.code === "e")?.value ?? ""); r?.components.forEach((part, index) => { if (index > 0 && part.kind === "Subdivisão geográfica") nextPlaces[index] = emptyAuthorityPlace(part.value); }); setPlaces(nextPlaces); setHeadingType(tag ? headingTypeByTag[tag].kind : ""); setTypeReason(""); setRecord(r); setReviewComplete(false); setLabel(suggestions?.portuguese ?? ""); setEnglish(suggestions?.english ?? ""); setIdentifier(r?.identifier ?? ""); setConfirmed(false); setCandidate(null); setLinkConfirmed(false); setError(""); setDone(false); setReused(false); };
 async function save() {
  if (!record || confirmationPending || busy || done) return;
  setBusy(true); setError("");
  try {
   const client = createClient();
   const search = await client.rpc("search_subject_catalogue", { search_text: normalizeSubjectLabel(label) });
   if (search.error) throw search.error;
   const exact = (search.data as SubjectCatalogueMatch[]).find(t => t.preferred_label_pt.toLocaleLowerCase("pt-BR") === normalizeSubjectLabel(label).toLocaleLowerCase("pt-BR"));
   if (exact && (!candidate || candidate.id !== exact.id || !linkConfirmed)) { setCandidate(exact); setLinkConfirmed(false); setError("Esse texto já existe no catálogo. Confira abaixo antes de vincular a autoridade."); return; }
   const result = await client.rpc("import_subject_authority", { authority_record: { ...record, identifier: identifier.trim(), heading_type: headingType, ...(typeReason.trim() ? { type_reason: typeReason.trim() } : {}), ...(headingType === "corporate" && places[-1]?.placeLabel.trim() ? { associated_place: places[-1].placeLabel.trim() } : {}) }, label_pt: label, label_en: english || null, existing_term_id: exact?.id ?? null, target_request_id: requestId ?? null });
   if (result.error) throw result.error;
   setReused((result.data as ImportedSubject).reused); setDone(true);
   const authorityId = (result.data as ImportedSubject & { authority_id?: string }).authority_id;
   try {
    if (authorityId) for (const [position, place] of Object.entries(places).filter(([position]) => Number(position) === -1 ? headingType === "corporate" : Number(position) === 0 ? ["geographic", "geographic_subdivision"].includes(headingType) : record.components[Number(position)]?.kind === "Subdivisão geográfica")) await saveAuthorityPlace(authorityId, Number(position), place, headingType === "corporate" ? "associated_place" : "same_place");
   } catch { setError("Autoridade importada, mas a localização não foi salva. Revise o ponto na gestão de assuntos."); }
   onImported?.(result.data as ImportedSubject);
  } catch (e) { setError(authorityImportError(e && typeof e === "object" && "message" in e ? String(e.message) : "")); }
  finally { setBusy(false); }
 }
 const obsolete = record?.warnings.some(w => /excluído|obsoleto|descontinuada/i.test(w));
 const originalTag = record ? authorityHeadingTag(record) : null;
 const confirmationPending = obsolete ? "Use uma autoridade vigente" : !reviewComplete ? "Confira as pendências da leitura" : !identifier.trim() ? "Informe o identificador na fonte" : !headingType ? "Confirme o tipo de autoridade" : originalTag && headingTagByKind[headingType] !== originalTag && typeReason.trim().length < 10 ? "Justifique a correção do tipo" : Object.values(places).some(place => (place.latitude || place.longitude || place.source || place.linkedAuthorityId) && !authorityPlaceComplete(place)) ? "Complete os dados do lugar revisado" : label.trim().length < 2 ? "Informe o termo em português" : label.length > 120 || english.length > 120 ? "Use até 120 caracteres em cada termo" : candidate && !linkConfirmed ? "Confirme o vínculo com o assunto existente" : !confirmed ? "Confirme a revisão dos dados" : "";
 if (!mounted) return null;
 return createPortal(<dialog ref={dialog} className="pronto-modal subject-authority-dialog" aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><header className="catalogue-modal__header"><div><p className="eyebrow">Catálogo de assuntos</p><h2 id={titleId} className="authority-import-wizard__title"><AppIcon name="download" />Importar autoridade</h2></div><ModalCloseButton onClick={onClose} disabled={busy} label="Fechar importação" /></header><section ref={content} className="subject-authority-importer catalogue-workflow" aria-label="Revisão da autoridade">
  <ol className="authority-import-wizard__steps" aria-label="Etapas da importação">{[{title:"Fonte",icon:"globe" as const},{title:"Texto ou arquivo",icon:"document" as const},{title:"Conferência",icon:"search" as const},{title:"Confirmação",icon:"review" as const}].map((item,index) => <li key={item.title} aria-current={step === index+1 ? "step" : undefined} className={step > index+1 ? "is-complete" : ""}><span>{step > index+1 ? <AppIcon name="check" /> : <AppIcon name={item.icon} />}</span><div><small>Etapa {index+1}</small><strong>{item.title}</strong></div></li>)}</ol>
  <AuthorityImportPreview disabled={busy} initialSource={source} onRecordChange={changeRecord} onReviewChange={setReviewComplete} step={step} onStepChange={setStep} onContinue={() => setStep(4)} />
  {step === 4 && record && !done && <section className="subject-authority-importer__confirmation catalogue-workflow__section"><header className="catalogue-workflow__wide"><h3 className="authority-import-wizard__title" data-authority-step-heading tabIndex={-1}><AppIcon name="review" />Confirme a importação</h3><p>Confirme o identificador e a forma em português. Cadastros com o mesmo texto exigem conferência do vínculo.</p></header>
   <label className="catalogue-workflow__wide"><span className="catalogue-field-label"><AppIcon name="link" />Identificador na fonte</span><input value={identifier} disabled={busy} onChange={e => {setIdentifier(e.target.value); setConfirmed(false);}} maxLength={1000} /><span className="field-help">Se ausente no arquivo, copie o identificador da página oficial. Não use um código inventado.</span></label>
   <label><span className="catalogue-field-label"><AppIcon name="tag" />Tipo de autoridade sugerido pelo MARC</span><select value={headingType} disabled={busy} onChange={e => { const nextType = e.target.value; setHeadingType(nextType); setPlaces(current => { const next = { ...current }; if (nextType === "corporate" && !next[-1]) next[-1] = emptyAuthorityPlace(record.fields?.find(f => f.tag === "370")?.subfields?.find(s => s.code === "e")?.value ?? ""); if (["geographic", "geographic_subdivision"].includes(nextType) && !next[0]) next[0] = emptyAuthorityPlace(record.components[0]?.value ?? ""); return next; }); setConfirmed(false);}}>{authorityHeadingTypes.map(item => <option key={item.tag} value={item.kind}>{item.tag} · {item.label}</option>)}</select><span className="field-help">Campo de entrada identificado: {originalTag ?? "não identificado"}. Corrija apenas após conferir o registro na fonte.</span></label>
   {originalTag && headingTagByKind[headingType] !== originalTag && <label><span className="catalogue-field-label"><AppIcon name="document" />Motivo da correção do tipo</span><input value={typeReason} disabled={busy} minLength={10} maxLength={1000} onChange={e => setTypeReason(e.target.value)} /></label>}
   <label><span className="catalogue-field-label"><AppIcon name="tag" />Termo preferido em português, verificado na fonte</span><input value={label} disabled={busy} onChange={e => {setLabel(e.target.value); setCandidate(null); setConfirmed(false);}} maxLength={120} /><span className="field-help">Sugestão preenchida a partir de {suggestedAuthorityLabels(record).portugueseSource}. Confira antes de confirmar; o sistema não traduz o MARC.</span></label>
   <label><span className="catalogue-field-label"><AppIcon name="globe" />Equivalente em inglês (opcional)</span><input value={english} disabled={busy} onChange={e => {setEnglish(e.target.value); setConfirmed(false);}} maxLength={120} /><span className="field-help">{suggestedAuthorityLabels(record).english ? `Sugestão do ${suggestedAuthorityLabels(record).englishSource}. Confirme a equivalência na fonte.` : "Preencha somente se houver equivalente conferido na fonte."}</span></label>
   {Object.entries(places).filter(([position]) => Number(position) === -1 ? headingType === "corporate" : Number(position) === 0 ? ["geographic", "geographic_subdivision"].includes(headingType) : record.components[Number(position)]?.kind === "Subdivisão geográfica").map(([position, place]) => <div className="catalogue-workflow__wide" key={position}><AuthorityPlaceFields value={place} disabled={busy} editablePlace={position === "-1"} onChange={value => setPlaces(current => ({ ...current, [position]: value }))} /></div>)}
   {candidate && <label className="checkbox-choice"><input type="checkbox" checked={linkConfirmed} disabled={busy} onChange={e => setLinkConfirmed(e.target.checked)} />Conferi o assunto existente “{candidate.preferred_label_pt}” e confirmo que esta autoridade corresponde ao mesmo conceito. Os rótulos existentes serão preservados.</label>}
   <label className="checkbox-choice"><input type="checkbox" checked={confirmed} disabled={busy || obsolete} onChange={e => setConfirmed(e.target.checked)} />Conferi a fonte, o identificador, o termo em português, as notas e os alertas; confirmo sua adequação ao catálogo.</label>
   {obsolete && <p role="alert">Registro indicado como obsoleto ou excluído. Consulte uma autoridade vigente para novos usos.</p>}

  </section>}
  {error && <p role="alert" className="notice notice--error">{error}</p>}{done && <p role="status">{reused ? "Autoridade já cadastrada: o registro existente foi reutilizado. Nenhuma cópia foi criada." : "Nova autoridade importada e vinculada ao catálogo."} A ficha continua sujeita ao salvamento e à conferência.</p>}
  {step === 4 && record && !done && <footer className="catalogue-workflow__actions"><button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => setStep(3)}><AppIcon name="undo" />Voltar: conferência</button><button type="button" className="button button--primary button--small" disabled={busy || !!confirmationPending} onClick={save}><AppIcon name={confirmationPending ? "help" : "check"} />{busy ? "Importando…" : confirmationPending || (requestId ? "Importar e adicionar ao assunto" : "Confirmar importação")}</button></footer>}
 </section></dialog>, document.body);
}
