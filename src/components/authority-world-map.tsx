"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AuthorityMapPoint } from "@/lib/authority-map";
import { authorityMapCopy } from "@/lib/authority-map-copy";

type Language = keyof typeof authorityMapCopy;

export function AuthorityWorldMap({ points, language }: { points: AuthorityMapPoint[]; language: Language }) {
  const t = authorityMapCopy[language];
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<"all" | "brazil">("all");
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = useMemo(() => points.filter((point) => (region === "all" || point.in_brazil) && `${point.place_label} ${point.term_label}`.toLocaleLowerCase(language).includes(query.toLocaleLowerCase(language))), [points, query, region, language]);
  const places = useMemo(() => Array.from(filtered.reduce((map, point) => {
    const key = `${point.place_label.toLocaleLowerCase("pt-BR")}:${point.latitude}:${point.longitude}`;
    const entry = map.get(key);
    if (entry) entry.points.push(point);
    else map.set(key, { key, name: point.place_label, latitude: point.latitude, longitude: point.longitude, points: [point] });
    return map;
  }, new Map<string, { key: string; name: string; latitude: number; longitude: number; points: AuthorityMapPoint[] }>()).values()), [filtered]);
  const active = places.find((place) => place.key === selected) ?? null;
  return <main className="authority-world" id="mapa-autoridades">
    <div className="authority-world__canvas">
      <div className="authority-world__projection" style={{ transform: `scale(${zoom})` }}>
        <div className="authority-world__land" />
        {places.map((place) => <button type="button" key={place.key} className={`authority-world__marker${selected === place.key ? " is-selected" : ""}`} style={{ left: `${4 + (place.longitude + 180) / 360 * 92}%`, top: `${5 + (90 - place.latitude) / 180 * 90}%` }} onClick={() => setSelected(place.key)} aria-label={`${place.name}: ${place.points.length} ${t.themes}`}><span /> <b>{place.name}</b></button>)}
      </div>
      {places.length === 0 && <div className="authority-world__empty">{points.length ? t.noResults : t.empty}</div>}
      <div className="authority-world__zoom"><button type="button" onClick={() => setZoom((value) => Math.min(3, value + .25))} aria-label={t.zoomIn}>+</button><button type="button" onClick={() => setZoom((value) => Math.max(1, value - .25))} aria-label={t.zoomOut}>−</button><button type="button" onClick={() => { setZoom(1); setSelected(null); }} aria-label={t.reset}>⌖</button></div>
    </div>
    <aside className="authority-world__panel">
      <h1>{t.title}</h1><p>{t.intro}</p>
      <label className="authority-world__search"><span className="sr-only">{t.search}</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder={t.search} /></label>
      <div className="authority-world__regions" role="group" aria-label={t.all}><button type="button" aria-pressed={region === "all"} onClick={() => { setRegion("all"); setSelected(null); }}>{t.world}</button><button type="button" aria-pressed={region === "brazil"} onClick={() => { setRegion("brazil"); setSelected(null); }}>{t.brazil}</button></div>
      {active ? <div className="authority-world__selection"><button type="button" className="authority-world__back" onClick={() => setSelected(null)}>← {t.all}</button><h2>{active.name}</h2><ul>{active.points.map((point) => <li key={point.authority_id}><Link href={`/autoridades/${point.authority_id}`}>{point.term_label} <span aria-hidden="true">↗</span></Link></li>)}</ul></div> : <div className="authority-world__places"><h2>{t.all}</h2>{places.length > 0 ? <ul>{places.map((place) => <li key={place.key}><button type="button" onClick={() => setSelected(place.key)}>{place.name}<span>{place.points.length} {t.themes} →</span></button></li>)}</ul> : <p>{points.length ? t.noResults : t.empty}</p>}</div>}
    </aside>
  </main>;
}
