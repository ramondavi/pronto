"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "./app-icon";
import { CatalogueConfirmation } from "./catalogue-record-dialog";
import { createClient } from "@/lib/supabase/client";
import type { InterfaceLanguage } from "@/lib/interface-language";

const languages: { code: InterfaceLanguage; label: string }[] = [
  { code: "pt", label: "Português" }, { code: "en", label: "Inglês" }, { code: "es", label: "Espanhol" },
  { code: "de", label: "Alemão" }, { code: "fr", label: "Francês" }, { code: "it", label: "Italiano" },
];
type Translated = Record<InterfaceLanguage, string>;
type AreaRow = { id: string; area_key: string; search_query: string; names: Translated; details: Translated; position: number };
type Draft = { search_query: string; names: Translated; details: Translated };
const blankLanguages = (): Translated => ({ pt: "", en: "", es: "", de: "", fr: "", it: "" });
const blankDraft = (): Draft => ({ search_query: "", names: blankLanguages(), details: blankLanguages() });

export function AuthorityAreasAdmin() {
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [removing, setRemoving] = useState<AreaRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    createClient().from("authority_discovery_areas").select("id,area_key,search_query,names,details,position").order("position").order("area_key")
      .then(({ data, error: loadError }) => {
        if (!active) return;
        setLoading(false);
        if (loadError) setError(loadError.code === "PGRST205" || loadError.code === "42P01" ? "A gestão das áreas aguarda a atualização do banco da prévia." : "Não foi possível carregar os percursos por área.");
        else { setAreas((data ?? []) as AreaRow[]); setError(""); }
      });
    return () => { active = false; };
  }, [revision]);

  function start(area?: AreaRow) {
    setEditing(area?.id ?? "new");
    setDraft(area ? { search_query: area.search_query, names: { ...area.names }, details: { ...area.details } } : blankDraft());
    setError("");
  }

  async function save() {
    if (!editing || busy) return;
    const normalized: Draft = { search_query: draft.search_query.trim(), names: { ...draft.names }, details: { ...draft.details } };
    for (const { code } of languages) { normalized.names[code] = normalized.names[code].trim(); normalized.details[code] = normalized.details[code].trim(); }
    if (normalized.search_query.length < 2 || normalized.search_query.length > 250 || languages.some(({ code }) => normalized.names[code].length < 2 || normalized.names[code].length > 100 || normalized.details[code].length < 2 || normalized.details[code].length > 240)) { setError("Informe termos de busca, nome e descrição nos seis idiomas antes de salvar."); return; }
    setBusy(true);
    const client = createClient();
    const payload = { search_query: normalized.search_query, names: normalized.names, details: normalized.details };
    const result = editing === "new"
      ? await client.from("authority_discovery_areas").insert({ ...payload, area_key: crypto.randomUUID(), position: areas.length })
      : await client.from("authority_discovery_areas").update(payload).eq("id", editing);
    setBusy(false);
    if (result.error) { setError("Não foi possível salvar a área. Confira os campos e tente novamente."); return; }
    setEditing(null); setRevision(value => value + 1);
  }

  async function move(index: number, direction: -1 | 1) {
    const other = index + direction;
    if (busy || other < 0 || other >= areas.length) return;
    setBusy(true);
    const client = createClient();
    const first = await client.from("authority_discovery_areas").update({ position: areas[other].position }).eq("id", areas[index].id);
    const second = first.error ? null : await client.from("authority_discovery_areas").update({ position: areas[index].position }).eq("id", areas[other].id);
    setBusy(false); setRevision(value => value + 1);
    if (first.error || second?.error) setError("Não foi possível mudar a ordem. A lista foi atualizada; tente novamente.");
  }

  async function remove() {
    if (!removing || busy) return false;
    setBusy(true);
    const { error: removeError } = await createClient().from("authority_discovery_areas").delete().eq("id", removing.id);
    setBusy(false);
    if (removeError) { setError("Não foi possível remover a área. Tente novamente."); return false; }
    setRemoving(null); setRevision(value => value + 1); return true;
  }

  return <section className="panel admin-section authority-areas-admin" id="percursos-editoriais" aria-labelledby="authority-areas-admin-title">
    <header className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="hierarchy" aria-hidden="true" /></span><div><p className="eyebrow">Descoberta pública</p><h2 id="authority-areas-admin-title">Percursos por área</h2><p>Organize os cartões e a árvore da página pública. Cada percurso usa uma busca para reunir temas publicados.</p></div></header>
    <div className="admin-section__subhead authority-areas-admin__subhead"><div><p className="eyebrow">Organização</p><h3>{areas.length} {areas.length === 1 ? "percurso" : "percursos"} na página pública</h3></div><button className="button button--primary button--small" type="button" disabled={busy || loading} onClick={() => start()}><AppIcon name="tag" />Adicionar percurso</button></div>
    {error && <p className="notice notice--error" role="alert">{error}</p>}
    {loading ? <p className="admin-empty-state"><AppIcon name="hierarchy" />Carregando percursos…</p> : areas.length === 0 ? <p className="admin-empty-state"><AppIcon name="hierarchy" />Nenhum percurso cadastrado.</p> : <ol className="authority-areas-admin__list">{areas.map((area, index) => <li key={area.id}><div className="authority-areas-admin__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div><div className="authority-areas-admin__content"><strong>{area.names.pt}</strong><p>{area.details.pt}</p><small><AppIcon name="search" />{area.search_query}</small></div><div className="authority-areas-admin__actions"><div className="authority-areas-admin__order" aria-label={`Ordem de ${area.names.pt}`}><button type="button" className="button button--secondary button--small" disabled={busy || index === 0} onClick={() => void move(index, -1)} aria-label={`Mover ${area.names.pt} para cima`} title="Mover para cima"><AppIcon name="chevronDown" className="authority-areas-admin__up" /></button><button type="button" className="button button--secondary button--small" disabled={busy || index === areas.length - 1} onClick={() => void move(index, 1)} aria-label={`Mover ${area.names.pt} para baixo`} title="Mover para baixo"><AppIcon name="chevronDown" /></button></div><button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => start(area)}><AppIcon name="edit" />Editar</button><button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => setRemoving(area)}><AppIcon name="close" />Remover</button></div></li>)}</ol>}
    {editing && <div className="authority-areas-admin__editor"><div className="admin-section__subhead"><div><p className="eyebrow">Percurso editorial</p><h3>{editing === "new" ? "Adicionar percurso" : "Editar percurso"}</h3></div></div><label><span className="catalogue-field-label"><AppIcon name="search" />Termos de busca</span><input value={draft.search_query} maxLength={250} onChange={event => setDraft(current => ({ ...current, search_query: event.target.value }))} placeholder="habitação OR moradia OR housing" /></label><p className="field-help">A busca reúne apenas autoridades publicadas; não classifica formalmente os registros.</p><h4>Textos dos cartões</h4><div className="authority-areas-admin__translations">{languages.map(({ code, label }) => <fieldset key={code}><legend>{label}</legend><label>Nome do cartão<input value={draft.names[code]} maxLength={100} onChange={event => setDraft(current => ({ ...current, names: { ...current.names, [code]: event.target.value } }))} /></label><label>Descrição<input value={draft.details[code]} maxLength={240} onChange={event => setDraft(current => ({ ...current, details: { ...current.details, [code]: event.target.value } }))} /></label></fieldset>)}</div><div className="authority-areas-admin__actions"><button className="button button--primary button--small" type="button" disabled={busy} onClick={() => void save()}><AppIcon name="check" />{busy ? "Salvando…" : "Salvar percurso"}</button><button className="button button--secondary button--small" type="button" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button></div></div>}
    {removing && <CatalogueConfirmation title={`Remover “${removing.names.pt}”?`} label="Remover área" onClose={() => setRemoving(null)} onConfirm={remove}><p>O percurso deixará de aparecer nos cartões e na árvore. As autoridades e fichas não serão alteradas.</p></CatalogueConfirmation>}
  </section>;
}
