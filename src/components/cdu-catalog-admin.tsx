"use client";
import { CatalogueConfirmation } from "./catalogue-record-dialog";
import { cduMutationError } from "@/lib/cdu-mutation-error";
import { CduComposer } from "./cdu-composer";
import { CduStructureFields } from "./cdu-structure-fields";
import { cduKinds, cduPath, type CduStructure, type CduKind } from "@/lib/cdu-structure";
import { CduEditionSelect, defaultCduEdition } from "./cdu-edition-select";
import { useId, useState } from "react";
import { CatalogueMergeDialog } from "./catalogue-merge-dialog";
import { AppIcon } from "@/components/app-icon";
import { createClient } from "@/lib/supabase/client";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { SavedForm, SaveButton } from "./saved-form";

type Entry = CduStructure & { cdu_code: string; description: string; composition_notes: string | null; auxiliary_codes: string[]; related_codes: string[]; source_reference: string | null; validated: boolean; merged_into_code?: string | null };
type Status = "all" | "pending" | "validated" | "merged";
const pageSize = 20;

function structureValues(form: FormData) {
 return { kind_value: String(form.get("notationKind") ?? "unclassified"), parent_value: String(form.get("parentCode") ?? ""), scope_value: String(form.get("scopeCode") ?? ""), notes_value: String(form.get("usageNotes") ?? "") };
}
function structureEntry(form: FormData) {
 const values = structureValues(form);
 return { notation_kind: values.kind_value, parent_code: values.parent_value || null, auxiliary_scope_code: values.scope_value || null, usage_notes: values.notes_value || null };
}

