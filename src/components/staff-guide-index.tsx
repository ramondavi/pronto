"use client";

import Link from "next/link";
import { useState } from "react";
import { AppIcon } from "./app-icon";
import { staffGuideSections } from "@/lib/staff-guide-sections";
import { staffPanelReferences } from "@/lib/staff-panel-references";

export type StaffGuideIndexPage = {
  published_slug: string;
  published_section: string;
  published_title: string;
  published_summary: string;
  published_screens: string | null;
};

const sections = staffGuideSections;
const screens = (page: StaffGuideIndexPage) => page.published_screens?.split(";").map((item) => item.trim()).filter(Boolean) ?? [];
const normalizedLabel = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
function PanelScreenLabel({ label }: { label: string }) {
  const ending = label.split("·").at(-1)?.trim() ?? label;
  const reference = staffPanelReferences.find((item) => normalizedLabel(item.label) === normalizedLabel(ending));
  return <>{reference?.icon && <AppIcon name={reference.icon} aria-hidden="true" />}{label}</>;
}

export function StaffGuideIndexContent({ pages }: { pages: StaffGuideIndexPage[] }) {
  const [view, setView] = useState<"cards" | "list">("cards");
  const groups = sections.map(([key, label]) => ({ key, label, items: pages.filter((page) => page.published_section === key) })).filter((group) => group.items.length || group.key === "casos");
  return <div className="staff-docs__index">
    <div className="staff-docs__index-toolbar"><p>{pages.length} {pages.length === 1 ? "capítulo disponível" : "capítulos disponíveis"}</p><div className="staff-docs__view-switch" role="group" aria-label="Visualização dos capítulos"><button type="button" className={view === "cards" ? "is-active" : ""} aria-pressed={view === "cards"} onClick={() => setView("cards")}><AppIcon name="grid" />Cartões</button><button type="button" className={view === "list" ? "is-active" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}><AppIcon name="table" />Lista</button></div></div>
    {view === "cards" ? <div className="staff-docs__section-cards">{groups.map((group) => <section className="staff-docs__section-card" key={group.key} aria-labelledby={`section-${group.key}`}><header><span className="staff-docs__section-card-icon"><AppIcon name="book" /></span><div><h2 id={`section-${group.key}`}>{group.label}</h2><p>{group.items.length} {group.items.length === 1 ? "capítulo" : "capítulos"}</p></div></header><ul>{group.items.map((page) => <li key={page.published_slug}><Link href={`/guia-equipe/${page.published_slug}`}><span><strong>{page.published_title}</strong><small>{page.published_summary}</small></span><AppIcon name="arrowRight" /></Link></li>)}{!group.items.length && <li className="staff-docs__section-pending">Capítulos em preparação</li>}</ul></section>)}</div>
      : <div className="staff-docs__section-list" role="table" aria-label="Capítulos por seção e telas abordadas"><div className="staff-docs__list-head" role="row"><span role="columnheader">Capítulo</span><span role="columnheader">Telas e abas abordadas</span></div>{groups.map((group) => <section key={group.key} aria-labelledby={`list-section-${group.key}`}><h2 id={`list-section-${group.key}`}>{group.label}</h2>{group.items.map((page) => <div className="staff-docs__list-row" role="row" key={page.published_slug}><div role="cell"><Link href={`/guia-equipe/${page.published_slug}`}>{page.published_title}<AppIcon name="arrowRight" /></Link><p>{page.published_summary}</p></div><div role="cell">{screens(page).length ? <ul>{screens(page).map((screen) => <li key={screen}><PanelScreenLabel label={screen} /></li>)}</ul> : <span className="staff-docs__screen-empty">Telas ainda não informadas</span>}</div></div>)}{!group.items.length && <p className="staff-docs__section-pending">Capítulos em preparação</p>}</section>)}</div>}
  </div>;
}
