"use client";
import { useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { createClient } from "@/lib/supabase/client";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";

type Entry = { cdu_code: string; description: string; composition_notes: string | null; auxiliary_codes: string[]; related_codes: string[]; source_reference: string | null; validated: boolean };
type Status = "all" | "pending" | "validated";
const pageSize = 20;

export function CduCatalogAdmin({ entries }: { entries: Entry[] }) {
  const [items, setItems] = useState(entries);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [creating, setCreating] = useState(false);
  const supabase = createClient();
  const pending = items.filter((entry) => !entry.validated).length;
  const withoutSource = items.filter((entry) => !entry.source_reference?.trim()).length;
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = items.filter((entry) => {
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
    if (items.some((entry) => entry.cdu_code === code)) { setMessage("Este código CDU já está cadastrado. Abra o registro existente para revisá-lo."); return; }
    setBusy("creating"); setMessage("");
    const { error } = await supabase.rpc("admin_create_cdu_code_description", { cdu_code_value: code, description_value: description, source_reference_value: source || null });
    if (error) {
      const detail = error.code === "23505" ? "Este código CDU já está cadastrado." : "Confira o código, a descrição e a conexão; depois tente novamente.";
      setMessage(detail); showPanelChangeError("CDU não cadastrada", detail);
    } else {
      const created: Entry = { cdu_code: code, description, composition_notes: null, auxiliary_codes: [], related_codes: [], source_reference: source || null, validated: false };
      setItems((current) => [...current, created].sort((a, b) => a.cdu_code.localeCompare(b.cdu_code, "pt-BR", { numeric: true })));
      setCreating(false); setStatus("all"); setQuery(code); setPage(0); showPanelChange("CDU cadastrada");
    }
    setBusy("");
  }
  async function save(entry: Entry, form: FormData) {
    setBusy(entry.cdu_code); setMessage("");
    const description = String(form.get("description") ?? "").trim();
    const composition = String(form.get("composition") ?? "").trim();
    const auxiliary = String(form.get("auxiliary") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const related = String(form.get("related") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const source = String(form.get("source") ?? "").trim();
    const validated = form.get("validated") === "on";
    const { error } = await supabase.rpc("admin_save_cdu_code_description", { cdu_code_value: entry.cdu_code, description_value: description, composition_notes_value: composition, auxiliary_codes_value: auxiliary, related_codes_value: related, source_reference_value: source, validated_value: validated });
    if (error) { setMessage("Não foi possível salvar o registro CDU."); showPanelChangeError("Registro CDU não salvo", "Confira a descrição e tente novamente."); }
    else {
      const updated = { ...entry, description, composition_notes: composition || null, auxiliary_codes: auxiliary, related_codes: related, source_reference: source || null, validated };
      setItems((current) => current.map((item) => item.cdu_code === entry.cdu_code ? updated : item));
      setEditing(null);
      showPanelChange("Registro CDU salvo", async () => {
        const { error: undoError } = await supabase.rpc("admin_save_cdu_code_description", { cdu_code_value: entry.cdu_code, description_value: entry.description, composition_notes_value: entry.composition_notes ?? "", auxiliary_codes_value: entry.auxiliary_codes, related_codes_value: entry.related_codes, source_reference_value: entry.source_reference ?? "", validated_value: entry.validated });
        if (undoError) throw undoError;
        setItems((current) => current.map((item) => item.cdu_code === entry.cdu_code ? entry : item));
      });
    }
    setBusy("");
  }

  return <section className="panel admin-section cdu-catalog-admin">
    <header className="cdu-catalog-admin__heading"><div><p className="eyebrow">Classificação</p><h2>Catálogo CDU</h2><p>Cadastre códigos com suas descrições, revise registros e confirme a validação técnica.</p></div><button className="button button--primary button--small" type="button" aria-expanded={creating} onClick={() => { setCreating((current) => !current); setMessage(""); }}><AppIcon name="book" />{creating ? "Fechar cadastro" : "Cadastrar CDU"}</button></header>
    {creating && <form className="cdu-catalog-admin__create" action={create}><div className="cdu-catalog-admin__create-heading"><AppIcon name="book" /><div><strong>Novo código CDU</strong><p>Informe a descrição conforme a edição impressa consultada. O registro fica pendente de validação.</p></div></div><div className="cdu-catalog-admin__create-fields"><label>Código CDU<input name="code" required maxLength={80} autoFocus placeholder="Ex.: 711.4" /></label><label>Descrição técnica<input name="description" required minLength={3} maxLength={1000} placeholder="Descrição conforme a CDU" /></label><label>Fonte consultada <small>Opcional; ajuda na revisão.</small><input name="source" maxLength={1000} placeholder="Ex.: CDU, 2ª edição impressa" /></label></div><div className="cdu-catalog-admin__create-actions"><button className="button button--primary button--small" disabled={busy === "creating"}>{busy === "creating" ? "Cadastrando…" : "Cadastrar código"}</button><button className="button button--secondary button--small" type="button" disabled={busy === "creating"} onClick={() => setCreating(false)}>Cancelar</button></div></form>}
    <div className="cdu-catalog-admin__overview" aria-label="Resumo do catálogo CDU">
      <button type="button" className={status === "all" ? "is-selected" : ""} onClick={() => chooseStatus("all")}><AppIcon name="book" /><span><strong>{items.length}</strong> cadastrados</span></button>
      <button type="button" className={status === "pending" ? "is-selected" : ""} onClick={() => chooseStatus("pending")}><AppIcon name="help" /><span><strong>{pending}</strong> pendentes</span></button>
      <button type="button" className={status === "validated" ? "is-selected" : ""} onClick={() => chooseStatus("validated")}><AppIcon name="check" /><span><strong>{items.length - pending}</strong> validados</span></button>
      <div className="cdu-catalog-admin__stat"><AppIcon name="document" /><span><strong>{withoutSource}</strong> sem fonte</span></div>
    </div>
    <div className="cdu-catalog-admin__toolbar"><label>Buscar código ou descrição<span className="cdu-catalog-admin__search"><AppIcon name="search" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); setEditing(null); }} placeholder="Código, descrição, auxiliar ou fonte" /></span></label><label>Situação<select value={status} onChange={(event) => chooseStatus(event.target.value as Status)}><option value="all">Todas</option><option value="pending">Pendentes</option><option value="validated">Validados</option></select></label></div>
    <div className="cdu-catalog-admin__results"><p aria-live="polite">{filtered.length} {filtered.length === 1 ? "código encontrado" : "códigos encontrados"}</p>{(query || status !== "all") && <button type="button" onClick={() => { setQuery(""); chooseStatus("all"); }}>Limpar filtros</button>}</div>
    {message && <p className="auth-feedback" role="status">{message}</p>}
    <div className="cdu-catalog-admin__list">{visible.map((entry) => <article className={`cdu-catalog-admin__item${entry.validated ? "" : " is-pending"}`} key={entry.cdu_code}>
      <div className="cdu-catalog-admin__item-heading"><div><span className="cdu-catalog-admin__code">CDU {entry.cdu_code}</span><span className={`cdu-catalog-admin__state${entry.validated ? " is-validated" : ""}`}>{entry.validated ? "Validado" : "Pendente"}</span></div><button type="button" className="button button--secondary button--small" aria-expanded={editing === entry.cdu_code} onClick={() => setEditing((current) => current === entry.cdu_code ? null : entry.cdu_code)}><AppIcon name="edit" />{editing === entry.cdu_code ? "Fechar edição" : "Revisar código"}</button></div>
      <p className="cdu-catalog-admin__description">{entry.description || "Descrição ainda não informada."}</p>
      <div className="cdu-catalog-admin__details"><span><strong>Fonte</strong>{entry.source_reference || "Não registrada"}</span><span><strong>Composição</strong>{entry.composition_notes ? "Registrada" : "Não registrada"}</span><span><strong>Auxiliares</strong>{entry.auxiliary_codes.length || "Nenhum"}</span><span><strong>Relacionados</strong>{entry.related_codes.length || "Nenhum"}</span></div>
      {editing === entry.cdu_code && <form className="cdu-catalog-admin__edit" action={(form) => save(entry, form)}><div className="cdu-catalog-admin__edit-fields"><label className="cdu-catalog-admin__wide">Descrição técnica <small>Reproduza a descrição da CDU consultada.</small><textarea name="description" required minLength={3} maxLength={1000} rows={2} defaultValue={entry.description} /></label><label className="cdu-catalog-admin__wide">Memória de composição<textarea name="composition" maxLength={4000} rows={3} defaultValue={entry.composition_notes ?? ""} /></label><label>Auxiliares empregados <small>Separe os códigos por vírgula.</small><input name="auxiliary" defaultValue={entry.auxiliary_codes.join(", ")} /></label><label>Códigos relacionados <small>Separe os códigos por vírgula.</small><input name="related" defaultValue={entry.related_codes.join(", ")} /></label><label className="cdu-catalog-admin__wide">Fonte consultada<input name="source" maxLength={1000} defaultValue={entry.source_reference ?? ""} /></label></div><div className="cdu-catalog-admin__edit-actions"><label className="compact-check"><input name="validated" type="checkbox" defaultChecked={entry.validated} /> Código validado</label><div><button className="button button--primary button--small" disabled={busy === entry.cdu_code}>{busy === entry.cdu_code ? "Salvando…" : "Salvar registro"}</button><button type="button" className="button button--secondary button--small" disabled={busy === entry.cdu_code} onClick={() => setEditing(null)}>Cancelar</button></div></div></form>}
    </article>)}</div>
    {filtered.length === 0 && <div className="cdu-catalog-admin__empty"><AppIcon name="search" /><strong>Nenhum código encontrado</strong><p>Ajuste a busca ou limpe os filtros para ver outros registros.</p></div>}
    {pageCount > 1 && <nav className="cdu-catalog-admin__pages" aria-label="Páginas do catálogo CDU"><button type="button" className="button button--secondary button--small" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setEditing(null); }}>Anterior</button><span>Página {currentPage + 1} de {pageCount}</span><button type="button" className="button button--secondary button--small" disabled={currentPage + 1 >= pageCount} onClick={() => { setPage(currentPage + 1); setEditing(null); }}>Próxima</button></nav>}
    <p className="cdu-catalog-admin__guidance"><AppIcon name="help" />A validação confirma a revisão técnica do registro. A escolha da CDU para cada ficha continua sendo feita pelo bibliotecário.</p>
  </section>;
}
