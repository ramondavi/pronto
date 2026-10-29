"use client";

import { useId, useState } from "react";
import { CatalogueSelect } from "./catalogue-select";
import { AppIcon } from "./app-icon";
import { cduKinds, cduOperators, type CduStructure } from "@/lib/cdu-structure";

export function CduStructureFields({ entry, entries }: { entry?: CduStructure; entries: readonly CduStructure[] }) {
  const [kind, setKind] = useState(entry?.notation_kind ?? "unclassified");
  const helpId = useId();
  const special = kind.startsWith("special_");
  const canonical = (code: string | null | undefined) => entries.find((item) => item.cdu_code === code)?.merged_into_code ?? code ?? "";
  const targets = entries.filter((item) => !item.merged_into_code && item.cdu_code !== entry?.cdu_code);

  return <fieldset className="cdu-structure-fields catalogue-workflow__section" data-special={special}>
    <legend>Organização no repertório local</legend>
    <p>Registre as relações conferidas na edição da CDU consultada. Você pode completar esta organização depois.</p>
    <label>
      <span className="catalogue-field-label"><AppIcon name="settings" />Tipo de código</span>
      <CatalogueSelect name="notationKind" value={kind} aria-describedby={`${helpId}-kind`} onChange={(event) => setKind(event.target.value)}>
        {Object.entries(cduKinds).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </CatalogueSelect>
      <small id={`${helpId}-kind`}>Escolha entre tabela principal, notação composta e auxiliares. Se ainda não conferiu, mantenha “Ainda não organizado”.</small>
    </label>
    {special && <label>
      <span className="catalogue-field-label"><AppIcon name="hierarchy" />Em qual classe este auxiliar especial pode ser usado?</span>
      <CatalogueSelect name="scopeCode" required defaultValue={canonical(entry?.auxiliary_scope_code)} aria-describedby={`${helpId}-scope`}>
        <option value="">Selecione a classe de aplicação</option>
        {targets.filter((item) => item.notation_kind === "main").map((item) => <option key={item.cdu_code} value={item.cdu_code}>{item.cdu_code}</option>)}
      </CatalogueSelect>
      <small id={`${helpId}-scope`}>Obrigatório para auxiliares especiais. Selecione uma classe da tabela principal já cadastrada. Esta é a classe de aplicação, não o código superior na hierarquia.</small>
    </label>}
    <label>
      <span className="catalogue-field-label"><AppIcon name="hierarchy" />Código superior (opcional)</span>
      <CatalogueSelect name="parentCode" defaultValue={canonical(entry?.parent_code)} aria-describedby={`${helpId}-parent`}>
        <option value="">Sem código superior informado</option>
        {targets.map((item) => <option key={item.cdu_code} value={item.cdu_code}>{item.cdu_code}</option>)}
      </CatalogueSelect>
      <small id={`${helpId}-parent`}>Opcional. Selecione o código mais amplo ao qual este se subordina, conforme a edição consultada. O Pronto! não deduz a hierarquia pelos números.</small>
    </label>
    <label>
      <span className="catalogue-field-label"><AppIcon name="document" />Notas de aplicação (opcional)</span>
      <textarea name="usageNotes" rows={3} maxLength={4000} defaultValue={entry?.usage_notes ?? ""} aria-describedby={`${helpId}-notes`} placeholder="Quando usar, restrições e combinações admitidas na edição consultada." />
      <small id={`${helpId}-notes`}>Opcional. Registre instruções que ajudem a equipe a aplicar o código corretamente.</small>
    </label>
    {entry && cduOperators(entry.cdu_code).length > 0 && <p>Sinais identificados: {cduOperators(entry.cdu_code).join("; ")}. Esta leitura dos sinais não substitui a validação bibliotecária.</p>}
  </fieldset>;
}
