"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import type { AuthorityMapPoint } from "@/lib/authority-map";
import { authorityMapCopy, authorityMapUiCopy } from "@/lib/authority-map-copy";

type Language = keyof typeof authorityMapCopy;
type Scale = "world" | "brazil" | "bahia" | "salvador";
const scales: { key: Scale; center: [number, number]; zoom: number }[] = [
  { key: "world", center: [12, 0], zoom: 3 },
  { key: "brazil", center: [-14, -52], zoom: 5 },
  { key: "bahia", center: [-12.5, -41.5], zoom: 7 },
  { key: "salvador", center: [-12.97, -38.51], zoom: 12 },
];
function inScale(point: AuthorityMapPoint, scale: Scale) {
  if (scale === "world") return true;
  if (scale === "brazil") return point.in_brazil;
  if (scale === "bahia") return point.latitude >= -18.4 && point.latitude <= -8.4 && point.longitude >= -46.7 && point.longitude <= -37.1;
  return point.latitude >= -13.15 && point.latitude <= -12.7 && point.longitude >= -38.7 && point.longitude <= -38.25;
}

export function MapHeaderVisibility({ language }: { language: Language }) {
  const [hidden, setHidden] = useState(false);
  const ui = authorityMapUiCopy[language];
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".authority-map-page .site-header");
    if (!header) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => { if (timer) clearTimeout(timer); };
    const reveal = () => { clear(); setHidden(false); };
    const schedule = () => { clear(); timer = setTimeout(() => { if (!header.matches(":hover") && !header.contains(document.activeElement)) setHidden(true); }, 8000); };
    header.addEventListener("pointerenter", reveal);
    header.addEventListener("pointerleave", schedule);
    header.addEventListener("focusin", reveal);
    header.addEventListener("focusout", schedule);
    schedule();
    return () => { clear(); header.removeEventListener("pointerenter", reveal); header.removeEventListener("pointerleave", schedule); header.removeEventListener("focusin", reveal); header.removeEventListener("focusout", schedule); };
  }, []);
  return <div className="authority-map-header-visibility" data-hidden={hidden}><button type="button" className="authority-map-header-visibility__reveal" onPointerEnter={() => setHidden(false)} onFocus={() => setHidden(false)} onClick={() => setHidden(false)} aria-label={ui.showHeader}>{ui.showHeader} ↓</button></div>;
}

