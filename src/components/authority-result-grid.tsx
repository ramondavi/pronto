"use client";

import Link from "next/link";
import { useState } from "react";
import { useInterfaceLanguage } from "./interface-language";
import { authorityDiscoveryExtras } from "@/lib/authority-discovery-extras";
import { parseAuthorityQuery } from "@/lib/authority-search-query";
import type { PublicAuthority } from "@/lib/public-subject-authority";
import { foldAuthorityText } from "@/lib/authority-fuzzy";
const authoritySources: Record<string, string> = { bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", loc: "Library of Congress", pronto: "Pronto!" };

function Highlight({ value, terms }: { value: string; terms: string[] }) {
  const matched = terms.filter((term) => term.length > 1).sort((a, b) => b.length - a.length);
  if (!matched.length) return value;
  const pattern = new RegExp(`(${matched.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{value.split(pattern).map((part, index) => matched.some((term) => foldAuthorityText(term) === foldAuthorityText(part)) ? <mark key={index}>{part}</mark> : part)}</>;
}

export function AuthorityResultGrid({ items, page, query, variantsLabel, openLabel }: { items: PublicAuthority[]; page: number; query: string; variantsLabel: string; openLabel: string }) {
  const { language } = useInterfaceLanguage();
  const t = authorityDiscoveryExtras[language];
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const terms = parseAuthorityQuery(query).flatMap((group) => group.include);
  const compared = selected.map((id) => items.find((item) => item.id === id)).filter((item): item is PublicAuthority => !!item);
  return <>
    <div className="authority-compare__toolbar"><span>{t.compareHint}</span><button type="button" className="button button--secondary button--small" disabled={selected.length !== 2} onClick={() => setComparing(true)}>{t.compare}</button></div>
    <div className="public-authorities__list">{items.map((item, index) => {
      const matchedVariant = item.variants.find((variant) => terms.some((term) => foldAuthorityText(variant.value).includes(foldAuthorityText(term))));
      const matched = terms.length && !terms.some((term) => foldAuthorityText(item.label).includes(foldAuthorityText(term))) && matchedVariant;
      return <article className="card public-authorities__result" key={item.id}>
        <div className="public-authorities__result-top"><span>{String(page * 24 + index + 1).padStart(2, "0")}</span><span className="public-authorities__source">{authoritySources[item.source] ?? item.source}</span></div>
        <h3><Link href={`/autoridades/${item.id}`}><Highlight value={item.label} terms={terms} /></Link></h3>
        {item.label_en && <p className="public-authorities__english"><Highlight value={item.label_en} terms={terms} /></p>}
        {matched && <p className="public-authorities__match">{t.matched}: <Highlight value={matchedVariant.value} terms={terms} /></p>}
        {!!item.variants.length && <p className="public-authorities__variants">{variantsLabel}: {item.variants.slice(0, 2).map((variant) => variant.value).join(" · ")}</p>}
        <div className="public-authorities__result-footer"><Link className="public-authorities__open" href={`/autoridades/${item.id}`}>{openLabel} <span aria-hidden="true">↗</span></Link><label><input type="checkbox" checked={selected.includes(item.id)} onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current.slice(-1), item.id])} />{t.compare}</label></div>
      </article>;
    })}</div>
    {comparing && compared.length === 2 && <section className="authority-compare" aria-label={t.comparison}><div className="authority-compare__heading"><h2>{t.comparison}</h2><button type="button" className="button button--secondary button--small" onClick={() => setComparing(false)}>{t.closeComparison}</button></div><div className="authority-compare__grid">{compared.map((item) => <article className="card" key={item.id}><h3><Link href={`/autoridades/${item.id}`}>{item.label}</Link></h3><p>{authoritySources[item.source] ?? item.source}</p><h4>{variantsLabel}</h4><ul>{item.variants.map((variant, index) => <li key={index}>{variant.value}</li>)}</ul><h4>{t.related}</h4><ul>{item.relations.map((relation, index) => <li key={index}>{relation.kind}: {relation.value}</li>)}</ul></article>)}</div></section>}
  </>;
}
