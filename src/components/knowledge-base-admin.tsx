"use client";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { knowledgeCategories, type KnowledgeEntry, type KnowledgeTranslation } from "@/lib/knowledge-base";
import { fallbackKnowledgeTranslation } from "@/lib/knowledge-translations";
import { supportedLanguages, languageLabels, type InterfaceLanguage } from "@/lib/interface-language";
import { AppIcon, type AppIconName } from "./app-icon";
import { RichTextEditor } from "./rich-text-editor";

export type { KnowledgeEntry } from "@/lib/knowledge-base";
const kindLabels = { faq: "Pergunta frequente", answer: "Resposta rápida", article: "Artigo completo" };
const kindIcons: Record<KnowledgeEntry["kind"], AppIconName> = { faq: "help", answer: "review", article: "book" };
const audienceOptions = [
  ["public", "Página pública"], ["student", "Estudante"], ["cataloger", "Bibliotecário"],
  ["administrator", "Administrador"], ["panel", "Painel interno"],
] as const;
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString("pt-BR") : "—";

function FieldTooltip({ text }: { text: string }) {
  return <span className="tooltip" tabIndex={0} aria-label={text}>?<span role="tooltip">{text}</span></span>;
}

function KnowledgeCard({ entry, expanded, onToggle, onSaved, faqOnly, canEdit, initialLanguage }: {
  entry: KnowledgeEntry; expanded: boolean; onToggle: () => void; onSaved: (oldId: string, saved: KnowledgeEntry) => void; faqOnly: boolean; canEdit: boolean; initialLanguage: InterfaceLanguage;
}) {
  const [kind, setKind] = useState(entry.kind);
  const [editLanguage, setEditLanguage] = useState<InterfaceLanguage>(initialLanguage);
  const [localized, setLocalized] = useState<Record<InterfaceLanguage, KnowledgeTranslation>>(() => Object.fromEntries(supportedLanguages.map((language) => {
    if (language === "pt") return [language, { title: entry.title, summary: entry.summary, body_html: entry.body_html }];
    const fallback = fallbackKnowledgeTranslation(entry, language);
    const saved = entry.translations?.[language];
    return [language, {
      title: saved?.title || fallback?.title || "",
      summary: saved?.summary || fallback?.summary || "",
      body_html: saved?.body_html || fallback?.body_html || "<p></p>",
    }];
  })) as Record<InterfaceLanguage, KnowledgeTranslation>);
  const updateLocalized = (field: keyof KnowledgeTranslation, value: string) => setLocalized((current) => ({ ...current, [editLanguage]: { ...current[editLanguage], [field]: value } }));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const supabase = createClient();
  const formId = `knowledge-${entry.id}`;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const audiences = form.getAll("audiences").map(String);
    if (!audiences.length) { setFeedback("Selecione pelo menos um público."); return; }
    if (!localized.pt.body_html.replace(/<[^>]*>/g, "").trim()) { setFeedback("Preencha o conteúdo completo em português."); return; }
    if (localized.pt.title.trim().length < 5 || localized.pt.summary.trim().length < 5) { setFeedback("Preencha título e resumo em português."); return; }
    setSaving(true); setFeedback("");
    const payload = {
      entry_id: /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(entry.id) ? entry.id : null,
      entry_slug: kind === "article" ? String(form.get("slug")).trim() : "",
      entry_kind: kind,
      entry_title: localized.pt.title.trim(),
      entry_summary: localized.pt.summary.trim(),
      entry_body_html: localized.pt.body_html,
      entry_category: String(form.get("category")),
      entry_audiences: audiences,
      entry_active: form.get("active") === "on",
      entry_position: Number(form.get("position")),
      entry_featured_position: kind === "faq" && form.get("featured_position") ? Number(form.get("featured_position")) : null,
      entry_translations: Object.fromEntries(supportedLanguages.filter((language) => language !== "pt").map((language) => [language, localized[language]])),
    };
    const { data: id, error } = await supabase.rpc("admin_save_knowledge_base_entry_localized", payload);
    if (error || !id) {
      setFeedback(error?.code === "PGRST202" || error?.code === "42P01" ? "A nova base ainda precisa ser aplicada ao banco para permitir o salvamento." : "Não foi possível salvar. Confira os campos e tente novamente.");
      showPanelChangeError("Conteúdo não salvo", error?.code === "PGRST202" || error?.code === "42P01" ? "A atualização necessária do banco ainda não foi aplicada. Avise a administração." : "Confira os campos e tente novamente.");
      setSaving(false); return;
    }
    const { data: saved, error: readError } = await supabase.from("knowledge_base_entries")
      .select("id,slug,kind,title,summary,body_html,translations,category,audiences,active,position,featured_position,created_at,updated_at,published_at")
      .eq("id", String(id)).single();
    if (readError || !saved) { setFeedback("O banco recebeu a alteração, mas não foi possível confirmá-la."); showPanelChangeError("Salvamento não confirmado", "Atualize a página para verificar se a alteração foi registrada."); }
    else { onSaved(entry.id, saved as KnowledgeEntry); showPanelChange("Conteúdo salvo"); }
    setSaving(false);
  }

  return <article id={`knowledge-entry-${entry.id}`} className="knowledge-card">
    <button type="button" className="knowledge-card__summary" aria-expanded={expanded} aria-controls={formId} onClick={onToggle}>
      <span className="knowledge-card__icon"><AppIcon name={kindIcons[entry.kind]} /></span>
      <span className="knowledge-card__identity"><span className="knowledge-card__kind">{kindLabels[entry.kind]}</span><strong>{entry.title || "Novo conteúdo"}</strong></span>
      <span className="knowledge-card__meta"><span className={entry.active ? "knowledge-card__status is-published" : "knowledge-card__status"}>{entry.active ? "Publicado" : "Rascunho"}</span><small>Publicado: {dateLabel(entry.published_at)} · Atualizado: {dateLabel(entry.updated_at)}</small></span>
      <AppIcon name={expanded ? "panelCollapse" : "panelExpand"} className="knowledge-card__toggle-icon" />
    </button>
    {expanded && <form id={formId} className="knowledge-card__editor" onSubmit={save} inert={!canEdit}>
      <div className="knowledge-card__fields">
        <label>Tipo de conteúdo<select name="kind" value={kind} disabled={faqOnly} onChange={(event) => setKind(event.target.value as KnowledgeEntry["kind"])}><option value="faq">Pergunta frequente</option>{!faqOnly && <><option value="answer">Resposta rápida</option><option value="article">Artigo completo</option></>}</select></label>
        <label>Categoria<select name="category" defaultValue={entry.category}>{knowledgeCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        {kind === "article" && <label>Endereço do artigo<input name="slug" defaultValue={entry.slug ?? ""} required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="ex.: preparar-solicitacao" /></label>}
        <label>Ordem de exibição<input name="position" type="number" min="0" max="9999" defaultValue={entry.position} required /></label>
        {kind === "faq" && <label>Destaque na página inicial<select name="featured_position" defaultValue={entry.featured_position ?? ""}><option value="">Não destacar</option><option value="1">Posição 1</option><option value="2">Posição 2</option><option value="3">Posição 3</option></select></label>}
      </div>
      <fieldset className="knowledge-card__audiences"><legend>Onde mostrar</legend>{audienceOptions.map(([value, label]) => <label key={value}><input type="checkbox" name="audiences" value={value} defaultChecked={entry.audiences.includes(value)} />{label}</label>)}</fieldset>
      <div className="knowledge-language-tabs" role="tablist" aria-label="Idioma dos textos">{supportedLanguages.map((language) => <button key={language} type="button" role="tab" aria-selected={editLanguage === language} onClick={() => setEditLanguage(language)}>{languageLabels[language]}</button>)}</div>
      <div className="knowledge-card__fields">
        <label className="knowledge-card__wide">Título — {languageLabels[editLanguage]}<input value={localized[editLanguage].title} onChange={(event) => updateLocalized("title", event.target.value)} maxLength={300} /></label>
        <div className="knowledge-card__wide">
          <span className="field-label-with-tooltip">Resumo <FieldTooltip text="Texto curto mostrado nas sugestões da busca e na ajuda flutuante. Use uma resposta direta." /></span>
          <textarea aria-label={`Resumo — ${languageLabels[editLanguage]}`} value={localized[editLanguage].summary} onChange={(event) => updateLocalized("summary", event.target.value)} rows={3} maxLength={1000} />
        </div>
        <div className="knowledge-card__wide">
          <span className="field-label-with-tooltip">Conteúdo completo <FieldTooltip text="Explicação exibida ao abrir a resposta. Organize artigos com títulos, passos, listas, links e observações." /></span>
          <RichTextEditor key={editLanguage} value={localized[editLanguage].body_html} onChange={(html) => updateLocalized("body_html", html)} />
        </div>
      </div>
      <div className="knowledge-card__actions"><label className="compact-check"><input type="checkbox" name="active" defaultChecked={entry.active} /> Publicado</label><button className="button button--primary" type="submit" disabled={saving}><AppIcon name="check" />{saving ? "Salvando…" : "Salvar conteúdo"}</button></div>
      {feedback && <p role="status" className="knowledge-card__feedback">{feedback}</p>}
    </form>}
  </article>;
}