export function AuthorityWorldMap({ points, language }: { points: AuthorityMapPoint[]; language: Language }) {
  const t = authorityMapCopy[language];
  const ui = authorityMapUiCopy[language];
  const [query, setQuery] = useState("");
  const [scaleIndex, setScaleIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const scale = scales[scaleIndex];
  const filtered = useMemo(() => points.filter((point) => inScale(point, scale.key) && `${point.place_label} ${point.term_label}`.toLocaleLowerCase(language).includes(query.toLocaleLowerCase(language))), [points, scale.key, query, language]);
  const places = useMemo(() => Array.from(filtered.reduce((map, point) => {
    const key = `${point.place_label.toLocaleLowerCase("pt-BR")}:${point.latitude}:${point.longitude}`;
    const entry = map.get(key);
    if (entry) entry.points.push(point);
    else map.set(key, { key, name: point.place_label, latitude: point.latitude, longitude: point.longitude, points: [point] });
    return map;
  }, new Map<string, { key: string; name: string; latitude: number; longitude: number; points: AuthorityMapPoint[] }>()).values()), [filtered]);
  const active = places.find((place) => place.key === selected) ?? null;
  useEffect(() => {
    if (!mapNode.current) return;
    let disposed = false;
    let map: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    import("leaflet").then((L) => {
      if (disposed || !mapNode.current) return;
      leafletRef.current = L;
      map = L.map(mapNode.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: true, minZoom: 2, maxZoom: 18, worldCopyJump: true }).setView(scales[0].center, scales[0].zoom);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      observer = new ResizeObserver(() => map?.invalidateSize());
      observer.observe(mapNode.current);
      setReady(true);
    });
    return () => { disposed = true; observer?.disconnect(); map?.remove(); mapRef.current = null; markersRef.current = null; leafletRef.current = null; };
  }, []);
  useEffect(() => { if (ready) mapRef.current?.flyTo(scale.center, scale.zoom, { duration: .8 }); }, [ready, scale]);
  useEffect(() => {
    const L = leafletRef.current;
    const group = markersRef.current;
    if (!ready || !L || !group) return;
    group.clearLayers();
    places.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], { radius: 8, weight: 2, color: "#fff", fillColor: "#173d7b", fillOpacity: 1, className: "authority-world__marker" });
      marker.bindTooltip(place.name, { direction: "top" });
      marker.on("click", () => { setSelected(place.key); setPanelOpen(true); });
      group.addLayer(marker);
    });
  }, [places, ready]);
  const choosePlace = (place: (typeof places)[number]) => { setSelected(place.key); const map = mapRef.current; if (map) map.flyTo([place.latitude, place.longitude], Math.max(map.getZoom(), 12), { duration: .7 }); };
  return <main className="authority-world" id="mapa-autoridades">
    <div ref={mapNode} className="authority-world__canvas" role="region" aria-label={ui.mapLabel} />
    {places.length === 0 && <div className="authority-world__empty">{points.length ? t.noResults : t.empty}</div>}
    <div className="authority-world__zoom"><button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label={t.zoomIn}>+</button><button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label={t.zoomOut}>−</button><button type="button" onClick={() => mapRef.current?.flyTo(scale.center, scale.zoom)} aria-label={t.reset}>⌖</button></div>
    <aside className="authority-world__panel" data-open={panelOpen} aria-label={t.title}>
      <button type="button" className="authority-world__panel-toggle" onClick={() => setPanelOpen((value) => !value)} aria-expanded={panelOpen} aria-label={panelOpen ? ui.collapsePanel : ui.expandPanel}>{panelOpen ? "→" : "←"}</button>
      <div className="authority-world__panel-content" hidden={!panelOpen}>
        <h1>{t.title}</h1><p>{t.intro}</p>
        <label className="authority-world__search"><span className="sr-only">{t.search}</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder={t.search} /></label>
        <div className="authority-world__scale"><label htmlFor="authority-map-scale">{ui.scale}</label><input id="authority-map-scale" type="range" min="0" max="3" step="1" value={scaleIndex} onChange={(event) => { setScaleIndex(Number(event.target.value)); setSelected(null); }} aria-valuetext={scale.key === "world" ? t.world : scale.key === "brazil" ? t.brazil : ui[scale.key]} /><div className="authority-world__scale-stops">{scales.map((item, index) => <button type="button" key={item.key} aria-current={scaleIndex === index ? "step" : undefined} onClick={() => { setScaleIndex(index); setSelected(null); }}>{item.key === "world" ? t.world : item.key === "brazil" ? t.brazil : ui[item.key]}</button>)}</div></div>
        {active ? <div className="authority-world__selection"><button type="button" className="authority-world__back" onClick={() => setSelected(null)}>← {t.all}</button><h2>{active.name}</h2><ul>{active.points.map((point) => <li key={point.authority_id}><Link href={`/autoridades/${point.authority_id}`}>{point.term_label} <span aria-hidden="true">↗</span></Link></li>)}</ul></div> : <div className="authority-world__places"><h2>{t.all}</h2>{places.length > 0 ? <ul>{places.map((place) => <li key={place.key}><button type="button" onClick={() => choosePlace(place)}>{place.name}<span>{place.points.length} {t.themes} →</span></button></li>)}</ul> : <p>{points.length ? t.noResults : t.empty}</p>}</div>}
      </div>
    </aside>
  </main>;
}
