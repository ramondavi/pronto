"use client";

import { useState } from "react";
import { AppIcon } from "./app-icon";
import { CatalogueSelect } from "./catalogue-select";
import { authorityInputLimit, authoritySources, readAuthorityPreview, type AuthorityPreview, type AuthoritySource, type AuthorityValue } from "@/lib/authority-preview";

export function AuthorityImportPreview({ initialSource = "bn", disabled = false, onRecordChange }: { initialSource?: AuthoritySource; disabled?: boolean; onRecordChange?: (record: AuthorityPreview | null) => void } = {}) {
 const [source, setSource] = useState<AuthoritySource>(initialSource);
 const [text, setText] = useState("");
 const [records, setRecords] = useState<AuthorityPreview[]>([]);
 const [selected, setSelected] = useState(0);
 const [error, setError] = useState("");
 const [busy, setBusy] = useState(false);
 const reset = () => { setRecords([]); setSelected(0); setError(""); onRecordChange?.(null); };
 const read = (input: string | Uint8Array) => {
  reset();
  try { const next = readAuthorityPreview(input, source); setRecords(next); onRecordChange?.(next[0] ?? null); }
  catch (e) { setError(e instanceof Error ? e.message : "Não foi possível ler este arquivo."); }
 };
 const record = records[selected];
 const sections: [string, AuthorityValue[]][] = record ? [["Componentes do cabeçalho", record.components], ["Termos preferidos e idiomas", record.labels], ["Formas variantes", record.variants], ["Relações entre assuntos", record.relations], ["Correspondências externas", record.mappings], ["Notas de uso", record.notes], ["Fontes citadas", record.citations]] : [];
 return <div className="authority-import-preview">
  <header className="authority-import-preview__header"><p className="eyebrow">Etapa 1 · Registro da fonte</p><h3>Abrir uma autoridade</h3><p>Escolha a fonte e cole o registro completo ou selecione um arquivo. A leitura ainda não cadastra o assunto.</p></header>
  <label><span className="catalogue-field-label"><AppIcon name="globe" />Fonte do registro</span><CatalogueSelect value={source} onChange={e => { setSource(e.target.value as AuthoritySource); reset(); }} disabled={busy || disabled}>{Object.entries(authoritySources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</CatalogueSelect></label>
  <div className="authority-import-preview__inputs">
   <label><span className="catalogue-field-label"><AppIcon name="document" />Registro em texto</span><textarea rows={7} value={text} onChange={e => { setText(e.target.value); reset(); }} placeholder="Cole um registro MARC em texto ou JSON-LD." disabled={busy || disabled} /><span className="field-help">MARC em texto, MARCXML, ISO 2709 em UTF-8 ou JSON-LD. Até 2 MB e 100 registros. MARC-8, RDF/XML, Turtle e N-Triples ainda não são aceitos.</span></label>
   <label><span className="catalogue-field-label"><AppIcon name="upload" />Ou selecione um arquivo</span><input type="file" accept=".txt,.mrc,.marc,.xml,.json,.jsonld,.ndjson" disabled={busy || disabled} onChange={async e => {
    const file = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (!file) return;
    reset(); if (file.size > authorityInputLimit) { setError("Use um arquivo de até 2 MB."); return; }
    setBusy(true); try { read(new Uint8Array(await file.arrayBuffer())); } catch { setError("Não foi possível abrir o arquivo."); } finally { setBusy(false); }
   }} /><span className="field-help">Escolha a fonte antes de abrir o arquivo. A fonte indicada é sua declaração; a origem e a vigência não são verificadas online.</span></label>
  </div>
  <div className="controlled-terms-admin__actions"><button className="button button--secondary button--small" type="button" disabled={!text.trim() || busy || disabled} onClick={() => read(text)}><AppIcon name="search" />Conferir texto</button><button className="button button--secondary button--small" type="button" disabled={busy || disabled} onClick={() => { setText(""); reset(); }}><AppIcon name="close" />Limpar leitura</button></div>
  {busy && <p role="status">Lendo arquivo…</p>}{error && <p role="alert" className="notice notice--error">{error}</p>}
  {record && <section className="authority-import-preview__result" aria-label="Resultado da conferência" aria-live="polite"><header><p className="eyebrow">Etapa 2 · Conferência</p><h3>Revisar a autoridade</h3></header>
   <label><span className="catalogue-field-label"><AppIcon name="tag" />Registro conferido ({records.length})</span><CatalogueSelect value={selected} onChange={e => { const index = Number(e.target.value); setSelected(index); onRecordChange?.(records[index]); }}>{records.map((r, i) => <option key={i} value={i}>{i + 1}. {r.title}</option>)}</CatalogueSelect></label>
   <h4>{record.title}</h4><p>{record.format} · {record.identifier ?? "Identificador não informado"}</p>
   {record.geography && <p>Subdivisão geográfica: {record.geography}</p>}
   {record.modified && <p>Data informada na origem: {record.modified}</p>}
   {!!record.warnings.length && <div className="authority-import-preview__warnings"><h4>Pontos para conferir</h4><ul>{record.warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
   <div className="authority-import-preview__sections">{sections.filter(([, values]) => values.length).map(([label, values]) => <details key={label} open><summary>{label} ({values.length})</summary><ul>{values.map((v, i) => <li key={i}><strong>{v.value}</strong><span>{v.kind}{v.language ? ` · idioma: ${v.language}` : ""}{v.identifier ? ` · ${v.identifier}` : ""}</span></li>)}</ul></details>)}</div>
   <details><summary>Conteúdo lido do registro</summary><pre>{record.original}</pre></details>
  </section>}
 </div>;
}
