"use client";

import { useEffect, useId, useState } from "react";
import { CatalogueSelect as ComposerSelect } from "./catalogue-select";
import { CduSymbolEditor } from "./cdu-symbol-editor";
import { composeCduSymbols, cduTokenCodes, type CduToken } from "@/lib/cdu-symbols";
import { AppIcon } from "./app-icon";
import { CduEditionSelect, defaultCduEdition } from "./cdu-edition-select";
import { composeCdu, cduRelations, type ComposerEntry, type CduPart, type CduAuxiliary, type CduRelation } from "@/lib/cdu-composer";
import { cduPath } from "@/lib/cdu-structure";
import { createClient } from "@/lib/supabase/client";

export function CduComposer({ actionLabel, onUse, onClose }: { actionLabel: string; onUse: (entry: ComposerEntry) => void; onClose: () => void }) {
 const id = useId();
 const [entries, setEntries] = useState<ComposerEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const [reload, setReload] = useState(0);
 const [error, setError] = useState("");
 const [busy, setBusy] = useState(false);
 const [edition, setEdition] = useState(defaultCduEdition);
 const [parts, setParts] = useState<CduPart[]>([{ code: "", relation: ":" }]);
 const [auxiliaries, setAuxiliaries] = useState<CduAuxiliary[]>([]);
 const [symbolMode, setSymbolMode] = useState(false);
 const [tokens, setTokens] = useState<CduToken[]>([]);
 const [description, setDescription] = useState("");
 const [confirmed, setConfirmed] = useState(false);
 useEffect(() => {
  let active = true;
  async function load() {
   setLoading(true); setError(""); const all: ComposerEntry[] = []; const client = createClient();
   try {
    for (let start = 0; ; start += 500) {
     const response = await client.from("cdu_code_descriptions").select("cdu_code,description,source_reference,validated,notation_kind,parent_code,auxiliary_scope_code,merged_into_code,composition_notes,auxiliary_codes,related_codes").order("cdu_code").range(start, start + 499);
     if (response.error) throw response.error;
     all.push(...(response.data ?? []) as ComposerEntry[]);
     if ((response.data?.length ?? 0) < 500) break;
    }
    if (active) setEntries(all);
   } catch { if (active) setError("Não foi possível carregar o repertório. Tente novamente; o preenchimento manual continua disponível."); }
   finally { if (active) setLoading(false); }
  }
  void load(); return () => { active = false; };
 }, [reload]);
 const current = entries.filter((item) => !item.merged_into_code && item.source_reference === edition);
 const mains = current.filter((item) => item.notation_kind === "main");
 let result: ReturnType<typeof composeCdu> | null = null; let issue = "";
 try { result = symbolMode ? composeCduSymbols(tokens, edition, entries) : composeCdu(parts, auxiliaries, edition, entries); } catch (failure) { issue = (failure as Error).message; }
 const existing = result ? entries.find((item) => item.cdu_code === result?.code) : undefined;
 const editionConflict = Boolean(existing && existing.source_reference !== edition);
 function change() { setConfirmed(false); setError(""); }
 async function apply() {
  if (!result || !confirmed || busy || existing?.merged_into_code || editionConflict) return;
  setBusy(true); setError("");
  try {
   const client = createClient();
   const codes = [...new Set([...parts.map((part) => part.code), ...auxiliaries.map((auxiliary) => auxiliary.code), ...tokens.flatMap(cduTokenCodes), ...entries.filter((entry) => entry.notation_kind === "main").map((entry) => entry.cdu_code)])];
   // Refresh in bounded batches, including the hierarchy needed by special auxiliaries.
   const fresh: ComposerEntry[] = [];
   for (let start = 0; start < codes.length; start += 200) {
    const checked = await client.from("cdu_code_descriptions").select("cdu_code,description,source_reference,validated,notation_kind,parent_code,auxiliary_scope_code,merged_into_code").in("cdu_code", codes.slice(start, start + 200));
    if (checked.error) throw checked.error;
    fresh.push(...(checked.data ?? []) as ComposerEntry[]);
   }
   const refreshed = symbolMode ? composeCduSymbols(tokens, edition, fresh) : composeCdu(parts, auxiliaries, edition, fresh);
   if (refreshed.code !== result.code || refreshed.memory !== result.memory) throw new Error("changed");
   if (!existing) {
    const response = await client.rpc("save_cdu_code_description", { cdu_code_value: result.code, description_value: description.trim(), source_reference_value: edition, composition_notes_value: result.memory, auxiliary_codes_value: result.auxiliaries, related_codes_value: result.related });
    if (response.error) throw response.error;
   }
   const stored = await client.from("cdu_code_descriptions").select("cdu_code,description,source_reference,validated,notation_kind,parent_code,auxiliary_scope_code,merged_into_code,composition_notes,auxiliary_codes,related_codes,usage_notes").eq("cdu_code", result.code).single();
   if (stored.error || !stored.data || stored.data.merged_into_code || stored.data.source_reference !== edition) throw new Error("changed");
   // A concurrent registration is reused; no existing description or metadata is overwritten.
   onUse(stored.data as ComposerEntry);
  } catch { setError("Não foi possível confirmar a composição no catálogo. Nada foi aplicado à ficha. Tente novamente ou consulte o código no catálogo."); }
  finally { setBusy(false); }
 }
 return <section className="cdu-composer catalogue-workflow" aria-labelledby={`${id}-title`}>
  <header className="catalogue-workflow__header"><div><p className="eyebrow">Montagem com o repertório local</p><h3 id={`${id}-title`}><AppIcon name="hierarchy" />Compor uma notação CDU</h3><p>Escolha os componentes cadastrados e confira a aplicação de cada auxiliar. Nenhum código é atribuído por conta própria.</p></div><button type="button" className="button button--secondary button--small" disabled={busy} onClick={onClose}><AppIcon name="close" />Fechar compositor</button></header>
  {loading ? <p role="status">Carregando repertório…</p> : <>
   <div className="cdu-composer__setup"><label data-no-field-help><span className="catalogue-field-label"><AppIcon name="book" />Edição usada na composição</span><CduEditionSelect value={edition} disabled={busy} onChange={(event) => { setEdition(event.target.value); setParts([{ code: "", relation: ":" }]); setAuxiliaries([]); setTokens([]); setDescription(""); change(); }} /><small>Somente componentes com esta edição registrada aparecem nas escolhas.</small></label>
   <div className="catalogue-inline-actions catalogue-mode-switch" aria-label="Forma de montagem"><button type="button" className="button button--secondary button--small" aria-pressed={!symbolMode} disabled={busy} onClick={() => { setSymbolMode(false); change(); }}><AppIcon name="book" />Montagem guiada</button><button type="button" className="button button--secondary button--small" aria-pressed={symbolMode} disabled={busy} onClick={() => { setSymbolMode(true); change(); }}><AppIcon name="hierarchy" />Montagem por símbolos</button></div></div>
   {symbolMode ? <CduSymbolEditor entries={current} tokens={tokens} disabled={busy} onChange={(next) => { setTokens(next); change(); }} /> : <div className="cdu-composer__guided"><div className="cdu-composer__group"><h4 className="catalogue-step-heading">Assuntos da notação</h4>
   {mains.length === 0 && <p className="notice">Ainda não há classes principais organizadas nesta edição. Cadastre ou revise os componentes no Catálogo CDU; você também pode informar a notação manualmente.</p>}
   <div className="cdu-composer__blocks">{parts.map((part, index) => <div className="cdu-composer__block" key={index}>
    <strong>Assunto {index + 1}</strong>
    {index > 0 && <label data-no-field-help><span className="catalogue-field-label"><AppIcon name="link" />Como ligar ao assunto anterior?</span><ComposerSelect disabled={busy} value={part.relation} onChange={(event) => { setParts(parts.map((item, i) => i === index ? { ...item, relation: event.target.value as CduRelation } : item)); change(); }}>{Object.entries(cduRelations).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</ComposerSelect></label>}
    <label data-no-field-help><span className="catalogue-field-label"><AppIcon name="tag" />Código do assunto {index + 1}</span><ComposerSelect disabled={busy} value={part.code} onChange={(event) => { setParts(parts.map((item, i) => i === index ? { ...item, code: event.target.value } : item)); change(); }}><option value="">Selecione uma classe principal</option>{mains.map((entry) => <option key={entry.cdu_code} value={entry.cdu_code}>{entry.cdu_code} — {entry.description}{entry.validated ? "" : " (pendente de validação)"}</option>)}</ComposerSelect></label>
    {index > 0 && <button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => { setParts(parts.filter((_, i) => i !== index)); setAuxiliaries(auxiliaries.filter((item) => item.target !== index).map((item) => ({ ...item, target: item.target === "whole" && parts.length === 2 ? 0 : typeof item.target === "number" && item.target > index ? item.target - 1 : item.target }))); change(); }}><AppIcon name="close" />Remover assunto {index + 1}</button>}
   </div>)}</div>
   <button type="button" className="button button--secondary button--small" disabled={busy || parts.length >= 8 || !parts.at(-1)?.code} onClick={() => { setParts([...parts, { code: "", relation: ":" }]); change(); }}><AppIcon name="link" />Adicionar assunto relacionado</button>
   </div><div className="cdu-composer__group"><h4 className="catalogue-step-heading">Auxiliares e aplicação</h4>
   {auxiliaries.length === 0 && <p>Precisa indicar lugar, língua, forma ou outro complemento? Acrescente um auxiliar cadastrado.</p>}
   {auxiliaries.map((auxiliary, index) => {
    const options = current.filter((entry) => entry.notation_kind?.startsWith("common_") || (entry.notation_kind?.startsWith("special_") && typeof auxiliary.target === "number" && Boolean(entry.auxiliary_scope_code && cduPath(parts[auxiliary.target]?.code ?? "", entries).includes(entry.auxiliary_scope_code))));
    return <div className="cdu-composer__block" key={index}><strong>Auxiliar {index + 1}</strong>
     {parts.length > 1 && <label data-no-field-help><span className="catalogue-field-label"><AppIcon name="hierarchy" />Onde este auxiliar se aplica?</span><ComposerSelect disabled={busy} value={auxiliary.target} onChange={(event) => { setAuxiliaries(auxiliaries.map((item, i) => i === index ? { code: "", target: event.target.value === "whole" ? "whole" : Number(event.target.value) } : item)); change(); }}>{parts.map((part, i) => <option key={i} value={i}>Assunto {i + 1}: {part.code || "a selecionar"}</option>)}{parts.length > 1 && <option value="whole">Ao conjunto dos assuntos (com agrupamento)</option>}</ComposerSelect></label>}
     <label data-no-field-help><span className="catalogue-field-label"><AppIcon name="tag" />Código do auxiliar {index + 1}</span><ComposerSelect disabled={busy} value={auxiliary.code} onChange={(event) => { setAuxiliaries(auxiliaries.map((item, i) => i === index ? { ...item, code: event.target.value } : item)); change(); }}><option value="">Selecione um auxiliar</option>{options.map((entry) => <option key={entry.cdu_code} value={entry.cdu_code}>{entry.cdu_code} — {entry.description}{entry.validated ? "" : " (pendente de validação)"}</option>)}</ComposerSelect><small>Auxiliares especiais aparecem somente para assuntos pertencentes à classe de aplicação registrada.</small></label>
     <button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => { setAuxiliaries(auxiliaries.filter((_, i) => i !== index)); change(); }}><AppIcon name="close" />Remover auxiliar {index + 1}</button>
    </div>;
   })}
   <button type="button" className="button button--secondary button--small" disabled={busy || auxiliaries.length >= 12 || !parts[0].code} onClick={() => { setAuxiliaries([...auxiliaries, { code: "", target: 0 }]); change(); }}><AppIcon name="tag" />Adicionar auxiliar</button>
   </div></div>}
   <div className="cdu-composer__preview" aria-live="polite"><strong className="catalogue-step-heading">Resultado da montagem</strong><output>{result?.code || "Selecione os componentes"}</output>{issue && <p>{issue}</p>}{result && <p className="cdu-composer__memory">{result.memory}</p>}</div>
   {result && existing && <p className="notice">{editionConflict ? "Esta notação já está cadastrada com outra edição ou sem edição registrada. Confira o cadastro existente antes de usar esta composição." : existing.merged_into_code ? `Esta notação foi mesclada em ${existing.merged_into_code}. Consulte o cadastro atual.` : `Esta notação já existe. Será reutilizada com a descrição “${existing.description}”, sem alterar o registro.`}</p>}
   <section className="cdu-composer__review catalogue-workflow__section" aria-label="Conferência da notação"><h4>Revisão antes de salvar</h4>
   {result && !existing && <label data-no-field-help><span className="catalogue-field-label"><AppIcon name="document" />Descrição da composição</span><textarea rows={2} maxLength={1000} value={description} disabled={busy} onChange={(event) => { setDescription(event.target.value); change(); }} /><small>Redija e confira o significado da combinação na edição consultada. Não juntamos descrições automaticamente.</small></label>}
   <details className="catalogue-workflow__guidance"><summary><AppIcon name="help" />O que esta conferência verifica?</summary><p>O compositor confere a estrutura dos blocos, não a validade técnica de toda classificação. Preserve a ordem de citação indicada para o caso; ela pode mudar o significado. Instruções específicas e exceções precisam ser conferidas na edição consultada. Novas composições ficam pendentes de organização e validação no catálogo.</p></details>
   <label className="check" data-no-field-help><input type="checkbox" disabled={busy || !result} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />Conferi os componentes, a ordem e a aplicação dos auxiliares na edição consultada.</label>
   <button type="button" className="button button--primary" disabled={busy || !result || !confirmed || Boolean(existing?.merged_into_code) || editionConflict || (!existing && description.trim().length < 3)} onClick={() => void apply()}><AppIcon name="check" />{busy ? "Conferindo e salvando…" : actionLabel}</button></section>
  </>}
  {error && <div role="alert" className="notice notice--error"><p>{error}</p>{!loading && <button type="button" className="button button--secondary" onClick={() => { setConfirmed(false); setReload(reload + 1); }}>Atualizar repertório</button>}</div>}
 </section>;
}
