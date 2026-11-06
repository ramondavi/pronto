"use client";

import Link from "next/link";
import { useInterfaceLanguage } from "./interface-language";
import { authorityDiscoveryExtras } from "@/lib/authority-discovery-extras";
import { parseAuthorityQuery } from "@/lib/authority-search-query";
import type { PublicAuthority } from "@/lib/public-subject-authority";
import { foldAuthorityText } from "@/lib/authority-fuzzy";
import { publicAuthorityType } from "@/lib/authority-type-public-copy";
import { SourceMark } from "./authority-source-select";
import type { AuthoritySource } from "@/lib/authority-preview";
import { AppIcon } from "./app-icon";
const authoritySources: Record<string, string> = { bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", loc: "Library of Congress", pronto: "Pronto!" };

function Highlight({ value, terms }: { value: string; terms: string[] }) {
  const matched = terms.filter((term) => term.length > 1).sort((a, b) => b.length - a.length);
  if (!matched.length) return value;
  const pattern = new RegExp(`(${matched.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{value.split(pattern).map((part, index) => matched.some((term) => foldAuthorityText(term) === foldAuthorityText(part)) ? <mark key={index}>{part}</mark> : part)}</>;
}

export function AuthorityResultGrid({ items, query, variantsLabel, openLabel, selectedIds, allSelected, excludedIds, onToggle, view }: { items: PublicAuthority[]; query: string; variantsLabel: string; openLabel: string; selectedIds: string[]; allSelected: boolean; excludedIds: string[]; onToggle: (id: string) => void; view: "cards" | "list" }) {
  const { language } = useInterfaceLanguage();
  const t = authorityDiscoveryExtras[language];
  const selectLabel = { pt: "Selecionar", en: "Select", es: "Seleccionar", de: "Auswählen", fr: "Sélectionner", it: "Seleziona" }[language];
  const terms = parseAuthorityQuery(query).flatMap((group) => group.include).flatMap((term) => term.split(/[*?]/).filter((part) => part.length > 1));
  return <>
    <div className={`public-authorities__list public-authorities__list--${view}`}>{items.map((item) => {
      const matchedVariant = item.variants.find((variant) => terms.some((term) => foldAuthorityText(variant.value).includes(foldAuthorityText(term))));
      const matched = terms.length && !terms.some((term) => foldAuthorityText(item.label).includes(foldAuthorityText(term))) && matchedVariant;
      const checked = allSelected ? !excludedIds.includes(item.id) : selectedIds.includes(item.id);
      const type = publicAuthorityType(language, item.heading_type);
      const english = item.label_en || (matched ? matchedVariant.value : item.variants[0]?.value);
      if (view === "list") return <article className="card public-authorities__result public-authorities__result--row" key={item.id}>
        <label className="public-authorities__select"><input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} aria-label={`${selectLabel} ${item.label}`} /></label>
        <span className="public-authorities__row-type">{type}</span>
        <h3><Link href={`/autoridades/${item.id}`}><Highlight value={item.label} terms={terms} /></Link></h3>
        <p className="public-authorities__row-secondary" title={english}>{english ? <Highlight value={english} terms={terms} /> : "—"}</p>
        <span className="public-authorities__row-source" title={authoritySources[item.source] ?? item.source}>{authoritySources[item.source] ?? item.source}</span>
        <Link className="public-authorities__row-open" href={`/autoridades/${item.id}`} aria-label={`${openLabel}: ${item.label}`} title={openLabel}><AppIcon name="arrowRight" /></Link>
      </article>;
      return <article className="card public-authorities__result" key={item.id}>
        <div className="public-authorities__result-top"><label className="public-authorities__select"><input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} aria-label={`${selectLabel} ${item.label}`} /></label><span className="public-authorities__source">{item.source in authoritySources ? <SourceMark source={item.source as AuthoritySource | "pronto"} /> : (authoritySources[item.source] ?? item.source)}</span></div>
        {item.heading_type && <div className="authority-result-badges"><span>{type}</span></div>}
        <h3><Link href={`/autoridades/${item.id}`}><Highlight value={item.label} terms={terms} /></Link></h3>
        {item.label_en && <p className="public-authorities__english"><Highlight value={item.label_en} terms={terms} /></p>}
        {matched && <p className="public-authorities__match">{t.matched}: <Highlight value={matchedVariant.value} terms={terms} /></p>}
        {!!item.variants.length && <p className="public-authorities__variants"><strong>{variantsLabel}:</strong> {item.variants.slice(0, 2).map((variant) => variant.value).join(" · ")}</p>}
        <div className="public-authorities__result-footer"><Link className="public-authorities__open" href={`/autoridades/${item.id}`}>{openLabel}<AppIcon name="arrowRight" /></Link></div>
      </article>;
    })}</div>
  </>;
}
