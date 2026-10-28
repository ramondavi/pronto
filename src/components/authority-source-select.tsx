"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import { authoritySources, type AuthoritySource } from "@/lib/authority-preview";

const presentation: Record<AuthoritySource, { href: string; logo?: string; context?: string }> = {
 bn: { href: "https://acervo.bn.gov.br/sophia_web/autoridade" },
 aat: { href: "https://www.getty.edu/research/tools/vocabularies/aat/", logo: "/authority-sources/getty.svg", context: "Art & Architecture Thesaurus (AAT)" },
 ufba: { href: "https://pergamumweb.ufba.br/", logo: "/authority-sources/pergamum.svg", context: "UFBA" },
 pergamum: { href: "https://pergamum.pucpr.br/redepergamum/", logo: "/authority-sources/pergamum.svg", context: "Rede Pergamum" },
 loc: { href: "https://id.loc.gov/authorities/subjects.html" },
};
function SourceMark({ source }: { source: AuthoritySource }) {
 const item = presentation[source];
 return <span className="authority-source-select__identity">{item.logo ? <Image src={item.logo} alt={authoritySources[source]} width={120} height={32} unoptimized /> : <span className="authority-source-select__name">{authoritySources[source]}</span>}{item.context && <small>{item.context}</small>}</span>;
}
function SourceLink({ source }: { source: AuthoritySource }) {
 return <a className="authority-source-select__external" href={presentation[source].href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${authoritySources[source]} em nova aba`} title={`Abrir ${authoritySources[source]} em nova aba`}><AppIcon name="external" /></a>;
}
export function AuthoritySourceSelect({ value, disabled, onChange }: { value: AuthoritySource; disabled?: boolean; onChange: (source: AuthoritySource) => void }) {
 const id = useId();
 const [open, setOpen] = useState(false);
 const root = useRef<HTMLDivElement>(null);
 const trigger = useRef<HTMLButtonElement>(null);
 const choices = useRef<Partial<Record<AuthoritySource, HTMLButtonElement | null>>>({});
 useEffect(() => {
  if (!open) return;
  const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
  document.addEventListener("pointerdown", dismiss);
  choices.current[value]?.focus();
  return () => document.removeEventListener("pointerdown", dismiss);
 }, [open, value]);
 const expanded = open && !disabled;
 return <div ref={root} className="authority-source-select" onKeyDown={event => {
  if (event.key === "Escape" && expanded) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
 }}><span id={`${id}-label`} className="catalogue-field-label"><AppIcon name="globe" />Fonte do registro</span><div className="authority-source-select__control"><button ref={trigger} type="button" className="authority-source-select__trigger" disabled={disabled} aria-expanded={expanded} aria-controls={`${id}-choices`} aria-label={`Fonte do registro: ${authoritySources[value]}. Selecionar outra fonte`} onClick={() => setOpen(current => !current)}><SourceMark source={value} /><AppIcon name="chevronDown" /></button><SourceLink source={value} /></div>{expanded && <div id={`${id}-choices`} className="authority-source-select__choices" role="group" aria-labelledby={`${id}-label`}>{(Object.keys(authoritySources) as AuthoritySource[]).map(source => <div className={`authority-source-select__row${source === value ? " is-selected" : ""}`} key={source}><button ref={element => { choices.current[source] = element; }} type="button" className="authority-source-select__option" aria-label={`Selecionar ${authoritySources[source]}`} aria-pressed={source === value} onClick={() => { onChange(source); setOpen(false); trigger.current?.focus(); }}><SourceMark source={source} /><span className="authority-source-select__check">{source === value && <AppIcon name="check" />}</span></button><SourceLink source={source} /></div>)}</div>}<span className="field-help">Selecione a fonte pelo nome ou logo. O ícone de link abre o site em nova aba.</span></div>;
}
