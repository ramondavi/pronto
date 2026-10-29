"use client";

import Link from "next/link";
import { CatalogueConfirmation } from "./catalogue-record-dialog";
import { ManualSubjectAuthorityForm } from "./manual-subject-authority-form";
import { SubjectAuthorityDetails } from "./subject-authority-details";
import { SubjectAuthorityImporter } from "./subject-authority-importer";
import { CatalogueMergeDialog } from "./catalogue-merge-dialog";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "@/components/app-icon";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { SavedForm, SaveButton } from "./saved-form";
import { createClient } from "@/lib/supabase/client";

type Term = { id: string; preferred_label_pt: string; preferred_label_en: string | null; active: boolean; usage_count: number; sources: string[]; total_count: number; merged_into_id?: string | null; merged_into_label?: string | null };
type Overview = { total_count: number; active_count: number; unused_count: number; without_source_count: number };
type Usage = { request_id: string; protocol: string; request_status: string; source_code: string | null; is_primary: boolean };

const sourceNames: Record<string, string> = { bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", loc: "Library of Congress", pronto: "Pronto! — termo local" };
const statusNames: Record<string, string> = { submitted: "Solicitado", in_review: "Em análise", changes_requested: "Ajustes solicitados", approved: "Aprovado", completed: "Concluído", canceled: "Cancelado" };

function Sources({ sources }: { sources: string[] }) {
  return <div className="controlled-terms-admin__sources" aria-label="Fontes registradas">
    <span>Fontes</span>
    {sources.length ? sources.map((source) => <span className="controlled-terms-admin__source" key={source}>{sourceNames[source] ?? source}</span>) : <span className="controlled-terms-admin__source is-missing">Não registrada</span>}
  </div>;
}

export function ControlledTermsAdmin() {
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [merging, setMerging] = useState<Term | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [review, setReview] = useState("all");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Term[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState<Term | null>(null);
  const [deleting, setDeleting] = useState<Term | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, Usage[]>>({});
  const [loadingUsage, setLoadingUsage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    createClient().rpc("admin_controlled_term_overview").then(({ data, error: loadError }) => {
      if (active && !loadError) setOverview((data?.[0] ?? null) as Overview | null);
    });
    return () => { active = false; };
  }, [revision]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const supabase = createClient();
      const parameters = { search_query: query, status_filter: status, review_filter: review, page_offset: offset };
      let response = await supabase.rpc("admin_subject_catalog", parameters);
      if (response.error?.code === "PGRST202") response = await supabase.rpc("admin_search_controlled_terms", parameters);
      const { data, error: loadError } = response;
      if (!active) return;
      if (loadError) setError("Não foi possível carregar os assuntos. Tente novamente.");
      else {
        const rows = (data ?? []) as Term[];
        if (!rows.length && offset > 0) { setOffset(Math.max(0, offset - 40)); return; }
        setItems(rows);
        setTotal(rows[0]?.total_count ?? 0);
        setError("");
      }
      setLoading(false);
    }, query ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, status, review, offset, revision]);

  useEffect(() => { if (deleting) confirmRef.current?.focus(); }, [deleting]);
  function refresh() { setRevision((value) => value + 1); }
  function chooseReview(value: string) { setReview(value); setOffset(0); }


  async function persist(term: Term, labelPt: string, labelEn: string, enabled: boolean) {
    if (labelPt === term.preferred_label_pt && labelEn === (term.preferred_label_en ?? "") && enabled === term.active) { setEditing(null); return true; }
    setBusy(term.id);
    const supabase = createClient();
    const { error: saveError } = await supabase.rpc("admin_save_controlled_term", { term_id: term.id, label_pt: labelPt, label_en: labelEn, enabled });
    const { data: saved, error: readError } = saveError ? { data: null, error: true } : await supabase.from("controlled_terms").select("preferred_label_pt,preferred_label_en,active").eq("id", term.id).single();
    setBusy(null);
    if (saveError || readError || saved?.preferred_label_pt !== labelPt || (saved.preferred_label_en ?? "") !== labelEn || saved.active !== enabled) {
      const reason = saveError?.message.includes("controlled_term_used_by_open_request") ? "Este assunto está em um atendimento aberto. Conclua ou cancele o protocolo antes de alterar o cadastro." : saveError?.code === "23505" ? "Já existe um assunto com essa forma em português ou inglês." : "Não foi possível confirmar o salvamento. Confira os nomes e tente novamente.";
      setError(reason); showPanelChangeError("Assunto não salvo", reason); return false;
    }
    setEditing(null); refresh();
    showPanelChange(enabled !== term.active ? enabled ? "Assunto ativado" : "Assunto desativado" : "Assunto atualizado", async () => {
      const { error: undoError } = await supabase.rpc("admin_save_controlled_term", { term_id: term.id, label_pt: term.preferred_label_pt, label_en: term.preferred_label_en ?? "", enabled: term.active });
      if (undoError) throw undoError;
      refresh();
    });
    return true;
  }

  async function showUsage(term: Term) {
    if (expanded === term.id) { setExpanded(null); return; }
    setExpanded(term.id);
    if (usage[term.id]) return;
    setLoadingUsage(term.id);
    const { data, error: usageError } = await createClient().rpc("admin_controlled_term_usage", { target_term_id: term.id });
    setLoadingUsage(null);
    if (usageError) { setError("Não foi possível carregar os protocolos deste assunto."); return; }
    setUsage((current) => ({ ...current, [term.id]: (data ?? []) as Usage[] }));
  }

  async function remove() {
    const term = deleting;
    if (!term) return;
    setBusy(term.id);
    const { error: removeError } = await createClient().rpc("admin_delete_unused_controlled_term", { term_id: term.id });
    setBusy(null); setDeleting(null);
    if (removeError) {
      const reason = "O assunto pode ter sido usado em um protocolo. Atualize a lista e, se necessário, desative-o.";
      setError(reason); showPanelChangeError("Assunto não excluído", reason); return;
    }
    refresh(); showPanelChange("Assunto sem uso excluído");
  }

  return <section className="panel admin-section controlled-terms-admin">
    <header className="admin-section__lead controlled-terms-admin__heading"><span className="admin-section__icon"><AppIcon name="tag" aria-hidden="true" /></span><div><p className="eyebrow">Catálogo de termos</p><h2>Vocabulário controlado</h2><p>Cadastre assuntos, revise os termos da catalogação e reúna duplicatas preservando as fichas anteriores.</p></div><button type="button" className="button button--primary button--small" aria-expanded={creating} onClick={() => { setCreating(!creating); setPreviewing(false); }}><AppIcon name={creating ? "close" : "tag"} />{creating ? "Fechar cadastro" : "Cadastrar manualmente"}</button><button type="button" className="button button--secondary button--small" aria-expanded={previewing} onClick={() => { setPreviewing(!previewing); setCreating(false); }}><AppIcon name={previewing ? "close" : "upload"} />{previewing ? "Fechar importação" : "Importar autoridade"}</button></header>

    {previewing && <SubjectAuthorityImporter source="bn" onClose={() => setPreviewing(false)} onImported={() => setRevision(value => value + 1)} />}
    {creating && <ManualSubjectAuthorityForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); setQuery(""); setStatus("all"); setReview("all"); setOffset(0); refresh(); showPanelChange("Autoridade manual cadastrada"); }} />}
    <div className="controlled-terms-admin__overview" aria-label="Resumo dos assuntos">
      <button type="button" className={status === "all" && review === "all" ? "is-selected" : ""} onClick={() => { setStatus("all"); chooseReview("all"); }}><AppIcon name="book" /><span><strong>{overview?.total_count ?? "—"}</strong> cadastrados</span></button>
      <button type="button" className={status === "active" && review === "all" ? "is-selected" : ""} onClick={() => { setStatus("active"); chooseReview("all"); }}><AppIcon name="check" /><span><strong>{overview?.active_count ?? "—"}</strong> ativos</span></button>
      <button type="button" className={review === "unused" ? "is-selected" : ""} onClick={() => chooseReview("unused")}><AppIcon name="archive" /><span><strong>{overview?.unused_count ?? "—"}</strong> sem uso</span></button>
      <button type="button" className={review === "without_source" ? "is-selected" : ""} onClick={() => chooseReview("without_source")}><AppIcon name="help" /><span><strong>{overview?.without_source_count ?? "—"}</strong> sem fonte</span></button>
    </div>

    <div className="controlled-terms-admin__toolbar">
      <label className="controlled-terms-admin__search"><span className="catalogue-field-label"><AppIcon name="search" />Buscar assunto</span><span className="controlled-terms-admin__search-control"><AppIcon name="search" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0); }} placeholder="Digite o termo em português ou inglês" /></span></label>
      <label><span className="catalogue-field-label"><AppIcon name="check" />Situação</span><select value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }}><option value="all">Todas</option><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="merged">Mesclados</option></select></label>
      <label><span className="catalogue-field-label"><AppIcon name="settings" />Mostrar</span><select value={review} onChange={(event) => chooseReview(event.target.value)}><option value="all">Todos</option><option value="unused">Sem uso</option><option value="used">Com uso</option><option value="without_source">Sem fonte registrada</option></select></label>
    </div>

    <div className="controlled-terms-admin__results"><p aria-live="polite">{loading ? "Carregando assuntos…" : `${total} ${total === 1 ? "assunto encontrado" : "assuntos encontrados"}`}</p>{(query || status !== "all" || review !== "all") && <button type="button" onClick={() => { setQuery(""); setStatus("all"); chooseReview("all"); }}><AppIcon name="close" />Limpar filtros</button>}</div>
    {error && <div className="notice notice--error controlled-terms-admin__error" role="alert"><span>{error}</span><button type="button" onClick={refresh}><AppIcon name="redo" />Tentar novamente</button></div>}

    <div className="controlled-terms-admin__list">{items.map((term) => <article className={`controlled-terms-admin__item${term.active ? "" : " is-inactive"}`} key={term.id}>
      {editing === term.id ? <SavedForm className="controlled-terms-admin__edit" onSave={(form) => persist(term, String(form.get("labelPt") ?? "").trim(), String(form.get("labelEn") ?? "").trim(), term.active)}><div className="controlled-terms-admin__edit-heading"><AppIcon name="edit" /><strong>Editar assunto</strong><span>As fichas anteriores preservam a forma registrada nelas.</span></div><div className="controlled-terms-admin__edit-fields"><label><span className="catalogue-field-label"><AppIcon name="tag" />Termo preferido em português</span><input name="labelPt" required minLength={2} maxLength={120} defaultValue={term.preferred_label_pt} /></label><label><span className="catalogue-field-label"><AppIcon name="globe" />Equivalente em inglês</span><input name="labelEn" maxLength={120} defaultValue={term.preferred_label_en ?? ""} /><small>Opcional, quando confirmado na fonte</small></label></div><Sources sources={term.sources} /><SubjectAuthorityDetails termId={term.id} label={term.preferred_label_pt} /><div className="controlled-terms-admin__actions"><SaveButton className="button button--primary button--small" disabled={busy === term.id}>Salvar alterações</SaveButton><button type="button" className="button button--secondary button--small" onClick={() => setEditing(null)}><AppIcon name="close" />Cancelar</button></div></SavedForm> : <>
        <div className="controlled-terms-admin__main"><div className="controlled-terms-admin__title"><strong><AppIcon name="tag" />{term.preferred_label_pt}</strong><span className={`controlled-terms-admin__state${term.active ? " is-active" : ""}`}>{term.merged_into_id ? "Mesclado" : term.active ? "Ativo" : "Inativo"}</span></div>{term.preferred_label_en && <p className="controlled-terms-admin__english"><span>Inglês</span>{term.preferred_label_en}</p>}<Sources sources={term.sources} /></div>
        <div className="controlled-terms-admin__side"><div className="controlled-terms-admin__usage"><AppIcon name="document" /><strong>{term.usage_count}</strong><span>{term.usage_count === 1 ? "protocolo" : "protocolos"}</span></div><div className="controlled-terms-admin__actions"><SubjectAuthorityDetails termId={term.id} label={term.preferred_label_pt} />{!term.merged_into_id && <><button type="button" className="button button--secondary button--small" onClick={() => { setEditing(term.id); setExpanded(null); }}><AppIcon name="edit" /> Editar</button><button type="button" className="button button--secondary button--small" disabled={busy === term.id} onClick={() => { if (term.active) setDeactivating(term); else void persist(term, term.preferred_label_pt, term.preferred_label_en ?? "", true); }}><AppIcon name={term.active ? "eyeOff" : "check"} />{term.active ? "Desativar" : "Ativar"}</button><button type="button" className="button button--secondary button--small" onClick={() => setMerging(term)}><AppIcon name="hierarchy" />Mesclar</button>{term.usage_count === 0 && <button type="button" className="button button--secondary button--small controlled-terms-admin__delete" onClick={() => setDeleting(term)}><AppIcon name="close" />Excluir</button>}</>}{term.merged_into_id && <span>Mesclado em {term.merged_into_label}</span>}</div></div>
        {term.usage_count > 0 && <div className="controlled-terms-admin__details"><button type="button" aria-expanded={expanded === term.id} onClick={() => showUsage(term)}>{expanded === term.id ? "Ocultar protocolos" : "Ver protocolos que usam este assunto"}<AppIcon name="chevronDown" /></button>{expanded === term.id && <div className="controlled-terms-admin__protocols">{loadingUsage === term.id ? <p>Carregando protocolos…</p> : (usage[term.id] ?? []).map((entry) => <Link key={entry.request_id} href={`/painel/atendimento/${entry.request_id}`}><strong>{entry.protocol}</strong><span>{statusNames[entry.request_status] ?? entry.request_status}{entry.is_primary ? " · Assunto principal" : ""}{entry.source_code ? ` · ${sourceNames[entry.source_code] ?? entry.source_code}` : " · Fonte não registrada"}</span><AppIcon name="arrowRight" /></Link>)}{term.usage_count > 30 && <p>Exibindo os 30 protocolos mais recentes.</p>}</div>}</div>}
      </>}
    </article>)}</div>

    {!loading && !error && items.length === 0 && <div className="controlled-terms-admin__empty"><AppIcon name="search" /><strong>Nenhum assunto encontrado</strong><p>Ajuste a busca ou limpe os filtros para ver outros termos.</p></div>}
    {total > 40 && <nav className="controlled-terms-admin__pages" aria-label="Páginas dos assuntos"><button className="button button--secondary button--small" type="button" disabled={offset === 0 || loading} onClick={() => setOffset((value) => Math.max(0, value - 40))}><AppIcon name="undo" />Anterior</button><span>Página {Math.floor(offset / 40) + 1} de {Math.ceil(total / 40)}</span><button className="button button--secondary button--small" type="button" disabled={offset + 40 >= total || loading} onClick={() => setOffset((value) => value + 40)}><AppIcon name="arrowRight" />Próxima</button></nav>}
    <p className="controlled-terms-admin__guidance"><AppIcon name="help" />Assuntos usados podem ser desativados, preservando as fichas anteriores. Um atendimento aberto impede alterações nesse cadastro; assuntos sem uso podem ser excluídos.</p>

    {deactivating && <CatalogueConfirmation title="Desativar assunto?" label="Confirmar desativação" onClose={() => setDeactivating(null)} onConfirm={async () => { try { return await persist(deactivating, deactivating.preferred_label_pt, deactivating.preferred_label_en ?? "", false); } finally { setBusy(null); } }}><div className="authority-record__identity"><AppIcon name="tag" /><strong>{deactivating.preferred_label_pt}</strong></div><p>Este assunto deixará de aparecer nas novas escolhas. As fichas e os protocolos anteriores serão preservados.</p><div className="notice"><AppIcon name="help" /><p>Você poderá ativá-lo novamente. Se houver atendimento aberto usando este assunto, o sistema impedirá a alteração.</p></div></CatalogueConfirmation>}
    {merging && <CatalogueMergeDialog kind="subject" sourceKey={merging.id} sourceLabel={merging.preferred_label_pt} onClose={() => setMerging(null)} onMerged={(_id, label) => { setMerging(null); setQuery(label); setStatus("active"); setReview("all"); setOffset(0); setUsage({}); setExpanded(null); refresh(); }} />}
    {deleting && createPortal(<div className="pronto-modal-overlay controlled-terms-admin__overlay" onKeyDown={(event) => { if (event.key === "Escape" && !busy) setDeleting(null); }}><section className="pronto-modal-surface controlled-terms-admin__dialog" role="dialog" aria-modal="true" aria-labelledby="delete-term-title" aria-describedby="delete-term-description"><p className="eyebrow">Excluir assunto</p><h2 id="delete-term-title">Excluir “{deleting.preferred_label_pt}”?</h2><p id="delete-term-description">Este assunto não está ligado a nenhum protocolo. A exclusão é permanente.</p><div className="controlled-terms-admin__actions"><button ref={confirmRef} type="button" className="button button--danger" disabled={busy === deleting.id} onClick={remove}>Excluir assunto</button><button type="button" className="button button--secondary" disabled={busy === deleting.id} onClick={() => setDeleting(null)}><AppIcon name="close" />Cancelar</button></div></section></div>, document.body)}
  </section>;
}
