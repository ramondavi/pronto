"use client";
import { useState } from "react";
import { cduKinds, cduOperators, type CduStructure } from "@/lib/cdu-structure";

export function CduStructureFields({ entry, entries }: { entry?: CduStructure; entries: readonly CduStructure[] }) {
  const [kind, setKind] = useState(entry?.notation_kind ?? "unclassified");
  const canonical = (code: string | null | undefined) => entries.find((item) => item.cdu_code === code)?.merged_into_code ?? code ?? "";
  const targets = entries.filter((item) => !item.merged_into_code && item.cdu_code !== entry?.cdu_code);
  return <fieldset className="cdu-structure-fields"><legend>Organização do repertório local</legend>
    <label>Tipo de notação<select name="notationKind" value={kind} onChange={(event) => setKind(event.target.value)}>{Object.entries(cduKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <label>Código imediatamente superior<select name="parentCode" defaultValue={canonical(entry?.parent_code)}><option value="">Sem superior registrado</option>{targets.map((item) => <option key={item.cdu_code} value={item.cdu_code}>{item.cdu_code}</option>)}</select></label>
    <label>Âmbito do auxiliar especial<select name="scopeCode" required={kind.startsWith("special_")} disabled={!kind.startsWith("special_")} defaultValue={canonical(entry?.auxiliary_scope_code)}><option value="">Escolha a classe de aplicação</option>{targets.filter((item) => item.notation_kind === "main").map((item) => <option key={item.cdu_code} value={item.cdu_code}>{item.cdu_code}</option>)}</select></label>
    <label>Notas de aplicação<textarea name="usageNotes" rows={2} maxLength={4000} defaultValue={entry?.usage_notes ?? ""} /></label>
    <p>Registre somente vínculos conferidos na edição consultada. Auxiliares comuns têm aplicação geral; auxiliares especiais dependem de seu âmbito. A hierarquia não é deduzida automaticamente do código.</p>
    {entry && cduOperators(entry.cdu_code).length > 0 && <p>Sinais identificados: {cduOperators(entry.cdu_code).join("; ")}. Esta leitura dos sinais não substitui a validação bibliotecária.</p>}
  </fieldset>;
}
