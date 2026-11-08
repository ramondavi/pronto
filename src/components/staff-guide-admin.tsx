"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppIcon } from "./app-icon";
import { RichTextEditor } from "./rich-text-editor";
import type { StaffGuidePage } from "@/lib/staff-guide-types";
import { staffGuideSections } from "@/lib/staff-guide-sections";

const sections = staffGuideSections;
const sectionLabel = (value: string) => sections.find(([key]) => key === value)?.[1] ?? value;
const dateLabel = (value: string | null) => value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : "—";
const editable = (page: StaffGuidePage) => JSON.stringify([page.slug, page.section, page.audience, page.position, page.draft_title, page.draft_summary, page.draft_html, page.draft_screens]);

export function StaffGuideAdmin({ initialPages }: { initialPages: StaffGuidePage[] }) {
  const ordered = [...initialPages].sort((a, b) => a.position - b.position);
  const [pages, setPages] = useState(ordered);
  const [savedPages, setSavedPages] = useState(ordered);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState("");
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const page = pages.find((item) => item.id === selected);
  const savedPage = savedPages.find((item) => item.id === selected);
  const dirty = Boolean(page && savedPage && editable(page) !== editable(savedPage));
  const report = (text: string, error = false) => { setFeedback(text); setFailed(error); };
  const setPage = (changes: Partial<StaffGuidePage>) => setPages((current) => current.map((item) => item.id === selected ? { ...item, ...changes } : item));
  const choose = (id: string) => {
    if (id === selected) { setSelected(null); return; }
    if (dirty) { report("Salve ou descarte as alterações antes de abrir outro capítulo.", true); return; }
    setSelected(id); setConfirmUnpublish(false); setVersion(""); report("");
  };
  const refresh = async (id: string) => {
    const { data, error } = await createClient().rpc("admin_list_staff_guide_pages");
    if (error || !data) throw new Error("Não foi possível atualizar os capítulos.");
    const updated = (data as StaffGuidePage[]).sort((a, b) => a.position - b.position);
    setPages(updated); setSavedPages(updated); setSelected(id);
  };
  const add = async () => {
    if (dirty) { report("Salve ou descarte as alterações antes de criar outro capítulo.", true); return; }
    setBusy(true); report("");
    try {
      const { data, error } = await createClient().rpc("admin_save_staff_guide_page", { page_id: null, page_slug: `novo-capitulo-${Date.now()}`, page_section: "comece-aqui", page_audience: "team", page_position: pages.length * 10 + 10, page_title: "Novo capítulo", page_summary: "", page_html: "<p></p>", page_screens: "" });
      if (error || !data) throw new Error("Não foi possível criar o capítulo.");
      await refresh(data as string);
      setSearch(""); setSectionFilter("all"); setStatusFilter("all"); setAudienceFilter("all");
      report("Capítulo criado como rascunho. Preencha o conteúdo antes de publicar.");
    } catch (caught) { report(caught instanceof Error ? caught.message : "Falha ao criar o capítulo.", true); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!page) return;
    setBusy(true); report("");
    try {
      const { error } = await createClient().rpc("admin_save_staff_guide_page", { page_id: page.id, page_slug: page.slug.trim(), page_section: page.section, page_audience: page.audience, page_position: page.position, page_title: page.draft_title, page_summary: page.draft_summary, page_html: page.draft_html, page_screens: page.draft_screens });
      if (error) throw new Error("Confira os campos. O endereço deve ser único e usar letras minúsculas, números e hífens.");
      await refresh(page.id); report("Rascunho salvo. A versão publicada não foi alterada.");
    } catch (caught) { report(caught instanceof Error ? caught.message : "Falha ao salvar o rascunho.", true); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    if (!page || dirty) { report("Salve o rascunho antes de publicar.", true); return; }
    if (version.trim().length < 3) { report("Informe a versão do Pronto! que foi conferida.", true); return; }
    setBusy(true); report("");
    try {
      const { error } = await createClient().rpc("admin_publish_staff_guide_page", { page_id: page.id, checked_version: version.trim() });
      if (error) throw new Error("Não foi possível publicar. Confira se o capítulo tem conteúdo.");
      await refresh(page.id); report("Capítulo publicado para o público interno selecionado.");
    } catch (caught) { report(caught instanceof Error ? caught.message : "Falha ao publicar.", true); }
    finally { setBusy(false); }
  };
  const unpublish = async () => {
    if (!page?.published_at) return;
    setBusy(true); report("");
    try {
      const { error } = await createClient().rpc("admin_unpublish_staff_guide_page", { page_id: page.id });
      if (error) throw new Error("Não foi possível retirar o capítulo da publicação.");
      await refresh(page.id); setConfirmUnpublish(false); report("Capítulo retirado da leitura da equipe. O rascunho foi preservado.");
    } catch (caught) { report(caught instanceof Error ? caught.message : "Falha ao retirar o capítulo.", true); }
    finally { setBusy(false); }
  };
  const term = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const filtered = pages.filter((item) => {
    const text = `${item.draft_title} ${item.draft_summary} ${item.slug}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    return (!term || text.includes(term)) && (sectionFilter === "all" || item.section === sectionFilter)
      && (statusFilter === "all" || (item.published_at ? "published" : "draft") === statusFilter)
      && (audienceFilter === "all" || item.audience === audienceFilter);
  });
  const filtersActive = Boolean(search || sectionFilter !== "all" || statusFilter !== "all" || audienceFilter !== "all");
  return <div className="knowledge-admin staff-guide-admin" aria-label="Edição do Guia da Equipe">
    <div className="admin-section__stats" aria-label="Resumo dos capítulos">{[
      { icon: "book" as const, value: pages.length, label: "capítulos" },
      { icon: "check" as const, value: pages.filter((item) => item.published_at).length, label: "publicados" },
      { icon: "edit" as const, value: pages.filter((item) => !item.published_at).length, label: "rascunhos" },
      { icon: "shield" as const, value: pages.filter((item) => item.audience === "administrator").length, label: "só para administradores" },
    ].map((stat) => <div className="admin-section__stat" key={stat.label}><span className="admin-section__stat-icon"><AppIcon name={stat.icon} /></span><div><strong>{stat.value}</strong><span>{stat.label}</span></div></div>)}</div>
    <div className="knowledge-admin__heading"><div><p className="eyebrow">Conteúdo interno</p><h3>Capítulos publicados e em preparo</h3><p>Organize as orientações e revise cada capítulo antes de disponibilizá-lo à equipe.</p></div><div className="staff-guide-admin__heading-actions"><Link className="button button--secondary" href="/guia-equipe"><AppIcon name="link" />Abrir guia</Link><button type="button" className="button button--secondary" disabled={busy} onClick={() => void add()}><AppIcon name="document" />Novo capítulo</button></div></div>
    <div className="knowledge-admin__filters" role="search" aria-label="Filtrar capítulos do guia"><label>Buscar capítulo<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, resumo ou endereço" /></label><label>Seção<select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value)}><option value="all">Todas as seções</option>{sections.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Publicação<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos</option><option value="published">Publicados</option><option value="draft">Rascunhos</option></select></label><label>Leitura<select value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)}><option value="all">Todos os públicos</option><option value="team">Toda a equipe</option><option value="administrator">Administradores</option></select></label><div className="knowledge-admin__filter-footer"><span role="status">{filtered.length} de {pages.length} capítulos</span>{filtersActive && <button type="button" className="button button--secondary button--small" onClick={() => { setSearch(""); setSectionFilter("all"); setStatusFilter("all"); setAudienceFilter("all"); }}>Limpar filtros</button>}</div></div>
    {feedback && <p className={`knowledge-card__feedback${failed ? " staff-guide-admin__feedback--error" : ""}`} role="status">{feedback}</p>}
    <div className="knowledge-admin__cards">{filtered.map((item) => {
      const expanded = item.id === selected;
      const unpublishedChanges = Boolean(item.published_at && (item.draft_html !== item.published_html || item.draft_title !== item.published_title || item.draft_summary !== item.published_summary || item.draft_screens !== item.published_screens || item.slug !== item.published_slug || item.section !== item.published_section || item.audience !== item.published_audience || item.position !== item.published_position));
      return <article className="knowledge-card" key={item.id}><button type="button" className="knowledge-card__summary" aria-expanded={expanded} onClick={() => choose(item.id)}><span className="knowledge-card__icon"><AppIcon name={item.audience === "administrator" ? "shield" : "book"} /></span><span className="knowledge-card__identity"><span className="knowledge-card__kind">{sectionLabel(item.section)}</span><strong>{item.draft_title}</strong><small>{item.draft_summary || "Resumo ainda não preenchido"}</small></span><span className="knowledge-card__meta"><span className={`knowledge-card__status${item.published_at && !unpublishedChanges && !(expanded && dirty) ? " is-published" : ""}`}>{expanded && dirty ? "Não salvo" : unpublishedChanges ? "Alterações não publicadas" : item.published_at ? "Publicado" : "Rascunho"}</span><small>Atualizado: {dateLabel(item.updated_at)}</small></span><AppIcon name={expanded ? "panelCollapse" : "panelExpand"} className="knowledge-card__toggle-icon" /></button>
        {expanded && page && <div className="knowledge-card__editor staff-guide-admin__editor"><div className="knowledge-card__fields"><label>Seção<select value={page.section} onChange={(event) => setPage({ section: event.target.value as StaffGuidePage["section"] })}>{sections.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Quem pode ler<select value={page.audience} onChange={(event) => setPage({ audience: event.target.value as StaffGuidePage["audience"] })}><option value="team">Catalogadores e administradores</option><option value="administrator">Somente administradores</option></select></label><label>Ordem de exibição<input type="number" min="0" max="9999" value={page.position} onChange={(event) => setPage({ position: Number(event.target.value) })} /></label><label>Endereço do capítulo<input value={page.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={(event) => setPage({ slug: event.target.value })} /><small>Use letras minúsculas, números e hífens.</small></label><label className="knowledge-card__wide">Título<input value={page.draft_title} maxLength={300} onChange={(event) => setPage({ draft_title: event.target.value })} /></label><label className="knowledge-card__wide">Resumo<textarea value={page.draft_summary} maxLength={1000} rows={3} onChange={(event) => setPage({ draft_summary: event.target.value })} /><small>Texto curto exibido na lista do guia.</small></label><label className="knowledge-card__wide">Telas e abas abordadas<textarea value={page.draft_screens} maxLength={500} rows={2} onChange={(event) => setPage({ draft_screens: event.target.value })} placeholder="Ex.: Visão geral; Fila de solicitações; Atendimento · Catalogação" /><small>Separe as telas por ponto e vírgula. Esta relação aparece na lista do guia somente após publicar o capítulo.</small></label><div className="knowledge-card__wide"><span>Conteúdo completo</span><RichTextEditor key={page.id} value={page.draft_html} onChange={(draft_html) => setPage({ draft_html })} guidePageId={page.id} guideSources={pages.filter((item) => item.id !== page.id && item.published_at && item.published_slug && item.published_title && item.published_html && (page.audience === "administrator" || item.published_audience === "team")).map((item) => ({ slug: item.published_slug!, title: item.published_title!, html: item.published_html! }))} /></div></div><p className="staff-guide-admin__image-note"><AppIcon name="lock" />As capturas enviadas aqui ficam privadas. Use PNG, JPEG ou WebP de até 2 MB.</p><div className="knowledge-card__actions"><span className="staff-guide-admin__draft-state"><AppIcon name={dirty ? "edit" : "check"} />{dirty ? "Alterações ainda não salvas" : "Rascunho salvo"}</span>{dirty && <button type="button" className="button button--secondary" disabled={busy} onClick={() => { if (savedPage) setPages((current) => current.map((item) => item.id === selected ? savedPage : item)); report("Alterações descartadas."); }}><AppIcon name="undo" />Descartar alterações</button>}<button type="button" className="button button--primary" disabled={busy || !dirty} onClick={() => void save()}><AppIcon name="check" />Salvar rascunho</button></div><div className="staff-guide-admin__publication"><div><p className="eyebrow">Publicação</p><h4>{page.published_at ? "Capítulo publicado" : "Capítulo ainda não publicado"}</h4><p>{page.published_at ? `Publicado em ${dateLabel(page.published_at)} · Versão conferida: ${page.reviewed_version}` : "Somente quem edita o guia pode ver este rascunho."}</p></div><label>Versão do Pronto! conferida<input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="Ex.: versão publicada em 07/11/2026" /><small>Confira o capítulo na versão instalada antes de publicar.</small></label><div className="staff-guide-admin__publication-actions"><button type="button" className="button button--primary" disabled={busy || dirty || version.trim().length < 3} onClick={() => void publish()}><AppIcon name="check" />{page.published_at ? "Publicar nova versão" : "Publicar capítulo"}</button>{page.published_at && <button type="button" className="button button--secondary" disabled={busy} onClick={() => setConfirmUnpublish(true)}><AppIcon name="eyeOff" />Retirar da publicação</button>}</div>{confirmUnpublish && <div className="staff-guide-admin__confirm" role="group" aria-label="Confirmar retirada da publicação"><p>O capítulo deixará de aparecer no guia da equipe. O rascunho será preservado.</p><div><button type="button" className="button button--secondary" onClick={() => setConfirmUnpublish(false)}>Voltar</button><button type="button" className="button button--primary" disabled={busy} onClick={() => void unpublish()}>Confirmar retirada</button></div></div>}</div></div>}
      </article>;
    })}{filtered.length === 0 && <p className="admin-empty-state"><AppIcon name="search" />Nenhum capítulo corresponde aos filtros.</p>}</div>
  </div>;
}
