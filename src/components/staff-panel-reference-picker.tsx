"use client";

import { AppIcon } from "./app-icon";
import { staffPanelReferences } from "@/lib/staff-panel-references";
import { publicInterfaceReferences } from "@/lib/public-interface-references";
import type { InterfaceLanguage } from "@/lib/interface-language";

export function StaffPanelReferencePicker({ query, onQueryChange, onInsert, scope = "staff", language = "pt" }: { query: string; onQueryChange: (value: string) => void; onInsert: (key: string) => void; scope?: "staff" | "public"; language?: InterfaceLanguage }) {
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const catalog = scope === "public" ? publicInterfaceReferences.map((reference) => ({ key: reference.key, label: reference.labels[language], group: reference.group, icon: reference.icon, kind: reference.icon ? undefined : "field" as const })) : staffPanelReferences;
  const references = catalog.filter((reference) => `${reference.label} ${reference.group}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(normalized));
  const groups = [...new Set(references.map((reference) => reference.group))];
  return <div className="rich-editor__panel-reference-picker" role="group" aria-label="Inserir elemento do painel">
    <strong>Elemento do painel</strong><p>Use o rótulo oficial de telas, abas, etapas e campos. O ícone aparece quando existe na interface.</p>
    <input type="search" aria-label="Buscar elemento do painel" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Buscar tela, aba, etapa ou campo" />
    <div className="rich-editor__panel-reference-list">{groups.map((group) => <section key={group}><h4>{group}</h4>{references.filter((reference) => reference.group === group).map((reference) => <button type="button" key={reference.key} onMouseDown={(event) => event.preventDefault()} onClick={() => onInsert(reference.key)}>{reference.icon && <AppIcon name={reference.icon} />}<span><strong>{reference.label}</strong><small>{reference.kind === "field" ? "Campo" : reference.kind === "control" ? "Controle" : reference.group}</small></span></button>)}</section>)}</div>
  </div>;
}