export function KnowledgeBaseAdmin({ entries: initial, faqOnly = false, canEdit = true, initialEntryId, initialLanguage = "pt" }: { entries: KnowledgeEntry[]; faqOnly?: boolean; canEdit?: boolean; initialEntryId?: string; initialLanguage?: InterfaceLanguage }) {
  const [entries, setEntries] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(() => initialEntryId && initial.some((entry) => entry.id === initialEntryId) ? initialEntryId : null);
  useEffect(() => {
    if (!initialEntryId || !entries.some((entry) => entry.id === initialEntryId)) return;
    const frame = requestAnimationFrame(() => document.getElementById(`knowledge-entry-${initialEntryId}`)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [initialEntryId, entries]);
  const saveEntry = (oldId: string, saved: KnowledgeEntry) => {
    setEntries((current) => current.map((entry) => entry.id === oldId ? saved : entry));
    setOpenId(saved.id);
  };
  const addEntry = () => {
    const id = `draft-${Date.now()}`;
    setEntries((current) => [...current, { id, slug: null, kind: faqOnly ? "faq" : "article", title: "", summary: "", body_html: "<p></p>", category: "Geral", audiences: ["public"], active: false, position: current.length * 10 + 10, featured_position: null, created_at: null, updated_at: null, published_at: null }]);
    setOpenId(id);
  };
  return <section className="knowledge-admin" aria-labelledby="base-conhecimento">
    <div className="knowledge-admin__heading"><div><p className="eyebrow">Conteúdo publicado e em preparo</p><h3 id="base-conhecimento">Perguntas, respostas e artigos</h3><p>{canEdit ? "Edite perguntas, respostas rápidas e artigos no mesmo espaço." : "Consulte o conteúdo da central de ajuda."}</p></div>{canEdit && <button type="button" className="button button--secondary" onClick={addEntry}><AppIcon name="document" />Adicionar conteúdo</button>}</div>
    <div className="knowledge-admin__cards">{entries.filter((entry) => !faqOnly || entry.kind === "faq").map((entry) => <KnowledgeCard key={entry.id} entry={entry} expanded={openId === entry.id} onToggle={() => setOpenId(openId === entry.id ? null : entry.id)} onSaved={saveEntry} faqOnly={faqOnly} canEdit={canEdit} initialLanguage={initialLanguage} />)}</div>
  </section>;
}
