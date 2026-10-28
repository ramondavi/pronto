"use client";

import { useId, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { CatalogueSelect } from "./catalogue-select";
import { AuthoritySourceSelect } from "./authority-source-select";
import { authorityInputLimit, readAuthorityPreview, type AuthorityPreview, type AuthoritySource, type AuthorityValue } from "@/lib/authority-preview";

export function AuthorityImportPreview({ initialSource = "bn", disabled = false, onRecordChange }: { initialSource?: AuthoritySource; disabled?: boolean; onRecordChange?: (record: AuthorityPreview | null) => void } = {}) {
 const inputId = useId();
 const fileInput = useRef<HTMLInputElement>(null);
 const [file, setFile] = useState<File | null>(null);
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
  <AuthoritySourceSelect value={source} onChange={value => { setSource(value); reset(); }} disabled={busy || disabled} />
  <div className="authority-import-preview__inputs">
   <div className="authority-import-preview__input-card"><label htmlFor={`${inputId}-text`} className="catalogue-field-label"><AppIcon name="document" />Registro em texto</label><textarea id={`${inputId}-text`} aria-describedby={`${inputId}-text-help`} rows={7} value={text} onChange={e => { setText(e.target.value); reset(); }} placeholder="Cole o registro completo, incluindo os campos e identificadores da fonte." disabled={busy || disabled} /><div id={`${inputId}-text-help`} className="authority-import-preview__help"><p><AppIcon name="copy" /><span><strong>O que colar:</strong> MARC em texto, MARCXML ou JSON-LD/NDJSON. Copie o registro completo, não apenas o nome do assunto.</span></p><p><AppIcon name="document" /><span><strong>Limites:</strong> até 2 MB e 100 registros por leitura. Para MARC binário (ISO 2709), selecione o arquivo.</span></p><p><AppIcon name="eye" /><span><strong>Como continuar:</strong> clique em Conferir texto. O assunto só será cadastrado após sua revisão e confirmação.</span></p></div></div>
   <div className="authority-import-preview__input-card"><label htmlFor={`${inputId}-file`} className="catalogue-field-label"><AppIcon name="upload" />Selecionar arquivo de importação</label><input ref={fileInput} id={`${inputId}-file`} className="browser-pdf-delivery__file-input" type="file" accept=".txt,.mrc,.marc,.xml,.json,.jsonld,.ndjson" aria-describedby={`${inputId}-file-help`} disabled={busy || disabled} onChange={async e => {
    const nextFile = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (!nextFile) return;
    reset(); setFile(null); if (nextFile.size > authorityInputLimit) { setError("Use um arquivo de até 2 MB."); return; }
    setFile(nextFile); setBusy(true); try { read(new Uint8Array(await nextFile.arrayBuffer())); } catch { setError("Não foi possível abrir o arquivo."); } finally { setBusy(false); }
   }} /><div className="nada-consta-picker browser-pdf-delivery__picker authority-import-preview__file"><button className="browser-pdf-delivery__picker-surface" type="button" disabled={busy || disabled} aria-label={file ? "Trocar arquivo de importação" : "Escolher arquivo de importação"} onClick={() => fileInput.current?.click()} /><AppIcon name={file ? "document" : "upload"} /><div><strong title={file?.name}>{file?.name ?? "Nenhum arquivo selecionado"}</strong><span>{file ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(file.size / 1024)} KB · selecionado para conferência` : "Registro de autoridade exportado da fonte"}</span></div><div className="nada-consta-picker__actions"><button className="button button--secondary button--small" type="button" disabled={busy || disabled} onClick={() => fileInput.current?.click()}><AppIcon name="upload" />{file ? "Trocar arquivo" : "Escolher arquivo"}</button>{file && <button className="button button--secondary button--small" type="button" disabled={busy || disabled} onClick={() => { setFile(null); reset(); }}><AppIcon name="close" />Remover</button>}</div></div><div id={`${inputId}-file-help`} className="authority-import-preview__help"><p><AppIcon name="document" /><span><strong>Arquivos aceitos:</strong> MARC em texto (.txt), MARC ISO 2709 UTF-8 (.mrc, .marc), MARCXML (.xml) e JSON-LD (.json, .jsonld, .ndjson).</span></p><p><AppIcon name="archive" /><span><strong>Limites:</strong> um arquivo por vez, até 2 MB e 100 registros. MARC-8, RDF/XML, Turtle e N-Triples não são aceitos.</span></p><p><AppIcon name="globe" /><span><strong>Antes de abrir:</strong> escolha a fonte acima. A leitura é automática; revise o resultado antes de confirmar. A origem e a vigência não são verificadas online.</span></p></div></div>
  </div>
  <div className="controlled-terms-admin__actions"><button className="button button--secondary button--small" type="button" disabled={!text.trim() || busy || disabled} onClick={() => read(text)}><AppIcon name="search" />Conferir texto</button><button className="button button--secondary button--small" type="button" disabled={busy || disabled} onClick={() => { setText(""); setFile(null); reset(); }}><AppIcon name="close" />Limpar leitura</button></div>
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
