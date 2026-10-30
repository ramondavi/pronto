"use client";

import Link from "next/link";
import { useState } from "react";
import { useInterfaceLanguage } from "./interface-language";
import { authorityPublicCopy } from "@/lib/authority-public-copy";

export type ExploreArea = { key: string; query: string; name: string; detail: string; count: number; items: { id: string; label: string }[] };

export function AuthorityAreaExplorer({ areas }: { areas: ExploreArea[] }) {
  const { language } = useInterfaceLanguage();
  const t = authorityPublicCopy[language];
  const [view, setView] = useState<"cards" | "tree">("cards");
  return <section className="authority-areas__explorer" aria-label={t.browse}>
    <div className="authority-areas__toolbar"><p>{t.areaIntro}</p><div className="authority-areas__view-switch" role="group" aria-label={t.browse}><button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")}>{t.card}</button><button type="button" aria-pressed={view === "tree"} onClick={() => setView("tree")}>{t.tree}</button></div></div>
    {view === "cards" ? <div className="authority-areas__grid">{areas.map((area, index) => <Link key={area.key} className="card authority-areas__card" href={`/autoridades?busca=${encodeURIComponent(area.query)}`}><span className="authority-areas__index">{String(index + 1).padStart(2, "0")} / 05</span><span aria-hidden="true" className={`authority-areas__shape authority-areas__shape--${area.key}`} /><h2>{area.name}</h2><p>{area.detail}</p><span className="authority-areas__card-foot"><small>{area.count} {t.published}</small><strong>{t.seeArea} ↗</strong></span></Link>)}</div>
      : <div className="authority-areas__tree"><p className="authority-areas__tree-note">{t.treeNote}</p><ul className="authority-areas__tree-root"><li><span className="authority-areas__tree-root-label">{t.title}</span><ul>{areas.map((area) => <li key={area.key}><div className="authority-areas__tree-branch"><Link href={`/autoridades?busca=${encodeURIComponent(area.query)}`}>{area.name} ↗</Link><small>{area.count} {t.published}</small></div>{area.items.length ? <ul>{area.items.map((item) => <li key={item.id}><Link href={`/autoridades/${item.id}`}>{item.label}</Link></li>)}</ul> : <p>{t.noAreaItems}</p>}</li>)}</ul></li></ul></div>}
  </section>;
}
