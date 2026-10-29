"use client";
import { AppIcon } from "./app-icon";

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
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [target, setTarget] = useState<Target | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const noun = kind === "subject" ? "assunto" : "CDU";

  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { if (element?.open) element.close(); }; }, []);
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

  return <dialog ref={dialog} className="pronto-modal catalogue-merge-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2 id={titleId}>Mesclar {noun}</h2>
    <p><strong>Cadastro duplicado:</strong> {sourceLabel}</p>
    <p>Escolha o cadastro que será mantido para novas utilizações. Seus dados serão preservados; o duplicado ficará no histórico.</p>
    <label><span className="catalogue-field-label"><AppIcon name="search" />Buscar destino</span><input type="search" maxLength={120} value={query} disabled={busy} onChange={(event) => { setQuery(event.target.value); setTarget(null); setPreview(null); }} /></label>
    <fieldset disabled={busy} className="catalogue-merge-dialog__targets"><legend>Cadastro a manter</legend>
      {loading ? <p role="status">Buscando cadastros…</p> : targets.length === 0 ? <p>Nenhum destino encontrado. Ajuste a busca.</p> : targets.map((item) => <label key={item.record_key}>
        <input type="radio" name={titleId} checked={target?.record_key === item.record_key} onChange={() => { setPreview(null); setTarget(item); }} />
        <span><strong>{item.label}</strong>{item.description && <small>{item.description}</small>}</span>
      </label>)}
    </fieldset>
    {target && !preview && !error && <p role="status">Conferindo o histórico…</p>}
    {preview && <section className="catalogue-merge-dialog__preview" aria-label="Conferência da mesclagem">
      <p><strong>Será mantido:</strong> {preview.target_label}</p>
      <p>{preview.source_count} protocolos vinculados ao duplicado; {preview.target_count} ao destino.</p>
      <p>As fichas já feitas, seus textos e os vínculos dos protocolos não serão reescritos. O histórico será reunido nas consultas e sugestões. Esta mesclagem não tem desfazer automático.</p>
      {preview.open_count > 0 && <p role="alert">Há {preview.open_count} atendimentos abertos usando esses cadastros. Conclua ou cancele os atendimentos antes de mesclar.</p>}
    </section>}
    {error && <p className="notice notice--error" role="alert">{error}</p>}
    <div className="catalogue-merge-dialog__actions"><button type="button" className="button button--primary" disabled={busy || !preview || preview.open_count > 0} onClick={merge}><AppIcon name="hierarchy" />{busy ? "Mesclando…" : "Confirmar mesclagem"}</button><button type="button" className="button button--secondary" disabled={busy} onClick={onClose}><AppIcon name="close" />Cancelar</button></div>
  </dialog>;
}
