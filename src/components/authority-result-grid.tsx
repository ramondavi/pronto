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
import { useEffect, useRef, useState } from "react";
const authoritySources: Record<string, string> = { bn: "Biblioteca Nacional", aat: "Getty AAT", ufba: "Pergamum UFBA", pergamum: "Rede Pergamum", loc: "Library of Congress", pronto: "Pronto!" };

function Highlight({ value, terms }: { value: string; terms: string[] }) {
  const matched = terms.filter((term) => term.length > 1).sort((a, b) => b.length - a.length);
  if (!matched.length) return value;
  const pattern = new RegExp(`(${matched.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{value.split(pattern).map((part, index) => matched.some((term) => foldAuthorityText(term) === foldAuthorityText(part)) ? <mark key={index}>{part}</mark> : part)}</>;
}

function CardTitles({ item, terms, englishLabel }: { item: PublicAuthority; terms: string[]; englishLabel: string }) {
  const titleOuter = useRef<HTMLSpanElement>(null);
  const titleInner = useRef<HTMLSpanElement>(null);
  const equivalentOuter = useRef<HTMLSpanElement>(null);
  const equivalentInner = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const card = titleOuter.current?.closest<HTMLElement>(".public-authorities__result");
    let visible = false;
    let played = false;
    let disposed = false;
    let waiting = 0;
    let finishing = 0;
    let returning = 0;
    let durationMs = 8000;
    const outers = [titleOuter.current, equivalentOuter.current];
    const clear = () => {
      window.clearTimeout(waiting);
      window.clearTimeout(finishing);
      window.clearTimeout(returning);
      outers.forEach((outer) => outer?.classList.remove("is-autoplaying", "is-returning"));
    };
    const finish = () => {
      window.clearTimeout(finishing);
      window.clearTimeout(returning);
      outers.forEach((outer) => {
        if (!outer?.classList.contains("is-scrolling")) return;
        outer.classList.remove("is-autoplaying");
        outer.classList.add("is-returning");
      });
      returning = window.setTimeout(() => outers.forEach((outer) => outer?.classList.remove("is-returning")), 500);
    };
    const schedule = () => {
      if (disposed || !visible || played || card?.matches(":hover") || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !outers.some((outer) => outer?.classList.contains("is-scrolling"))) return;
      window.clearTimeout(waiting);
      waiting = window.setTimeout(() => {
        if (card?.matches(":hover")) return;
        played = true;
        outers.forEach((outer) => outer?.classList.add("is-autoplaying"));
        finishing = window.setTimeout(finish, durationMs);
      }, 2400);
    };
    const measure = () => {
      if (disposed) return;
      const pairs = [[titleOuter.current, titleInner.current], [equivalentOuter.current, equivalentInner.current]] as const;
      const distances = pairs.map(([outer, inner]) => outer && inner ? Math.max(0, inner.scrollWidth - outer.clientWidth) : 0);
      durationMs = Math.min(22000, Math.max(8000, Math.max(...distances) / 22 * 1000 + 5000));
      const duration = `${durationMs}ms`;
      pairs.forEach(([outer], index) => {
        if (!outer) return;
        outer.classList.toggle("is-scrolling", distances[index] > 2);
        outer.style.setProperty("--heading-travel", `${-distances[index]}px`);
        outer.style.setProperty("--heading-duration", duration);
      });
      schedule();
    };
    const observer = new ResizeObserver(measure);
    [titleOuter.current, titleInner.current, equivalentOuter.current, equivalentInner.current].forEach((element) => { if (element) observer.observe(element); });
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else window.clearTimeout(waiting); }, { threshold: .5 });
    if (card) visibility.observe(card);
    const enter = () => { played = true; clear(); };
    const leave = () => finish();
    card?.addEventListener("mouseenter", enter);
    card?.addEventListener("mouseleave", leave);
    document.fonts.ready.then(measure);
    return () => { disposed = true; clear(); observer.disconnect(); visibility.disconnect(); card?.removeEventListener("mouseenter", enter); card?.removeEventListener("mouseleave", leave); };
  }, [item.label, item.label_en, englishLabel]);
  return <>
    <h3><Link href={`/autoridades/${item.id}`} title={item.label}><span className="public-authorities__marquee" ref={titleOuter}><span ref={titleInner}><Highlight value={item.label} terms={terms} /></span></span></Link></h3>
    <div className="public-authorities__equivalent">{item.label_en && <span className="public-authorities__marquee" ref={equivalentOuter}><span ref={equivalentInner}><span className="public-authorities__equivalent-language">{englishLabel}</span><span className="public-authorities__english"><Highlight value={item.label_en} terms={terms} /></span></span></span>}</div>
  </>;
}

type SortColumn = "type" | "label" | "equivalent" | "source";

export function AuthorityResultGrid({ items, query, variantsLabel, openLabel, selectedIds, allSelected, excludedIds, onToggle, view, sortable }: { items: PublicAuthority[]; query: string; variantsLabel: string; openLabel: string; selectedIds: string[]; allSelected: boolean; excludedIds: string[]; onToggle: (id: string) => void; view: "cards" | "list"; sortable: boolean }) {
  const { language } = useInterfaceLanguage();
  const [sort, setSort] = useState<{ column: SortColumn; direction: "asc" | "desc" } | null>(null);
  const t = authorityDiscoveryExtras[language];
  const selectLabel = { pt: "Selecionar", en: "Select", es: "Seleccionar", de: "Auswählen", fr: "Sélectionner", it: "Seleziona" }[language];
  const terms = parseAuthorityQuery(query).flatMap((group) => group.include).flatMap((term) => term.split(/[*?]/).filter((part) => part.length > 1));
  const headers = { pt: ["Tipo de tema", "Termo preferido", "Equivalente", "Fonte", "Ordenar os resultados desta página"], en: ["Theme type", "Preferred term", "Equivalent", "Source", "Sort results on this page"], es: ["Tipo de tema", "Término preferido", "Equivalente", "Fuente", "Ordenar resultados de esta página"], de: ["Thementyp", "Bevorzugter Begriff", "Entsprechung", "Quelle", "Ergebnisse dieser Seite sortieren"], fr: ["Type de thème", "Terme préféré", "Équivalent", "Source", "Trier les résultats de cette page"], it: ["Tipo di tema", "Termine preferito", "Equivalente", "Fonte", "Ordina i risultati di questa pagina"] }[language];
  const englishLabel = { pt: "Inglês (EN)", en: "English (EN)", es: "Inglés (EN)", de: "Englisch (EN)", fr: "Anglais (EN)", it: "Inglese (EN)" }[language];
  const ordered = sort && view === "list" && sortable ? [...items].sort((a, b) => {
    const value = (item: PublicAuthority) => sort.column === "type" ? publicAuthorityType(language, item.heading_type) : sort.column === "equivalent" ? item.label_en ?? "" : sort.column === "source" ? authoritySources[item.source] ?? item.source : item.label;
    const compared = value(a).localeCompare(value(b), language, { sensitivity: "base", numeric: true });
    return sort.direction === "asc" ? compared : -compared;
  }) : items;
  const changeSort = (column: SortColumn) => setSort((current) => ({ column, direction: current?.column === column && current.direction === "asc" ? "desc" : "asc" }));
  return <>
    <div className={`public-authorities__list public-authorities__list--${view}`}>{view === "list" && <div className="public-authorities__list-head"><span aria-hidden="true" />{(["type", "label", "equivalent", "source"] as const).map((column, index) => sortable ? <button key={column} type="button" className={`public-authorities__sort public-authorities__sort--${column}`} title={headers[4]} aria-label={`${headers[index]}. ${headers[4]}`} onClick={() => changeSort(column)}>{headers[index]} <span aria-hidden="true">{sort?.column === column ? sort.direction === "asc" ? "↑" : "↓" : "↕"}</span></button> : <span key={column} className={`public-authorities__sort public-authorities__sort--${column}`}>{headers[index]}</span>)}<span aria-hidden="true" /></div>}{ordered.map((item) => {
      const matchedVariant = item.variants.find((variant) => terms.some((term) => foldAuthorityText(variant.value).includes(foldAuthorityText(term))));
      const matched = terms.length > 0 && !terms.some((term) => foldAuthorityText(item.label).includes(foldAuthorityText(term))) && matchedVariant;
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
        <CardTitles item={item} terms={terms} englishLabel={englishLabel} />
        {matched && <p className="public-authorities__match">{t.matched}: <Highlight value={matchedVariant.value} terms={terms} /></p>}
        {!!item.variants.length && <p className="public-authorities__variants"><strong>{variantsLabel}:</strong> {item.variants.slice(0, 2).map((variant) => variant.value).join(" · ")}</p>}
        <div className="public-authorities__result-footer"><Link className="public-authorities__open" href={`/autoridades/${item.id}`}>{openLabel}<AppIcon name="arrowRight" /></Link></div>
      </article>;
    })}</div>
  </>;
}
