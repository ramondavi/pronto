"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { AppIcon, type AppIconName } from "./app-icon";
import { CatalogueRecordDialog } from "./catalogue-record-dialog";
import { CatalogueSelect } from "./catalogue-select";
import { AuthorityFoundationDetails } from "./authority-foundation-details";
import { SubjectAuthorityTypeEditor } from "./subject-authority-type-editor";
import { SubjectAuthorityMapPoints } from "./subject-authority-map-points";
import { SubjectAuthorityPublicProfile } from "./subject-authority-public-profile";
import { SubjectAuthorityPublication } from "./subject-authority-publication";
import { createClient } from "@/lib/supabase/client";

type AuthorityRecord = {
  id: string;
  origin: string;
  source_code: string;
  source_identifier: string | null;
  imported_at: string;
  record: {
    status?: string;
    heading_type?: string;
    foundation_recorded?: boolean;
    associated_place?: string;
    source_url?: string;
    components?: { kind: string; value: string }[];
    variants?: { value: string }[];
    notes?: { value: string }[];
    fields?: { tag: string; indicators?: string; subfields?: { code: string; value: string }[] }[];
    relations?: { value: string }[];
  };
};
type Term = {
  id: string;
  preferred_label_pt: string;
  preferred_label_en: string | null;
  active: boolean;
  usage_count: number;
  sources: string[];
  merged_into_id?: string | null;
};
type Tab = "cadastro" | "autoridade" | "mapa" | "apresentacao" | "publicacao";
const tabs: { id: Tab; label: string; icon: AppIconName; description: string }[] = [
  { id: "cadastro", label: "Cadastro", icon: "tag", description: "Formas usadas na catalogação e situação do assunto." },
  { id: "autoridade", label: "Autoridade", icon: "book", description: "Origem, estrutura e tipo do registro de autoridade." },
  { id: "mapa", label: "Mapa", icon: "globe", description: "Lugares, coordenadas e vínculos geográficos revisados." },
  { id: "apresentacao", label: "Apresentação pública", icon: "document", description: "Textos que poderão aparecer na página pública do tema." },
  { id: "publicacao", label: "Publicação", icon: "shield", description: "Condições de redistribuição e liberação individual para consulta." },
];
const sourceNames: Record<string, string> = { bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", loc: "Library of Congress", pronto: "Pronto! — termo local" };

export function SubjectAuthorityEditorDialog({ term, onClose, onUpdated }: { term: Term; onClose: () => void; onUpdated: () => void }) {
  const id = useId();
  const [tab, setTab] = useState<Tab>("cadastro");
  const [authorities, setAuthorities] = useState<AuthorityRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [labelPt, setLabelPt] = useState(term.preferred_label_pt);
  const [labelEn, setLabelEn] = useState(term.preferred_label_en ?? "");
  const [enabled, setEnabled] = useState(term.active);
  const [savedTerm, setSavedTerm] = useState({ pt: term.preferred_label_pt, en: term.preferred_label_en ?? "", enabled: term.active });
  const [reason, setReason] = useState("");
  const [statusConfirmed, setStatusConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const selected = authorities.find((item) => item.id === selectedId) ?? authorities[0];
  const changed = labelPt.trim() !== savedTerm.pt || labelEn.trim() !== savedTerm.en || enabled !== savedTerm.enabled;
  const statusChanged = enabled !== savedTerm.enabled;

  useEffect(() => {
    let active = true;
    void createClient().from("subject_authorities")
      .select("id,origin,source_code,source_identifier,imported_at,record")
      .eq("controlled_term_id", term.id).order("imported_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setLoadError("Não foi possível carregar os registros de autoridade.");
        else { const rows = data as AuthorityRecord[]; setAuthorities(rows); setSelectedId(rows[0]?.id ?? ""); }
        setLoading(false);
      });
    return () => { active = false; };
  }, [term.id]);

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, current: number) {
    const next = event.key === "ArrowRight" ? current + 1 : event.key === "ArrowLeft" ? current - 1 : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length];
    setTab(target.id);
    document.getElementById(`${id}-${target.id}-tab`)?.focus();
  }

  async function saveTerm() {
    if (!changed || busy || reason.trim().length < 10 || statusChanged && !statusConfirmed) return;
    setBusy(true); setMessage("");
    const pt = labelPt.trim(); const en = labelEn.trim();
    const client = createClient();
    const { error } = await client.rpc("admin_save_controlled_term_reason", { term_id: term.id, label_pt: pt, label_en: en, enabled, edit_reason: reason.trim() });
    const result = error ? null : await client.from("controlled_terms").select("preferred_label_pt,preferred_label_en,active").eq("id", term.id).single();
    setBusy(false);
    if (error || result?.error || result?.data?.preferred_label_pt !== pt || (result?.data?.preferred_label_en ?? "") !== en || result?.data?.active !== enabled) {
      setMessage(error?.message.includes("controlled_term_used_by_open_request") ? "Há atendimento aberto com este assunto. Conclua ou cancele o protocolo antes de alterar o cadastro." : error?.code === "23505" ? "Já existe assunto com esta forma em português ou inglês." : "Não foi possível confirmar a alteração. Confira os campos e tente novamente.");
      return;
    }
    setSavedTerm({ pt, en, enabled }); setReason(""); setStatusConfirmed(false);
    setRevision((value) => value + 1);
    setMessage("Cadastro atualizado. Fichas anteriores preservam a forma registrada; a publicação pública exige nova revisão.");
    onUpdated();
  }

  return <CatalogueRecordDialog title={`Editar assunto · ${savedTerm.pt}`} className="subject-editor-dialog" busy={busy} onClose={onClose}>
    <div className="subject-editor__intro"><div><p className="eyebrow">Vocabulário controlado</p><p>Revise o cadastro técnico e a apresentação pública em etapas separadas. Cada aba salva sua própria alteração.</p></div><span className={`controlled-terms-admin__state${savedTerm.enabled ? " is-active" : ""}`}>{savedTerm.enabled ? "Ativo" : "Inativo"}</span></div>
    <div className="subject-editor__tabs" role="tablist" aria-label="Áreas de edição do assunto">{tabs.map((item, index) => <button type="button" role="tab" id={`${id}-${item.id}-tab`} aria-controls={`${id}-${item.id}-panel`} aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? "is-active" : ""} key={item.id} onClick={() => setTab(item.id)} onKeyDown={(event) => onTabKeyDown(event, index)}><AppIcon name={item.icon} />{item.label}</button>)}</div>
    {tabs.map((item) => <section id={`${id}-${item.id}-panel`} role="tabpanel" aria-labelledby={`${id}-${item.id}-tab`} className="subject-editor__panel" hidden={tab !== item.id} key={item.id}>
      <div className="subject-editor__section-heading"><h3>{item.label}</h3><p>{item.description}</p></div>
      {item.id === "cadastro" && <div className="subject-editor__card"><div className="subject-editor__grid"><label><span className="catalogue-field-label"><AppIcon name="tag" />Termo preferido em português</span><input value={labelPt} required minLength={2} maxLength={120} disabled={busy} onChange={(event) => setLabelPt(event.target.value)} /><small>Forma usada em novas fichas. As fichas anteriores não serão reescritas.</small></label><label><span className="catalogue-field-label"><AppIcon name="globe" />Equivalente em inglês</span><input value={labelEn} maxLength={120} disabled={busy} onChange={(event) => setLabelEn(event.target.value)} /><small>Opcional; informe somente a forma confirmada na fonte.</small></label><label><span className="catalogue-field-label"><AppIcon name="check" />Situação do assunto</span><CatalogueSelect value={enabled ? "active" : "inactive"} disabled={busy} onChange={(event) => { setEnabled(event.target.value === "active"); setStatusConfirmed(false); }}><option value="active">Ativo para novas escolhas</option><option value="inactive">Inativo para novas escolhas</option></CatalogueSelect><small>Alterar a situação não modifica os usos históricos.</small></label><div className="subject-editor__sources"><strong>Fontes registradas</strong><p>{term.sources.length ? term.sources.map((source) => sourceNames[source] ?? source).join(" · ") : "Nenhuma fonte registrada neste cadastro."}</p><small>As fontes documentam a origem dos usos. Não atribua uma fonte externa sem conferi-la.</small></div></div>
        {statusChanged && <label className="subject-editor__confirmation"><input type="checkbox" checked={statusConfirmed} onChange={(event) => setStatusConfirmed(event.target.checked)} />Confirmo a mudança de situação. Os protocolos e as fichas anteriores serão preservados.</label>}
        <label className="subject-editor__reason"><span className="catalogue-field-label"><AppIcon name="document" />Motivo da alteração</span><textarea value={reason} minLength={10} maxLength={1000} rows={3} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Descreva a fonte consultada e por que esta alteração é necessária." /><small>Obrigatório para registrar uma mudança; fica na auditoria.</small></label>
        {message && <p className={message.startsWith("Cadastro atualizado") ? "notice" : "notice notice--error"} role="status">{message}</p>}
        <div className="subject-editor__actions"><button type="button" className="button button--primary" disabled={!changed || busy || labelPt.trim().length < 2 || reason.trim().length < 10 || statusChanged && !statusConfirmed} onClick={() => void saveTerm()}><AppIcon name="check" />{busy ? "Salvando…" : "Salvar cadastro"}</button></div>
      </div>}
      {item.id !== "cadastro" && <>{loading ? <p className="subject-editor__empty" role="status">Carregando registros de autoridade…</p> : loadError ? <p className="notice notice--error" role="alert">{loadError}</p> : !selected ? <div className="subject-editor__empty"><AppIcon name="help" /><strong>Somente o assunto está cadastrado</strong><p>Não há registro estruturado de autoridade. A forma e a situação podem ser alteradas na aba Cadastro; os demais recursos exigem cadastrar ou importar uma autoridade conferida.</p></div> : <>
        {authorities.length > 1 && <label className="subject-editor__record-select"><span className="catalogue-field-label"><AppIcon name="book" />Registro de autoridade</span><CatalogueSelect value={selected.id} onChange={(event) => setSelectedId(event.target.value)}>{authorities.map((authority) => <option key={authority.id} value={authority.id}>{sourceNames[authority.source_code] ?? authority.source_code} · {authority.source_identifier || "sem identificador externo"}</option>)}</CatalogueSelect><small>Este assunto possui {authorities.length} registros associados. As abas abaixo se referem ao registro selecionado.</small></label>}
        {item.id === "autoridade" && <div className="subject-editor__record"><div className="subject-editor__record-heading"><AppIcon name={selected.source_code === "pronto" ? "tag" : "book"} /><div><strong>{sourceNames[selected.source_code] ?? selected.source_code}</strong><span>{selected.origin === "manual" ? "Cadastro manual" : "Registro importado"} · {selected.source_identifier || "sem identificador externo"}</span></div></div><div className="subject-editor__record-grid"><div><small>Registrado no Pronto!</small><strong>{new Date(selected.imported_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</strong></div><div><small>Endereço da fonte</small><strong>{selected.record.source_url || "Não informado"}</strong></div></div><p className="subject-editor__provenance">{selected.origin === "manual" ? "Confira a composição, as variantes e as notas antes de alterar o tipo. O cadastro manual permanece identificado como tal." : "O registro importado preserva o conteúdo recebido da fonte. Para corrigir a fonte, confira uma nova versão e use o fluxo de importação; as revisões locais ficam registradas separadamente."}</p>
          {!!selected.record.components?.length && <div className="subject-editor__record-list"><h4>Composição do cabeçalho</h4>{selected.record.components.map((part, index) => <div key={`${index}-${part.kind}`}><span>{part.kind}</span><strong>{part.value}</strong></div>)}</div>}
          {!!selected.record.variants?.length && <div className="subject-editor__record-list"><h4>Formas alternativas</h4>{selected.record.variants.map((variant, index) => <div key={`${index}-${variant.value}`}><span>Variante {index + 1}</span><strong>{variant.value}</strong></div>)}</div>}
          {!!selected.record.notes?.length && <div className="subject-editor__record-list"><h4>Notas de uso e da fonte</h4>{selected.record.notes.map((note, index) => <p key={index}>{note.value}</p>)}</div>}
          {selected.record.foundation_recorded && <AuthorityFoundationDetails authorityId={selected.id} />}
          <SubjectAuthorityTypeEditor key={selected.id} authorityId={selected.id} record={selected.record} onSaved={(type) => { setAuthorities((current) => current.map((entry) => entry.id === selected.id ? { ...entry, record: { ...entry.record, heading_type: type } } : entry)); setRevision((value) => value + 1); onUpdated(); }} />
        </div>}
        {item.id === "mapa" && <SubjectAuthorityMapPoints key={selected.id} authorityId={selected.id} record={selected.record} />}
        {item.id === "apresentacao" && <SubjectAuthorityPublicProfile key={selected.id} authorityId={selected.id} />}
        {item.id === "publicacao" && <SubjectAuthorityPublication key={`${selected.id}-${revision}`} authorityId={selected.id} eligible={savedTerm.enabled && !term.merged_into_id && selected.record.status !== "local_proposal"} record={selected.record} />}
      </>}</>}
    </section>)}
  </CatalogueRecordDialog>;
}
