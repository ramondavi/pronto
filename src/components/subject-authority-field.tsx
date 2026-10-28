"use client";
import { useEffect, useState } from "react";
import { AppIcon } from "./app-icon";
import { SubjectAuthorityImporter, type ImportedSubject } from "./subject-authority-importer";
import { createClient } from "@/lib/supabase/client";
import { canOfferAuthorityImport, normalizeSubjectLabel, type SubjectCatalogueMatch } from "@/lib/subject-authority";
import type { AuthoritySource } from "@/lib/authority-preview";
export function SubjectAuthorityField({ id, value, source, requestId, editable, invalid, onChange, onSelect, onImported, fallback }: {
 id: string; value: string; source: string; requestId: string; editable: boolean; invalid: boolean; fallback: SubjectCatalogueMatch[];
 onChange: (value: string) => void; onSelect: (term: SubjectCatalogueMatch) => void; onImported: (term: ImportedSubject) => void;
}) {
 const [search, setSearch] = useState<{ query: string; state: "idle" | "pending" | "ready" | "error"; matches: SubjectCatalogueMatch[] }>({query:"",state:"idle",matches:[]});
 const [focused, setFocused] = useState(false); const [importing, setImporting] = useState(false); const [retry, setRetry] = useState(0);
 const query = normalizeSubjectLabel(value);
 useEffect(() => {
  let active = true;
  if (!editable || !source || query.length < 2) return;
  const timer = window.setTimeout(async () => {
   try { const result = await createClient().rpc("search_subject_catalogue", { search_text: query });
    if (active) setSearch({query,state:result.error ? "error" : "ready",matches:result.error ? [] : result.data as SubjectCatalogueMatch[]});
   } catch { if (active) setSearch({query,state:"error",matches:[]}); }
  }, 250);
  return () => { active = false; window.clearTimeout(timer); };
 }, [query, editable, source, retry]);
 const current = search.query === query && editable && source ? search : {query,state:"pending" as const,matches:[]};
 const matches = current.state === "ready" ? current.matches : fallback.filter(t => t.preferred_label_pt.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))).slice(0,6);
 const offer = canOfferAuthorityImport(value,current.matches,current.state) && !!source && editable;
 return <div className="subject-authority-field">
  <label className="autocomplete-field"><span className="cataloging-field-label"><AppIcon name="tag" />Termo preferido — português</span>
   <input id={id} aria-invalid={invalid} value={value} disabled={!editable || !source} placeholder={source ? "Assunto conforme a fonte" : "Selecione a fonte primeiro"} maxLength={120} autoComplete="off" onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false),120)} onChange={e => {setImporting(false); onChange(e.target.value);}} />
   {focused && query.length > 0 && matches.length > 0 && <span className="cataloging-autocomplete">{matches.map(t => <button type="button" key={t.id} onMouseDown={e => e.preventDefault()} onClick={() => {onSelect(t);setFocused(false);setImporting(false);}}>{t.preferred_label_pt}{t.matched_variant && <small>Encontrado pela variante: {t.matched_variant}</small>}</button>)}</span>}
  </label>
  {editable && source && query.length >= 2 && current.state === "error" && <p className="field-help" role="status">Não foi possível conferir o catálogo completo. O preenchimento manual continua disponível. <button type="button" className="text-action" onClick={() => setRetry(n => n+1)}>Tentar busca novamente</button></p>}
  {offer && !importing && <div className="subject-authority-field__empty"><span className="field-help">Não encontrado na base.</span><button type="button" className="button button--secondary button--small" onClick={() => setImporting(true)}><AppIcon name="upload" />Importar autoridade</button></div>}
  {offer && importing && <SubjectAuthorityImporter requestId={requestId} source={source as AuthoritySource} onClose={() => setImporting(false)} onImported={term => { setImporting(false); onImported(term); window.setTimeout(() => document.getElementById(id)?.focus(),0); }} />}
 </div>;
}
