"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "./app-icon";
import { createClient } from "@/lib/supabase/client";

export type AuthorityPublicProfile = {
  plain_definition: string; academic_context: string; public_examples: string;
  use_when: string; avoid_when: string; preferred_form_reason: string;
  relationship_explanation: string; evidence_sources: string; reviewed_at?: string;
};
const empty: AuthorityPublicProfile = { plain_definition: "", academic_context: "", public_examples: "", use_when: "", avoid_when: "", preferred_form_reason: "", relationship_explanation: "", evidence_sources: "" };
const fields: { key: keyof typeof empty; label: string; help: string; icon: "book" | "document" | "help" | "link" | "shield" }[] = [
  { key: "plain_definition", label: "O que é este tema?", help: "Definição breve, compreensível para quem não é bibliotecário.", icon: "book" },
  { key: "academic_context", label: "Presença na produção da Faculdade", help: "Explique a relação com os trabalhos, sem divulgar títulos ou dados internos.", icon: "document" },
  { key: "public_examples", label: "Exemplos públicos de uso", help: "Cite apenas trabalhos ou materiais já públicos e identificáveis.", icon: "link" },
  { key: "use_when", label: "Quando usar este termo", help: "Oriente a aplicação deste cabeçalho na descrição e na pesquisa.", icon: "help" },
  { key: "avoid_when", label: "Quando não usar", help: "Esclareça limites e distinções de termos próximos.", icon: "help" },
  { key: "preferred_form_reason", label: "Por que esta é a forma preferida", help: "Registre o critério editorial e a fonte que fundamentam a escolha.", icon: "shield" },
  { key: "relationship_explanation", label: "Como se relaciona com outros termos", help: "Explique apenas relações já presentes no registro.", icon: "link" },
  { key: "evidence_sources", label: "Fontes de fundamentação", help: "Indique fontes verificáveis para as informações públicas.", icon: "document" },
];

export function SubjectAuthorityPublicProfile({ authorityId }: { authorityId: string }) {
  const [profile, setProfile] = useState(empty);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void createClient().rpc("admin_get_subject_authority_public_profile", { target_authority_id: authorityId }).then(({ data }) => {
      if (active && data && typeof data === "object") setProfile({ ...empty, ...data as AuthorityPublicProfile });
    });
    return () => { active = false; };
  }, [authorityId]);
  async function save() {
    setBusy(true); setMessage("");
    const { error } = await createClient().rpc("admin_save_subject_authority_public_profile", { target_authority_id: authorityId, profile_value: profile, edit_reason: reason.trim() });
    setMessage(error ? "Não foi possível salvar. Confira os campos e o motivo da edição." : "Informações salvas. Se o tema estava publicado, precisa de nova revisão para voltar ao catálogo.");
    if (!error) setReason("");
    setBusy(false);
  }
  return <section className="authority-profile-editor"><div className="authority-place-fields__heading"><AppIcon name="book" /><div><strong>Apresentação pública do tema</strong><small>Os textos são exibidos somente quando a autoridade estiver publicada. Não inclua dados de trabalhos privados.</small></div></div><div className="authority-profile-editor__grid">{fields.map(({ key, label, help, icon }) => <label key={key}><span className="catalogue-field-label"><AppIcon name={icon} />{label}</span><textarea value={profile[key]} maxLength={key === "public_examples" || key === "evidence_sources" ? 3000 : 2000} rows={3} onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} /><small className="field-help">{help}</small></label>)}</div><label><span className="catalogue-field-label"><AppIcon name="edit" />Motivo da edição</span><input value={reason} maxLength={1000} minLength={10} onChange={(event) => setReason(event.target.value)} placeholder="Explique a revisão do conteúdo público" /></label><button type="button" className="button button--primary button--small" disabled={busy || reason.trim().length < 10} onClick={() => void save()}><AppIcon name="check" />{busy ? "Salvando…" : "Salvar apresentação pública"}</button>{message && <p role="status" className="field-help">{message}</p>}</section>;
}
