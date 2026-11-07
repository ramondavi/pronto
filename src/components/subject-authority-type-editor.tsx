"use client";

import { useState } from "react";
import { AppIcon } from "./app-icon";
import { createClient } from "@/lib/supabase/client";
import { authorityHeadingTag, authorityHeadingTypes, headingTypeByTag, type AuthorityHeadingTag } from "@/lib/authority-heading-types";

type RecordInfo = { heading_type?: string; fields?: { tag: string }[] };

export function SubjectAuthorityTypeEditor({ authorityId, record, onSaved }: { authorityId: string; record: RecordInfo; onSaved: (type: string) => void }) {
  const currentTag = authorityHeadingTag(record);
  const [tag, setTag] = useState<AuthorityHeadingTag | "">(currentTag ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const changed = tag !== currentTag;

  async function save() {
    if (!tag || !changed || reason.trim().length < 10) return;
    setBusy(true); setMessage("");
    const { error } = await createClient().rpc("admin_update_subject_authority_type", { target_authority_id: authorityId, heading_tag_value: tag, edit_reason: reason.trim() });
    setBusy(false);
    if (error) { setMessage("Não foi possível alterar o tipo. Confira o motivo e tente novamente."); return; }
    setReason(""); setMessage("Tipo atualizado. A publicação exige nova revisão.");
    onSaved(headingTypeByTag[tag].kind);
  }

  return <section className="authority-type-editor catalogue-workflow">
    <h4><AppIcon name="tag" />Tipo de autoridade</h4>
    <p>O campo 1XX da fonte sugere o tipo. Corrija somente após conferir o registro MARC original.</p>
    <label><span className="catalogue-field-label"><AppIcon name="hierarchy" />Campo de entrada MARC21</span>
      <select value={tag} disabled={busy} onChange={(event) => setTag(event.target.value as AuthorityHeadingTag)}>
        {!tag && <option value="">Selecione o tipo</option>}
        {authorityHeadingTypes.map((item) => <option key={item.tag} value={item.tag}>{item.tag} · {item.label}</option>)}
      </select>
    </label>
    {changed && <label><span className="catalogue-field-label"><AppIcon name="document" />Motivo da alteração</span><textarea value={reason} minLength={10} maxLength={1000} disabled={busy} onChange={(event) => setReason(event.target.value)} placeholder="Explique a correção após conferir a fonte" /></label>}
    {changed && <button type="button" className="button button--primary button--small" disabled={busy || !tag || reason.trim().length < 10} onClick={() => void save()}><AppIcon name="check" />{busy ? "Salvando…" : "Salvar tipo"}</button>}
    {message && <p role="status" className="authority-type-editor__message">{message}</p>}
  </section>;
}
