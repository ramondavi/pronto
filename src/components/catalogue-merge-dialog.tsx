"use client";
import { AppIcon } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";
import { createPortal } from "react-dom";

import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { showPanelChange } from "./panel-change-toast";

type Target = { record_key: string; label: string; description: string };
type Preview = { source_label: string; target_label: string; source_count: number; target_count: number; open_count: number; source_version: string; target_version: string };

export function CatalogueMergeDialog({ kind, sourceKey, sourceLabel, onClose, onMerged }: {
  kind: "subject" | "cdu"; sourceKey: string; sourceLabel: string;
  onClose: () => void; onMerged: (targetKey: string, targetLabel: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const noun = kind === "subject" ? "assunto" : "CDU";

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    element?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
    return () => {
      if (element?.open) element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [mounted]);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const { data, error: failure } = await createClient().rpc("admin_catalogue_merge_targets", { catalogue_kind: kind, source_key: sourceKey, search_query: query });
      if (!active) return;
      setTargets(failure ? [] : (data ?? []) as Target[]);
      setError(failure ? "Não foi possível consultar os destinos. Esta opção precisa estar disponível nesta prévia." : "");
      setLoading(false);
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [kind, sourceKey, query]);
  useEffect(() => {
    let active = true;
    if (!target) return;
    createClient().rpc("admin_catalogue_merge_preview", { catalogue_kind: kind, source_key: sourceKey, target_key: target.record_key }).then(({ data, error: failure }) => {
      if (!active) return;
      setPreview(failure ? null : data as Preview);
      setError(failure ? "Não foi possível conferir os registros. Selecione o destino novamente." : "");
    });
    return () => { active = false; };
  }, [kind, sourceKey, target]);

  async function merge() {
    if (!preview || !target || busy || preview.open_count > 0) return;
    setBusy(true); setError("");
    const { error: failure } = await createClient().rpc("admin_merge_catalogue", {
      catalogue_kind: kind, source_key: sourceKey, target_key: target.record_key,
      expected_source_version: preview.source_version, expected_target_version: preview.target_version,
    });
    setBusy(false);
    if (failure) {
      setPreview(null);
      setError(failure.message.includes("catalogue_merge_open_requests") ? "Um dos cadastros passou a ser usado em atendimento aberto. Encerre esse atendimento antes de mesclar." : "Os cadastros podem ter mudado. Selecione novamente o destino e confira antes de tentar outra vez.");
      return;
    }
    showPanelChange(kind === "subject" ? "Assuntos mesclados" : "Códigos CDU mesclados");
    onMerged(target.record_key, target.label);
  }

  if (!mounted) return null;
  const actionLabel = busy ? "Mesclando…" : !target ? "Escolha o cadastro a manter" : !preview ? (error ? "Confira o destino novamente" : "Conferindo o destino…") : preview.open_count > 0 ? "Há atendimentos abertos" : "Confirmar mesclagem";
  return createPortal(<dialog ref={dialog} className="pronto-modal catalogue-merge-dialog" aria-labelledby={titleId} aria-describedby={`${titleId}-description`} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="catalogue-modal__header"><h2 id={titleId}><AppIcon name="hierarchy" />Mesclar {noun}</h2><ModalCloseButton onClick={onClose} disabled={busy} label="Fechar mesclagem" /></header>
    <div className="catalogue-merge-dialog__body">
      <p id={`${titleId}-description`}>Escolha o cadastro que será mantido nas próximas utilizações. O duplicado continuará registrado no histórico.</p>
      <section className="catalogue-merge-dialog__source" aria-label="Cadastro duplicado"><AppIcon name={kind === "subject" ? "tag" : "book"} /><div><small>Cadastro duplicado</small><strong>{sourceLabel}</strong></div></section>
      <label><span className="catalogue-field-label"><AppIcon name="search" />Buscar cadastro a manter</span><input type="search" maxLength={120} value={query} disabled={busy} placeholder={kind === "subject" ? "Digite o assunto que deve permanecer" : "Digite o código ou a descrição CDU"} onChange={(event) => { setQuery(event.target.value); setLoading(true); setTarget(null); setPreview(null); }} /></label>
      <fieldset disabled={busy} className="catalogue-merge-dialog__targets"><legend>Selecione o destino</legend>
        {loading ? <p className="field-help" role="status">Buscando cadastros…</p> : targets.length === 0 ? <p className="field-help">Nenhum destino encontrado. Ajuste a busca.</p> : targets.map((item) => <label key={item.record_key} className={target?.record_key === item.record_key ? "is-selected" : undefined}>
          <input type="radio" name={titleId} checked={target?.record_key === item.record_key} onChange={() => { setPreview(null); setTarget(item); }} />
          <span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span>
        </label>)}
      </fieldset>
      {target && !preview && !error && <p className="field-help" role="status">Conferindo o histórico…</p>}
      {preview && <section className="catalogue-merge-dialog__preview" aria-label="Conferência da mesclagem">
        <h3><AppIcon name="check" />Confira antes de mesclar</h3><div className="catalogue-merge-dialog__destination"><small>Cadastro que será mantido</small><strong>{preview.target_label}</strong></div>
        <dl className="catalogue-merge-dialog__counts"><div><dt>Protocolos do duplicado</dt><dd>{preview.source_count}</dd></div><div><dt>Protocolos do destino</dt><dd>{preview.target_count}</dd></div></dl>
        <p>As fichas já feitas, seus textos e vínculos serão preservados. O histórico será reunido nas consultas e sugestões.</p>
        <p className="field-help"><AppIcon name="help" />Esta mesclagem não tem desfazer automático.</p>
        {preview.open_count > 0 && <p className="notice notice--error" role="alert">Há {preview.open_count} atendimentos abertos usando esses cadastros. Conclua ou cancele os atendimentos antes de mesclar.</p>}
      </section>}
      {error && <div className="notice notice--error" role="alert"><p>{error}</p>{target && !busy && <button type="button" className="button button--secondary button--small" onClick={() => { setPreview(null); setError(""); setTarget({ ...target }); }}>Conferir destino novamente</button>}</div>}
    </div>
    <footer className="catalogue-merge-dialog__actions"><button type="button" className="button button--primary" disabled={busy || !preview || preview.open_count > 0} onClick={merge}><AppIcon name={!preview || preview.open_count > 0 ? "help" : "hierarchy"} />{actionLabel}</button></footer>
  </dialog>, document.body);
}
