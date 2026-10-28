"use client";

import { useId } from "react";
import { AppIcon } from "./app-icon";
import { authoritySources, type AuthoritySource } from "@/lib/authority-preview";

const presentation: Record<AuthoritySource, { href: string; logo: string; badge?: string }> = {
 bn: { href: "https://acervo.bn.gov.br/sophia_web/autoridade", logo: "/authority-sources/bn.png" },
 aat: { href: "https://www.getty.edu/research/tools/vocabularies/aat/", logo: "/authority-sources/getty.svg" },
 ufba: { href: "https://pergamumweb.ufba.br/", logo: "/authority-sources/pergamum.svg", badge: "UFBA" },
 pergamum: { href: "https://pergamum.pucpr.br/redepergamum/", logo: "/authority-sources/pergamum.svg", badge: "REDE" },
 loc: { href: "https://id.loc.gov/authorities/subjects.html", logo: "/authority-sources/loc.png" },
};
function SourceMark({ source }: { source: AuthoritySource }) {
 const item = presentation[source];
 const knockoutId = useId();
 return <span className={`authority-source-mark authority-source-mark--${source}`} role="img" aria-label={authoritySources[source]}>
  {source === "bn" ? <svg className="authority-source-mark__bn" viewBox="0 0 423 87" aria-hidden="true"><defs><filter id={knockoutId} colorInterpolationFilters="sRGB"><feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .7 .7 .7 0 -.7" result="lettering" /><feFlood floodColor="currentColor" /><feComposite in2="lettering" operator="in" /></filter></defs><image href={item.logo} width="423" height="87" filter={`url(#${knockoutId})`} /></svg> : <span className="authority-source-mark__art" style={{ maskImage: `url(${item.logo})`, WebkitMaskImage: `url(${item.logo})` }} aria-hidden="true" />}
  {item.badge && <span className="authority-source-mark__badge" aria-hidden="true">{item.badge}</span>}
 </span>;
}
export function AuthoritySourceSelect({ value, disabled, onChange }: { value: AuthoritySource; disabled?: boolean; onChange: (source: AuthoritySource) => void }) {
 const id = useId();
 return <fieldset className="authority-source-options"><legend className="catalogue-field-label"><AppIcon name="globe" />Fonte do registro</legend><div className="authority-source-options__grid">{(Object.keys(authoritySources) as AuthoritySource[]).map(source => <div className={`authority-source-options__card${value === source ? " is-selected" : ""}`} key={source}><label className="authority-source-options__choice" htmlFor={`${id}-${source}`}><input id={`${id}-${source}`} type="radio" name={`${id}-source`} value={source} checked={value === source} disabled={disabled} onChange={() => onChange(source)} aria-label={authoritySources[source]} /><SourceMark source={source} /></label><a className="authority-source-options__external" href={presentation[source].href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${authoritySources[source]} em nova aba`} title={`Abrir ${authoritySources[source]} em nova aba`}><AppIcon name="external" /></a></div>)}</div><p className="field-help">Selecione um logo. Somente o ícone externo abre o site em nova aba.</p></fieldset>;
}
