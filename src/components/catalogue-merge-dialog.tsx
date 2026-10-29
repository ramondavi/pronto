"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";
import { createClient } from "@/lib/supabase/client";
import { showPanelChange } from "./panel-change-toast";

type Target = { record_key: string; label: string; description: string };
type Dates = { created_at: string | null; updated_at: string | null };
type Preview = { source_label: string; target_label: string; source_count: number; target_count: number; open_count: number; source_version: string; target_version: string };
type Results = { key: string; targets: Target[]; dates: Record<string, Dates>; datesUnavailable: boolean; error: string };
type Confirmation = { key: string; preview: Preview | null; error: string };
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" });
function validDate(value: string | null | undefined): value is string { return typeof value === "string" && !Number.isNaN(new Date(value).getTime()); }
function RecordDates({ dates, loading = false }: { dates?: Dates; loading?: boolean }) {
 return <span className="catalogue-merge-dialog__dates">{validDate(dates?.created_at) ? <span><AppIcon name="clock" /><span>Criado em <time dateTime={dates.created_at}>{dateFormat.format(new Date(dates.created_at))}</time></span></span> : <span><AppIcon name="clock" /><span>{loading ? "Carregando data de criação…" : "Data de criação não disponível"}</span></span>}{validDate(dates?.updated_at) && dates.updated_at !== dates.created_at && <span><AppIcon name="edit" /><span>Atualizado em <time dateTime={dates.updated_at}>{dateFormat.format(new Date(dates.updated_at))}</time></span></span>}</span>;
}
function isPreview(value: unknown): value is Preview {
 if (!value || typeof value !== "object") return false;
 const record = value as Record<string, unknown>;
 return ["source_label", "target_label", "source_version", "target_version"].every(key => typeof record[key] === "string" && record[key] !== "")
  && ["source_count", "target_count", "open_count"].every(key => typeof record[key] === "number" && Number.isInteger(record[key]) && (record[key] as number) >= 0);
}
export function CatalogueMergeDialog({ kind, sourceKey, sourceLabel, onClose, onMerged }: {
 kind: "subject" | "cdu"; sourceKey: string; sourceLabel: string; onClose: () => void; onMerged: (targetKey: string, targetLabel: string) => void;
}) {
 const dialog = useRef<HTMLDialogElement>(null);
 const titleId = useId();
 const [mounted, setMounted] = useState(false);
 const [query, setQuery] = useState("");
 const [retrySearch, setRetrySearch] = useState(0);
 const [retryPreview, setRetryPreview] = useState(0);
 const [results, setResults] = useState<Results | null>(null);
 const [target, setTarget] = useState<Target | null>(null);
 const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
 const [mergeError, setMergeError] = useState("");
 const [mergeBlock, setMergeBlock] = useState("");
 const [busy, setBusy] = useState(false);
 const noun = kind === "subject" ? "assunto" : "CDU";
 const searchKey = JSON.stringify([kind, sourceKey, query, retrySearch]);
 const currentResults = results?.key === searchKey ? results : null;
 const loading = !currentResults;
 const targets = currentResults?.targets ?? [];
 const dates = currentResults?.dates ?? {};
 const confirmationKey = JSON.stringify([kind, sourceKey, target?.record_key, retryPreview]);
 const currentConfirmation = confirmation?.key === confirmationKey ? confirmation : null;
 const preview = currentConfirmation?.preview ?? null;
 const pendingReason = loading ? "Aguarde a busca dos destinos" : currentResults?.error ? "Não foi possível carregar os destinos" : !target ? "Escolha o cadastro que será mantido" : mergeBlock || (currentConfirmation?.error ? "Refaça a conferência do destino" : !preview ? "Aguarde a conferência do histórico" : preview.open_count > 0 ? "Há atendimentos abertos nesses cadastros" : "");
 useEffect(() => { setMounted(true); }, []);
 useEffect(() => {
  if (!mounted) return;
  const element = dialog.current; const previousFocus = document.activeElement;
  element?.showModal(); element?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  return () => { if (element?.open) element.close(); if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true }); };
 }, [mounted]);
 useEffect(() => {
  let active = true;
  const timer = window.setTimeout(async () => {
   try {
    const client = createClient();
    const response = await client.rpc("admin_catalogue_merge_targets", { catalogue_kind: kind, source_key: sourceKey, search_query: query });
    if (response.error || !Array.isArray(response.data)) throw new Error("destinations_unavailable");
    const items = response.data as Target[];
    let metadata: Record<string, Dates> = {}; let datesUnavailable = false;
    {
     try {
      const timestampResponse = kind === "subject"
       ? await client.from("controlled_terms").select("id,created_at,updated_at").in("id", [sourceKey, ...items.map(item => item.record_key)])
       : await client.from("cdu_code_descriptions").select("id:cdu_code,created_at:submitted_at,updated_at").in("cdu_code", [sourceKey, ...items.map(item => item.record_key)]);
      if (timestampResponse.error) throw new Error("dates_unavailable");
      metadata = Object.fromEntries((timestampResponse.data ?? []).map(item => [item.id, { created_at: item.created_at, updated_at: item.updated_at }]));
     } catch { datesUnavailable = true; }
    }
    if (active) setResults({ key: searchKey, targets: items, dates: metadata, datesUnavailable, error: "" });
   } catch { if (active) setResults({ key: searchKey, targets: [], dates: {}, datesUnavailable: false, error: "Não foi possível carregar os cadastros de destino. Tente novamente para continuar." }); }
  }, 200);
  return () => { active = false; window.clearTimeout(timer); };
 }, [kind, sourceKey, query, retrySearch, searchKey]);
 useEffect(() => {
  let active = true;
  if (!target) return;
  const fail = () => { if (active) setConfirmation({ key: confirmationKey, preview: null, error: "Não foi possível conferir os cadastros e seus vínculos. Refaça a conferência antes de mesclar." }); };
  void createClient().rpc("admin_catalogue_merge_preview", { catalogue_kind: kind, source_key: sourceKey, target_key: target.record_key }).then(({ data, error }) => {
   if (!active) return;
   if (error || !isPreview(data)) { fail(); return; }
   setConfirmation({ key: confirmationKey, preview: data, error: "" });
  }, fail);
  return () => { active = false; };
 }, [kind, sourceKey, target, retryPreview, confirmationKey]);
 function choose(item: Target) { setTarget(item); setConfirmation(null); setMergeError(""); setMergeBlock(""); }
 function recheck() { setMergeError(""); setMergeBlock(""); setRetryPreview(value => value + 1); }
 async function merge() {
  if (busy || pendingReason || !preview || !target) return;
  setBusy(true); setMergeError("");
  try {
   const response = await createClient().rpc("admin_merge_catalogue", { catalogue_kind: kind, source_key: sourceKey, target_key: target.record_key, expected_source_version: preview.source_version, expected_target_version: preview.target_version });
   if (response.error) {
    const openRequests = response.error.message.includes("catalogue_merge_open_requests");
    setConfirmation(null); setMergeBlock(openRequests ? "Há atendimentos abertos nesses cadastros" : "Confira os cadastros novamente");
    setMergeError(openRequests ? "Um dos cadastros passou a ser usado em atendimento aberto. A mesclagem foi bloqueada para preservar o trabalho em andamento." : "A mesclagem não foi confirmada. Os registros ou seu acesso podem ter mudado. Confira novamente antes de continuar.");
    return;
   }
   showPanelChange(kind === "subject" ? "Assuntos mesclados" : "Códigos CDU mesclados"); onMerged(target.record_key, target.label);
  } catch { setConfirmation(null); setMergeBlock("Refaça a conferência antes de tentar"); setMergeError("Não foi possível confirmar a resposta da mesclagem. Confira os cadastros antes de tentar novamente."); }
  finally { setBusy(false); }
 }
 if (!mounted) return null;
 return createPortal(<dialog ref={dialog} className="pronto-modal catalogue-merge-dialog" aria-labelledby={titleId} aria-describedby={`${titleId}-description`} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
  <header className="catalogue-modal__header"><h2 id={titleId}><AppIcon name="hierarchy" />Mesclar {noun}</h2><ModalCloseButton onClick={onClose} disabled={busy} label="Fechar mesclagem" /></header>
  <div className="catalogue-merge-dialog__body">
   <p id={`${titleId}-description`}>Indique qual cadastro deve permanecer disponível nas novas escolhas. O duplicado continuará no histórico.</p>
   <div className="catalogue-merge-dialog__comparison">
    <section className="catalogue-merge-dialog__source" aria-label="Cadastro duplicado"><AppIcon name={kind === "subject" ? "tag" : "book"} /><div><small>Duplicado — sai das novas escolhas</small><strong>{sourceLabel}</strong>{<RecordDates dates={dates[sourceKey]} loading={loading} />}</div></section>
    <section className={`catalogue-merge-dialog__source${target ? " is-destination" : " is-awaiting"}`} aria-label="Cadastro que será mantido"><AppIcon name={target ? "check" : "search"} /><div><small>Destino — permanece disponível</small><strong>{target?.label ?? "Escolha um cadastro abaixo"}</strong>{target && <RecordDates dates={dates[target.record_key]} loading={loading} />}</div></section>
   </div>
   <label><span className="catalogue-field-label"><AppIcon name="search" />1. Localize o cadastro que deve permanecer</span><input type="search" maxLength={120} value={query} disabled={busy} placeholder={kind === "subject" ? "Buscar assunto em português ou inglês" : "Buscar código ou descrição CDU"} onChange={event => { setQuery(event.target.value); setTarget(null); setConfirmation(null); setMergeError(""); setMergeBlock(""); }} /></label>
   {<p className="catalogue-merge-dialog__hint"><AppIcon name="clock" /><span>Datas de criação e atualização do cadastro, em horário de Brasília. Use-as como apoio; confira também a descrição e o uso do cadastro.</span></p>}
   <fieldset disabled={busy || loading} className="catalogue-merge-dialog__targets"><legend>Cadastros disponíveis para manter</legend>
    {loading ? <div className="catalogue-merge-dialog__empty" role="status"><AppIcon name="clock" /><p>Buscando destinos e datas…</p></div> : currentResults?.error ? <div className="catalogue-merge-dialog__empty" role="alert"><AppIcon name="help" /><p>{currentResults.error}</p></div> : !targets.length ? <div className="catalogue-merge-dialog__empty"><AppIcon name="search" /><p>Nenhum destino encontrado. Ajuste a busca. O próprio duplicado não aparece nesta lista.</p></div> : targets.map(item => <label key={item.record_key} className={target?.record_key === item.record_key ? "is-selected" : undefined}><input type="radio" name={titleId} checked={target?.record_key === item.record_key} onChange={() => choose(item)} /><span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}{<RecordDates dates={dates[item.record_key]} />}</span></label>)}
   </fieldset>
   {currentResults?.error && <button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => setRetrySearch(value => value + 1)}><AppIcon name="search" />Tentar carregar os destinos novamente</button>}
   {currentResults?.datesUnavailable && <p className="catalogue-merge-dialog__hint"><AppIcon name="help" /><span>As datas não puderam ser consultadas agora. A conferência dos vínculos continua disponível.</span></p>}
   {targets.length === 20 && <p className="field-help">A lista mostra até 20 destinos por busca. Refine o texto para localizar outro cadastro.</p>}
   {target && <section className="catalogue-merge-dialog__preview" aria-label="Conferência da mesclagem"><h3><AppIcon name="review" />2. Confira os vínculos</h3>
    {!currentConfirmation && !mergeError && <p className="catalogue-merge-dialog__hint" role="status"><AppIcon name="clock" /><span>Conferindo o histórico do duplicado e do destino…</span></p>}
    {preview && <><dl className="catalogue-merge-dialog__counts"><div><dt>Protocolos do duplicado</dt><dd>{preview.source_count}</dd></div><div><dt>Protocolos do destino</dt><dd>{preview.target_count}</dd></div></dl>{preview.open_count > 0 && <div className="catalogue-merge-dialog__message is-blocking" role="alert"><AppIcon name="help" /><div><strong>Mesclagem bloqueada</strong><p>Há {preview.open_count} atendimentos abertos usando esses cadastros. Aguarde seu encerramento para preservar as fichas em análise.</p></div></div>}</>}
    {(currentConfirmation?.error || mergeError) && <div className="catalogue-merge-dialog__message is-blocking" role="alert"><AppIcon name="help" /><div><strong>A conferência precisa ser refeita</strong><p>{mergeError || currentConfirmation?.error}</p><button type="button" className="button button--secondary button--small" disabled={busy} onClick={recheck}><AppIcon name="search" />Conferir os cadastros novamente</button></div></div>}
   </section>}
   <div id={`${titleId}-consequences`} className="catalogue-merge-dialog__message"><AppIcon name="document" /><div><strong>As fichas anteriores serão preservadas</strong><p>Seus textos e vínculos não serão reescritos. O histórico será reunido nas consultas e sugestões.</p></div></div>
   <div className="catalogue-merge-dialog__message is-caution"><AppIcon name="help" /><div><strong>Escolha o destino com atenção</strong><p>A mesclagem não tem desfazer automático. A data, sozinha, não determina qual cadastro é o correto.</p></div></div>
  </div>
  <footer className="catalogue-merge-dialog__actions"><button type="button" className="button button--primary" disabled={busy || Boolean(pendingReason)} aria-busy={busy} aria-describedby={`${titleId}-consequences`} onClick={merge}><AppIcon name={busy ? "clock" : pendingReason ? "help" : "hierarchy"} /><span>{busy ? "Mesclando…" : pendingReason || "Confirmar mesclagem neste destino"}</span></button></footer>
 </dialog>, document.body);
}
