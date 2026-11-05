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
const authoritySources: Record<string, string> = { bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", loc: "Library of Congress", pronto: "Pronto!" };

function Highlight({ value, terms }: { value: string; terms: string[] }) {
  const matched = terms.filter((term) => term.length > 1).sort((a, b) => b.length - a.length);
  if (!matched.length) return value;
  const pattern = new RegExp(`(${matched.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{value.split(pattern).map((part, index) => matched.some((term) => foldAuthorityText(term) === foldAuthorityText(part)) ? <mark key={index}>{part}</mark> : part)}</>;
}

export function AuthorityResultGrid({ items, page, query, variantsLabel, openLabel, selectedIds, allSelected, onToggle, view }: { items: PublicAuthority[]; page: number; query: string; variantsLabel: string; openLabel: string; selectedIds: string[]; allSelected: boolean; onToggle: (id: string) => void; view: "cards" | "list" }) {
  const { language } = useInterfaceLanguage();
  const t = authorityDiscoveryExtras[language];
  const selectLabel = { pt: "Selecionar", en: "Select", es: "Seleccionar", de: "Auswählen", fr: "Sélectionner", it: "Seleziona" }[language];
  const terms = parseAuthorityQuery(query).flatMap((group) => group.include).flatMap((term) => term.split(/[*?]/).filter((part) => part.length > 1));
  return <>
    <div className={`public-authorities__list public-authorities__list--${view}`}>{items.map((item, index) => {
      const matchedVariant = item.variants.find((variant) => terms.some((term) => foldAuthorityText(variant.value).includes(foldAuthorityText(term))));
      const matched = terms.length && !terms.some((term) => foldAuthorityText(item.label).includes(foldAuthorityText(term))) && matchedVariant;
      if (view === "list") return <article className="card public-authorities__result public-authorities__result--row" key={item.id}>
        <label className="public-authorities__select"><input type="checkbox" checked={allSelected || selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} aria-label={`${selectLabel} ${item.label}`} /><span>{String(page * 20 + index + 1).padStart(2, "0")}</span></label>
        <div className="public-authorities__row-main"><div className="authority-result-badges">{item.heading_type && <span>{publicAuthorityType(language, item.heading_type)}</span>}</div><h3><Link href={`/autoridades/${item.id}`}><Highlight value={item.label} terms={terms} /></Link></h3>{item.label_en && <p className="public-authorities__english"><Highlight value={item.label_en} terms={terms} /></p>}{matched && <p className="public-authorities__match">{t.matched}: <Highlight value={matchedVariant.value} terms={terms} /></p>}</div>
        <div className="public-authorities__row-side"><span className="public-authorities__source">{item.source in authoritySources ? <SourceMark source={item.source as AuthoritySource | "pronto"} /> : (authoritySources[item.source] ?? item.source)}</span><Link className="public-authorities__open" href={`/autoridades/${item.id}`}>{openLabel} <span aria-hidden="true">↗</span></Link></div>
      </article>;
      return <article className="card public-authorities__result" key={item.id}>
        <div className="public-authorities__result-top"><label className="public-authorities__select"><input type="checkbox" checked={allSelected || selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} aria-label={`${selectLabel} ${item.label}`} /><span>{String(page * 20 + index + 1).padStart(2, "0")}</span></label><span className="public-authorities__source">{item.source in authoritySources ? <SourceMark source={item.source as AuthoritySource | "pronto"} /> : (authoritySources[item.source] ?? item.source)}</span></div>
        {item.heading_type && <div className="authority-result-badges"><span>{publicAuthorityType(language, item.heading_type)}</span></div>}
        <h3><Link href={`/autoridades/${item.id}`}><Highlight value={item.label} terms={terms} /></Link></h3>
        {item.label_en && <p className="public-authorities__english"><Highlight value={item.label_en} terms={terms} /></p>}
        {matched && <p className="public-authorities__match">{t.matched}: <Highlight value={matchedVariant.value} terms={terms} /></p>}
        {!!item.variants.length && <p className="public-authorities__variants">{variantsLabel}: {item.variants.slice(0, 2).map((variant) => variant.value).join(" · ")}</p>}
        <div className="public-authorities__result-footer"><Link className="public-authorities__open" href={`/autoridades/${item.id}`}>{openLabel} <span aria-hidden="true">↗</span></Link></div>
      </article>;
    })}</div>
  </>;
}