export function CduCatalogAdmin({ entries }: { entries: Entry[] }) {
  const [items, setItems] = useState(entries);
  const [query, setQuery] = useState("");
  const [hierarchyRoot, setHierarchyRoot] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [validationRemoval, setValidationRemoval] = useState<{ entry: Entry; form: FormData; resolve: (saved: boolean) => void } | null>(null);
  const [merging, setMerging] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const [composing, setComposing] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const addPanelId = useId();
  const supabase = createClient();
  const currentItems = items.filter((entry) => !entry.merged_into_code);
  const pending = currentItems.filter((entry) => !entry.validated).length;
  const withoutSource = currentItems.filter((entry) => !entry.source_reference?.trim()).length;
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = items.filter((entry) => {
    if (hierarchyRoot && !cduPath(entry.cdu_code, items).includes(hierarchyRoot) && !(entry.auxiliary_scope_code && cduPath(entry.auxiliary_scope_code, items).includes(hierarchyRoot))) return false;
    if (status === "merged" ? !entry.merged_into_code : entry.merged_into_code) return false;
    if (status === "pending" && entry.validated) return false;
    if (status === "validated" && !entry.validated) return false;
    if (!normalizedQuery) return true;
    return [entry.cdu_code, entry.description, entry.composition_notes ?? "", entry.source_reference ?? "", ...entry.auxiliary_codes, ...entry.related_codes].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  function chooseStatus(next: Status) { setStatus(next); setPage(0); setEditing(null); }
  async function create(form: FormData) {
    const code = String(form.get("code") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const source = String(form.get("source") ?? "").trim();
    if (items.some(entry => entry.cdu_code === code)) { setMessage("Este código CDU já está cadastrado. Abra o registro existente para revisá-lo."); return; }
    setBusy("creating"); setMessage("");
    try {
      const { error } = await supabase.rpc("admin_create_cdu_entry", { cdu_code_value: code, description_value: description, source_reference_value: source || null, ...structureValues(form) });
      if (error) throw error;
      const created: Entry = { cdu_code: code, description, composition_notes: null, auxiliary_codes: [], related_codes: [], source_reference: source || null, validated: false, ...structureEntry(form) };
      setItems(current => [...current, created].sort((a, b) => a.cdu_code.localeCompare(b.cdu_code, "pt-BR", { numeric: true })));
      setCreating(false); setStatus("all"); setQuery(code); setPage(0); showPanelChange("CDU cadastrada");
    } catch (error) {
      const detail = cduMutationError(error && typeof error === "object" ? error : null);
      setMessage(detail); showPanelChangeError("CDU não cadastrada", detail);
    } finally { setBusy(""); }
  }
  async function requestSave(entry: Entry, form: FormData) {
    if (entry.validated && form.get("validated") !== "on") return new Promise<boolean>(resolve => setValidationRemoval({ entry, form, resolve }));
    return save(entry, form);
  }
  async function save(entry: Entry, form: FormData) {
    setBusy(entry.cdu_code); setMessage("");
    const description = String(form.get("description") ?? "").trim();
    const composition = String(form.get("composition") ?? "").trim();
    const auxiliary = String(form.get("auxiliary") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const related = String(form.get("related") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const source = String(form.get("source") ?? "").trim();
    const validated = form.get("validated") === "on";
    const { error } = await supabase.rpc("admin_save_cdu_entry", { ...structureValues(form), cdu_code_value: entry.cdu_code, description_value: description, composition_notes_value: composition, auxiliary_codes_value: auxiliary, related_codes_value: related, source_reference_value: source, validated_value: validated });
    const { data: persisted, error: readError } = error ? { data: null, error: true } : await supabase.from("cdu_code_descriptions").select("description,composition_notes,auxiliary_codes,related_codes,source_reference,validated,parent_code,notation_kind,auxiliary_scope_code,usage_notes").eq("cdu_code", entry.cdu_code).single();
    const confirmed = !readError && persisted?.notation_kind === String(form.get("notationKind") ?? "unclassified") && (persisted.parent_code ?? "") === String(form.get("parentCode") ?? "") && (persisted.auxiliary_scope_code ?? "") === String(form.get("scopeCode") ?? "") && (persisted.usage_notes ?? "") === String(form.get("usageNotes") ?? "").trim() && persisted?.description === description && (persisted.composition_notes ?? "") === composition && (persisted.source_reference ?? "") === source && persisted.validated === validated && JSON.stringify(persisted.auxiliary_codes) === JSON.stringify(auxiliary) && JSON.stringify(persisted.related_codes) === JSON.stringify(related);
    if (!confirmed) { setMessage("Não foi possível confirmar o registro CDU salvo."); showPanelChangeError("Registro CDU não confirmado", "Confira a descrição e tente novamente."); }
    else {
      const updated = { ...entry, ...structureEntry(form), description, composition_notes: composition || null, auxiliary_codes: auxiliary, related_codes: related, source_reference: source || null, validated };
      setItems((current) => current.map((item) => item.cdu_code === entry.cdu_code ? updated : item));
      setEditing(null);
      showPanelChange("Registro CDU salvo", async () => {
        const { error: undoError } = await supabase.rpc("admin_save_cdu_entry", { kind_value: entry.notation_kind ?? "unclassified", parent_value: entry.parent_code ?? "", scope_value: entry.auxiliary_scope_code ?? "", notes_value: entry.usage_notes ?? "", cdu_code_value: entry.cdu_code, description_value: entry.description, composition_notes_value: entry.composition_notes ?? "", auxiliary_codes_value: entry.auxiliary_codes, related_codes_value: entry.related_codes, source_reference_value: entry.source_reference ?? "", validated_value: entry.validated });
        if (undoError) throw undoError;
        setItems((current) => current.map((item) => item.cdu_code === entry.cdu_code ? entry : item));
      });
    }
    setBusy("");
    return confirmed;
  }

  return <section className="panel admin-section cdu-catalog-admin">
    {validationRemoval && <CatalogueConfirmation title="Retirar validação da CDU?" label="Confirmar retirada da validação" onClose={() => { validationRemoval.resolve(false); setValidationRemoval(null); }} onConfirm={async () => { try { const saved = await save(validationRemoval.entry, validationRemoval.form); if (saved) validationRemoval.resolve(true); return saved; } finally { setBusy(""); } }}><div className="authority-record__identity"><AppIcon name="book" /><strong>CDU {validationRemoval.entry.cdu_code}</strong></div><p>O código passará de validado para pendente de revisão. Esta ação não exclui o cadastro nem altera as fichas anteriores.</p><div className="notice"><AppIcon name="help" /><p>Retirar a validação não equivale a desativar o código. As demais alterações deste formulário também serão salvas ao confirmar.</p></div></CatalogueConfirmation>}
    <header className="admin-section__lead cdu-catalog-admin__heading"><span className="admin-section__icon"><AppIcon name="book" aria-hidden="true" /></span><div><p className="eyebrow">Classificação</p><h2>Repertório local de CDU</h2><p>Cadastre códigos com suas descrições, revise registros e confirme a validação técnica.</p></div><button className="button button--primary button--small" type="button" aria-expanded={choosing || creating || composing} aria-controls={addPanelId} onClick={() => { setChoosing(!(choosing || creating || composing)); setCreating(false); setComposing(false); setMessage(""); }}><AppIcon name="book" />Adicionar CDU</button></header>
    <div id={addPanelId} hidden={!choosing && !creating && !composing}>
      {choosing && <section className="cdu-add-options" aria-labelledby={`${addPanelId}-heading`}>
        <h3 id={`${addPanelId}-heading`}>Como deseja adicionar a CDU?</h3>
        <div className="cdu-add-options__choices">
          <button type="button" onClick={() => { setChoosing(false); setCreating(true); }}><AppIcon name="edit" /><span><strong>Cadastrar um código</strong><small>Informar uma classe, um auxiliar ou uma notação completa manualmente.</small></span><AppIcon name="arrowRight" /></button>
          <button type="button" onClick={() => { setChoosing(false); setComposing(true); }}><AppIcon name="hierarchy" /><span><strong>Montar uma notação</strong><small>Combinar códigos e auxiliares já cadastrados, com montagem guiada.</small></span><AppIcon name="arrowRight" /></button>
        </div>
      </section>}

    {composing && <CduComposer actionLabel="Salvar composição no catálogo" onClose={() => setComposing(false)} onUse={(stored) => {
      const entry: Entry = { ...stored, composition_notes: stored.composition_notes ?? null, auxiliary_codes: stored.auxiliary_codes ?? [], related_codes: stored.related_codes ?? [] };
      setItems((current) => [...current.filter((item) => item.cdu_code !== entry.cdu_code), entry].sort((a, b) => a.cdu_code.localeCompare(b.cdu_code, "pt-BR", { numeric: true })));
      setComposing(false); setQuery(entry.cdu_code); setHierarchyRoot(""); setStatus("all"); setPage(0); setEditing(entry.cdu_code);
      showPanelChange("Composição disponível no catálogo", undefined);
    }} />}
    {creating && <form className="cdu-catalog-admin__create catalogue-workflow" onSubmit={event => { event.preventDefault(); if (busy !== "creating") void create(new FormData(event.currentTarget)); }}>
      <header className="catalogue-workflow__header"><span className="catalogue-workflow__icon"><AppIcon name="book" /></span><div><p className="eyebrow">Repertório da biblioteca</p><h3>Novo código CDU</h3><p>Registre a notação e sua descrição na edição consultada. O cadastro ficará pendente de validação.</p></div></header>
      <fieldset disabled={busy === "creating"} className="catalogue-workflow__section"><legend>Identificação do código</legend><div className="cdu-catalog-admin__create-fields">
        <label><span className="catalogue-field-label"><AppIcon name="tag" />Código CDU</span><input name="code" required maxLength={80} autoFocus placeholder="Ex.: 7 ou 711.4" /><small>Classes com um único algarismo também são aceitas.</small></label>
        <label><span className="catalogue-field-label"><AppIcon name="book" />Edição consultada</span><CduEditionSelect name="source" defaultValue={defaultCduEdition} required /></label>
        <label className="catalogue-workflow__wide"><span className="catalogue-field-label"><AppIcon name="document" />Descrição técnica</span><textarea name="description" required minLength={3} maxLength={1000} rows={2} placeholder="Descrição conforme a edição da CDU consultada" /></label>
      </div></fieldset>
      <fieldset disabled={busy === "creating"} className="catalogue-workflow__structure"><CduStructureFields entries={items} /></fieldset>
      {message && <p role="alert" className="notice notice--error">{message}</p>}
      <footer className="catalogue-workflow__actions"><button className="button button--secondary button--small" type="button" disabled={busy === "creating"} onClick={() => { setCreating(false); setMessage(""); }}><AppIcon name="close" />Cancelar</button><button className="button button--primary button--small" disabled={busy === "creating"}><AppIcon name="check" />{busy === "creating" ? "Cadastrando…" : "Cadastrar código"}</button></footer>
    </form>}
    </div>
    <div className="cdu-catalog-admin__overview" aria-label="Resumo do catálogo CDU">
      <button type="button" className={status === "all" ? "is-selected" : ""} onClick={() => chooseStatus("all")}><AppIcon name="book" /><span><strong>{currentItems.length}</strong> cadastrados</span></button>
      <button type="button" className={status === "pending" ? "is-selected" : ""} onClick={() => chooseStatus("pending")}><AppIcon name="help" /><span><strong>{pending}</strong> pendentes</span></button>
      <button type="button" className={status === "validated" ? "is-selected" : ""} onClick={() => chooseStatus("validated")}><AppIcon name="check" /><span><strong>{currentItems.length - pending}</strong> validados</span></button>
      <div className="cdu-catalog-admin__stat"><AppIcon name="document" /><span><strong>{withoutSource}</strong> sem fonte</span></div>
    </div>
    <div className="cdu-catalog-admin__toolbar"><label className="catalogue-hierarchy-filter"><span className="catalogue-field-label"><AppIcon name="hierarchy" />Navegar pela hierarquia</span><select value={hierarchyRoot} onChange={(event) => { setHierarchyRoot(event.target.value); setPage(0); setQuery(""); }}><option value="">Todo o repertório local</option>{currentItems.map((item) => <option key={item.cdu_code} value={item.cdu_code}>{cduPath(item.cdu_code, items).join(" › ")} — {item.description}</option>)}</select></label><label><span className="catalogue-field-label"><AppIcon name="search" />Buscar código ou descrição</span><span className="cdu-catalog-admin__search"><AppIcon name="search" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); setEditing(null); }} placeholder="Código, descrição, auxiliar ou fonte" /></span></label><label><span className="catalogue-field-label"><AppIcon name="check" />Situação</span><select value={status} onChange={(event) => chooseStatus(event.target.value as Status)}><option value="all">Todas</option><option value="pending">Pendentes</option><option value="validated">Validados</option><option value="merged">Mesclados</option></select></label></div>
    <div className="cdu-catalog-admin__results"><p aria-live="polite">{filtered.length} {filtered.length === 1 ? "código encontrado" : "códigos encontrados"}</p>{(query || status !== "all") && <button type="button" onClick={() => { setQuery(""); chooseStatus("all"); }}><AppIcon name="close" />Limpar filtros</button>}</div>
    {message && !creating && <p className="notice notice--error" role="alert">{message}</p>}
    <div className="cdu-catalog-admin__list">{visible.map((entry) => <article className={`cdu-catalog-admin__item${entry.validated ? "" : " is-pending"}`} key={entry.cdu_code}>
      <div className="cdu-catalog-admin__item-heading"><div><span className="cdu-catalog-admin__code">CDU {entry.cdu_code}</span><span className={`cdu-catalog-admin__state${entry.validated ? " is-validated" : ""}`}>{entry.validated ? "Validado" : "Pendente"}</span></div>{!entry.merged_into_code && <div className="catalogue-inline-actions"><button type="button" className="button button--secondary button--small" onClick={() => setMerging(entry)}><AppIcon name="hierarchy" />Mesclar</button><button type="button" className="button button--secondary button--small" aria-expanded={editing === entry.cdu_code} onClick={() => setEditing((current) => current === entry.cdu_code ? null : entry.cdu_code)}><AppIcon name="edit" />{editing === entry.cdu_code ? "Fechar edição" : "Revisar código"}</button></div>}</div>
      {entry.merged_into_code && <p>Mesclado no código <strong>{entry.merged_into_code}</strong>. Este registro foi preservado para consulta histórica.</p>}
      <p className="cdu-catalog-admin__taxonomy">{cduKinds[(entry.notation_kind ?? "unclassified") as CduKind]} · {cduPath(entry.cdu_code, items).join(" › ")}{entry.auxiliary_scope_code && ` · Âmbito: ${entry.auxiliary_scope_code}`}</p><p className="cdu-catalog-admin__description">{entry.description || "Descrição ainda não informada."}</p>
      <div className="cdu-catalog-admin__details"><span><strong>Edição / fonte registrada</strong>{entry.source_reference || "Não registrada"}</span><span><strong>Composição</strong>{entry.composition_notes ? "Registrada" : "Não registrada"}</span><span><strong>Auxiliares</strong>{entry.auxiliary_codes.length || "Nenhum"}</span><span><strong>Relacionados</strong>{entry.related_codes.length || "Nenhum"}</span></div>
      {(entry.auxiliary_codes.length > 0 || entry.related_codes.length > 0) && <div className="catalogue-inline-actions">{[{ label: "Auxiliar", codes: entry.auxiliary_codes }, { label: "Relacionado", codes: entry.related_codes }].flatMap((group) => group.codes.map((code) => <button key={`${group.label}:${code}`} type="button" className="button button--secondary button--small" onClick={() => { setHierarchyRoot(""); setStatus("all"); setQuery(items.find((item) => item.cdu_code === code)?.merged_into_code ?? code); setPage(0); }}><AppIcon name="link" />{group.label}: {code}</button>))}</div>}
      {editing === entry.cdu_code && <SavedForm className="cdu-catalog-admin__edit catalogue-workflow" onSave={(form) => requestSave(entry, form)}><div className="cdu-catalog-admin__edit-fields"><label className="cdu-catalog-admin__wide"><span className="catalogue-field-label"><AppIcon name="document" />Descrição técnica</span><textarea name="description" required minLength={3} maxLength={1000} rows={2} defaultValue={entry.description} /><small>Reproduza a descrição da CDU consultada.</small></label><label className="cdu-catalog-admin__wide"><span className="catalogue-field-label"><AppIcon name="document" />Memória de composição</span><textarea name="composition" maxLength={4000} rows={3} defaultValue={entry.composition_notes ?? ""} /></label><label><span className="catalogue-field-label"><AppIcon name="tag" />Auxiliares empregados</span><input name="auxiliary" defaultValue={entry.auxiliary_codes.join(", ")} /><small>Separe os códigos por vírgula.</small></label><label><span className="catalogue-field-label"><AppIcon name="hierarchy" />Códigos relacionados</span><input name="related" defaultValue={entry.related_codes.join(", ")} /><small>Separe os códigos por vírgula.</small></label><label className="cdu-catalog-admin__wide"><span className="catalogue-field-label"><AppIcon name="book" />Edição da CDU</span><CduEditionSelect name="source" defaultValue={entry.source_reference ?? ""} /></label></div><CduStructureFields entry={entry} entries={items} /><div className="cdu-catalog-admin__edit-actions"><label className="compact-check"><input name="validated" type="checkbox" defaultChecked={entry.validated} /> Código validado</label><div><SaveButton className="button button--primary button--small" disabled={busy === entry.cdu_code}>Salvar registro</SaveButton><button type="button" className="button button--secondary button--small" disabled={busy === entry.cdu_code} onClick={() => setEditing(null)}><AppIcon name="close" />Cancelar</button></div></div></SavedForm>}
    </article>)}</div>
    {filtered.length === 0 && <div className="cdu-catalog-admin__empty"><AppIcon name="search" /><strong>Nenhum código encontrado</strong><p>Ajuste a busca ou limpe os filtros para ver outros registros.</p></div>}
    {pageCount > 1 && <nav className="cdu-catalog-admin__pages" aria-label="Páginas do catálogo CDU"><button type="button" className="button button--secondary button--small" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setEditing(null); }}><AppIcon name="undo" />Anterior</button><span>Página {currentPage + 1} de {pageCount}</span><button type="button" className="button button--secondary button--small" disabled={currentPage + 1 >= pageCount} onClick={() => { setPage(currentPage + 1); setEditing(null); }}><AppIcon name="arrowRight" />Próxima</button></nav>}
    {merging && <CatalogueMergeDialog kind="cdu" sourceKey={merging.cdu_code} sourceLabel={`${merging.cdu_code} — ${merging.description}`} onClose={() => setMerging(null)} onMerged={(key) => { const source = merging.cdu_code; setItems((current) => current.map((item) => item.cdu_code === source || item.merged_into_code === source ? { ...item, merged_into_code: key } : item)); setMerging(null); setEditing(null); setStatus("all"); setQuery(key); setPage(0); }} />}
    <p className="cdu-catalog-admin__guidance"><AppIcon name="help" />A validação confirma a revisão técnica do registro. A escolha da CDU para cada ficha continua sendo feita pelo bibliotecário.</p>
  </section>;
}
