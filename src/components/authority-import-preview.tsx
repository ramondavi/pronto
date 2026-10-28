"use client";

import { useId, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { CatalogueSelect } from "./catalogue-select";
import { AuthoritySourceSelect } from "./authority-source-select";
import { authorityInputLimit, authoritySources, readAuthorityPreview, type AuthorityPreview, type AuthoritySource, type AuthorityValue } from "@/lib/authority-preview";

function reviewIssue(warning: string) {
 if (/idioma|português/i.test(warning)) return { title: "Forma e idioma a confirmar", action: "Confira na fonte a forma autorizada em português." };
 if (/obsoleto|excluído|descontinuada/i.test(warning)) return { title: "Vigência da autoridade", action: "Consulte a fonte e escolha um registro vigente para novos usos." };
 if (/líder|008|MARC completo/i.test(warning)) return { title: "Registro incompleto para conferência", action: "Compare com o registro completo disponível na fonte." };
 return { title: "Informação pendente de verificação", action: "Confira esta informação na fonte antes de confirmar a importação." };
}

type Props = { initialSource?: AuthoritySource; disabled?: boolean; onRecordChange?: (record: AuthorityPreview | null) => void; step?: number; onStepChange?: (step: number) => void; onContinue?: () => void };
export function AuthorityImportPreview({ initialSource = "bn", disabled = false, onRecordChange, step, onStepChange, onContinue }: Props = {}) {
 const inputId = useId();
 const fileInput = useRef<HTMLInputElement>(null);
 const [localStep, setLocalStep] = useState(1);
 const currentStep = step ?? localStep;
 const go = (next: number) => { setLocalStep(next); onStepChange?.(next); };
 const [method, setMethod] = useState<"text" | "file">("text");
 const [file, setFile] = useState<File | null>(null);
 const [source, setSource] = useState<AuthoritySource>(initialSource);
 const [text, setText] = useState("");
 const [records, setRecords] = useState<AuthorityPreview[]>([]);
 const [selected, setSelected] = useState(0);
 const [error, setError] = useState("");
 const [busy, setBusy] = useState(false);
 const locked = busy || disabled;
 const reset = () => { setRecords([]); setSelected(0); setError(""); onRecordChange?.(null); };
 const clear = () => { setText(""); setFile(null); reset(); go(2); };
 const ready = method === "text" ? !!text.trim() : !!file;
 async function read() {
  if (!ready || locked) return;
  reset(); setBusy(true);
  try {
   const input = method === "text" ? text : new Uint8Array(await file!.arrayBuffer());
   const next = readAuthorityPreview(input, source); setRecords(next); onRecordChange?.(next[0] ?? null);
  } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível ler o registro."); }
  finally { setBusy(false); }
 }
 const record = records[selected];
 const sections: [string, AuthorityValue[]][] = record ? [["Componentes do cabeçalho", record.components], ["Termos preferidos e idiomas", record.labels], ["Formas variantes", record.variants], ["Relações entre assuntos", record.relations], ["Correspondências externas", record.mappings], ["Notas de uso", record.notes], ["Fontes citadas", record.citations]] : [];
 if (currentStep === 4) return null;
 return <div className="authority-import-preview authority-import-wizard">
  {currentStep === 1 && <section className="authority-import-wizard__stage"><header><h3 className="authority-import-wizard__title" data-authority-step-heading tabIndex={-1}><AppIcon name="globe" />Escolha a fonte</h3><p>Indique de onde veio a autoridade. O ícone de link permite consultar a fonte em outra aba.</p></header><AuthoritySourceSelect value={source} onChange={value => { setSource(value); reset(); }} disabled={locked} /><div className="catalogue-workflow__actions"><button type="button" className="button button--primary button--small" disabled={locked} onClick={() => go(2)}>Continuar: registro<AppIcon name="arrowRight" /></button></div></section>}
  {currentStep === 2 && <section className="authority-import-wizard__stage"><header><h3 className="authority-import-wizard__title" data-authority-step-heading tabIndex={-1}><AppIcon name="document" />Use texto ou arquivo</h3><p>Escolha <strong>somente uma</strong> das opções abaixo. Você não precisa preencher as duas.</p></header><div className="authority-import-wizard__methods" role="group" aria-label="Forma de fornecer o registro"><button type="button" className={`button button--secondary${method === "text" ? " is-selected" : ""}`} aria-pressed={method === "text"} disabled={locked} onClick={() => { if (method !== "text") { setMethod("text"); reset(); } }}><AppIcon name="copy" />Colar texto</button><span>OU</span><button type="button" className={`button button--secondary${method === "file" ? " is-selected" : ""}`} aria-pressed={method === "file"} disabled={locked} onClick={() => { if (method !== "file") { setMethod("file"); reset(); } }}><AppIcon name="upload" />Selecionar arquivo</button></div>
   <div className="authority-import-preview__input-card">
    {method === "text" ? <><label htmlFor={`${inputId}-text`} className="catalogue-field-label"><AppIcon name="copy" />Registro em texto</label><textarea id={`${inputId}-text`} aria-describedby={`${inputId}-text-help`} rows={7} value={text} onChange={e => { setText(e.target.value); reset(); }} placeholder="Cole o registro completo, com seus campos e identificadores. Não cole apenas o nome do assunto." disabled={locked} /><div id={`${inputId}-text-help`} className="authority-import-preview__help"><p><AppIcon name="document" /><span><strong>Conteúdo aceito:</strong> MARC em texto, MARCXML ou JSON-LD/NDJSON. Para MARC binário (ISO 2709), escolha Selecionar arquivo.</span></p><p><AppIcon name="archive" /><span><strong>Limites:</strong> até 2 MB e 100 registros. A leitura será feita na próxima etapa.</span></p></div></> : <><label htmlFor={`${inputId}-file`} className="catalogue-field-label"><AppIcon name="upload" />Arquivo de importação</label><input ref={fileInput} id={`${inputId}-file`} className="browser-pdf-delivery__file-input" type="file" accept=".txt,.mrc,.marc,.xml,.json,.jsonld,.ndjson" aria-describedby={`${inputId}-file-help`} disabled={locked} onChange={e => { const nextFile=e.currentTarget.files?.[0]; e.currentTarget.value=""; if (!nextFile) return; reset(); setFile(null); if (nextFile.size > authorityInputLimit) { setError("Use um arquivo de até 2 MB."); return; } setFile(nextFile); }} /><div className="nada-consta-picker browser-pdf-delivery__picker authority-import-preview__file"><button className="browser-pdf-delivery__picker-surface" type="button" disabled={locked} aria-label={file ? "Trocar arquivo de importação" : "Escolher arquivo de importação"} onClick={() => fileInput.current?.click()} /><AppIcon name={file ? "document" : "upload"} /><div><strong title={file?.name}>{file?.name ?? "Nenhum arquivo selecionado"}</strong><span>{file ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(file.size / 1024)} KB · pronto para a próxima etapa` : "Escolha o registro exportado da fonte"}</span></div><div className="nada-consta-picker__actions"><button className="button button--secondary button--small" type="button" disabled={locked} onClick={() => fileInput.current?.click()}><AppIcon name="upload" />{file ? "Trocar arquivo" : "Escolher arquivo"}</button>{file && <button className="button button--secondary button--small" type="button" disabled={locked} onClick={() => { setFile(null); reset(); }}><AppIcon name="close" />Remover</button>}</div></div><div id={`${inputId}-file-help`} className="authority-import-preview__help"><p><AppIcon name="document" /><span><strong>Arquivos aceitos:</strong> MARC em texto (.txt), MARC ISO 2709 UTF-8 (.mrc, .marc), MARCXML (.xml) e JSON-LD (.json, .jsonld, .ndjson).</span></p><p><AppIcon name="archive" /><span><strong>Limites:</strong> um arquivo de até 2 MB e 100 registros. MARC-8, RDF/XML, Turtle e N-Triples não são aceitos.</span></p></div></>}
   </div><div className="catalogue-workflow__actions"><button type="button" className="button button--secondary button--small" disabled={locked} onClick={() => go(1)}><AppIcon name="undo" />Voltar: fonte</button><button type="button" className="button button--primary button--small" disabled={locked || !ready} onClick={() => go(3)}>Continuar: conferência<AppIcon name="arrowRight" /></button></div></section>}
  {currentStep === 3 && <section className="authority-import-wizard__stage"><header><h3 className="authority-import-wizard__title" data-authority-step-heading tabIndex={-1}><AppIcon name="search" />Confira o registro</h3><p>A mesma conferência é usada para texto e arquivo. Ela organiza os dados para sua revisão, sem cadastrar o assunto.</p></header><div className="authority-import-wizard__summary"><AppIcon name={method === "file" ? "upload" : "copy"} /><div><strong>{method === "file" ? file?.name : "Registro fornecido em texto"}</strong><span>{authoritySources[source]}</span></div></div><div className="authority-import-wizard__read-actions"><button type="button" className="button button--primary button--small" disabled={locked || !ready} onClick={() => void read()}><AppIcon name="search" />{busy ? "Conferindo…" : record ? "Conferir novamente" : "Conferir registro"}</button><button type="button" className="button button--secondary button--small" disabled={locked} onClick={clear}><AppIcon name="close" />Limpar leitura</button></div><p className="field-help">Limpar leitura remove o texto, o arquivo selecionado e o resultado. A fonte é mantida.</p></section>}
  {busy && <p role="status">Lendo o registro…</p>}{error && <p role="alert" className="notice notice--error">{error}</p>}
  {currentStep === 3 && record && <section className="authority-import-preview__result" aria-label="Resultado da conferência" aria-live="polite"><h3 className="authority-import-wizard__title"><AppIcon name="review" />Resultado da leitura</h3>
   <label><span className="catalogue-field-label"><AppIcon name="tag" />Registro conferido ({records.length})</span><CatalogueSelect value={selected} onChange={e => { const index = Number(e.target.value); setSelected(index); onRecordChange?.(records[index]); }}>{records.map((r, i) => <option key={i} value={i}>{i + 1}. {r.title}</option>)}</CatalogueSelect></label>
   <div className="authority-review__record"><span className="authority-review__record-icon"><AppIcon name="tag" /></span><div><span className="eyebrow">Autoridade lida</span><h4>{record.title}</h4><dl><div><dt>Formato</dt><dd>{record.format}</dd></div><div><dt>Identificador</dt><dd>{record.identifier ?? "Não informado"}</dd></div></dl></div></div>
   {(record.geography || record.modified) && <dl className="authority-review__metadata">{record.geography && <div><dt><AppIcon name="globe" />Subdivisão geográfica</dt><dd>{record.geography}</dd></div>}{record.modified && <div><dt><AppIcon name="calendar" />Data informada na origem</dt><dd>{record.modified}</dd></div>}</dl>}
   {!!record.warnings.length && <section className="authority-review__issues" aria-label="Pendências de verificação"><header><span className="authority-review__issue-icon"><AppIcon name="help" /></span><div><h4>Pendências de verificação ({record.warnings.length})</h4><p>Estes pontos precisam ser conferidos na fonte antes da confirmação. A leitura do arquivo não comprova a qualidade ou a vigência da autoridade.</p></div></header><ul>{record.warnings.map((warning,index) => { const issue=reviewIssue(warning); return <li key={`${index}-${warning}`}><span className="authority-review__issue-number">{index+1}</span><div><strong>{issue.title}</strong><p>{warning}</p><small><AppIcon name="search" />{issue.action}</small></div></li>; })}</ul></section>}
   <div className="authority-import-preview__sections">{sections.filter(([, values]) => values.length).map(([label, values]) => <details key={label} open><summary>{label} ({values.length})</summary><ul>{values.map((v, i) => <li key={i}><strong>{v.value}</strong><span>{v.kind}{v.language ? ` · idioma: ${v.language}` : ""}{v.identifier ? ` · ${v.identifier}` : ""}</span></li>)}</ul></details>)}</div>
   <details><summary>Conteúdo lido do registro</summary><pre>{record.original}</pre></details>
  </section>}
  {currentStep === 3 && <div className="catalogue-workflow__actions"><button type="button" className="button button--secondary button--small" disabled={locked} onClick={() => go(2)}><AppIcon name="undo" />Voltar: registro</button>{onContinue && <button type="button" className="button button--primary button--small" disabled={locked || !record} onClick={onContinue}>Continuar: confirmação<AppIcon name="arrowRight" /></button>}</div>}
 </div>;
}
