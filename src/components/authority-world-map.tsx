"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconPin, IconPinnedOff } from "@tabler/icons-react";
import { AppIcon } from "@/components/app-icon";
import type * as MapLibre from "maplibre-gl";
import type * as Leaflet from "leaflet";
import type { AuthorityMapPoint } from "@/lib/authority-map";
import { authorityMapCopy, authorityMapUiCopy } from "@/lib/authority-map-copy";

type Language = keyof typeof authorityMapCopy;
type Scale = "world" | "brazil" | "northeast" | "bahia" | "salvador";
const scales: { key: Scale; center: [number, number]; zoom: number }[] = [
  { key: "world", center: [12, 0], zoom: 3 },
  { key: "brazil", center: [-14, -52], zoom: 5 },
  { key: "northeast", center: [-9.3, -40.3], zoom: 6 },
  { key: "bahia", center: [-12.5, -41.5], zoom: 7 },
  { key: "salvador", center: [-12.97, -38.51], zoom: 12 },
];
function inScale(point: AuthorityMapPoint, scale: Scale) {
  if (scale === "world") return true;
  if (scale === "brazil") return point.in_brazil;
  if (scale === "northeast") return point.in_brazil && point.latitude >= -18.4 && point.latitude <= -1 && point.longitude >= -48.8 && point.longitude <= -34.7;
  if (scale === "bahia") return point.latitude >= -18.4 && point.latitude <= -8.4 && point.longitude >= -46.7 && point.longitude <= -37.1;
  return point.latitude >= -13.15 && point.latitude <= -12.7 && point.longitude >= -38.7 && point.longitude <= -38.25;
}

export function AuthorityWorldMap({ points, language }: { points: AuthorityMapPoint[]; language: Language }) {
  const t = authorityMapCopy[language];
  const ui = authorityMapUiCopy[language];
  const [query, setQuery] = useState("");
  const [scaleIndex, setScaleIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [headerPinned, setHeaderPinned] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre.Map | null>(null);
  const markersRef = useRef<MapLibre.Marker[]>([]);
  const maplibreRef = useRef<typeof MapLibre | null>(null);
  const [mapError, setMapError] = useState(false);
  const rasterNode = useRef<HTMLDivElement>(null);
  const rasterRef = useRef<Leaflet.Map | null>(null);
  const rasterMarkersRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const [rasterReady, setRasterReady] = useState(false);
  const scale = scales[scaleIndex];
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".authority-map-page");
    const governmentBar = document.getElementById("barra-brasil");
    if (!page || !governmentBar) return;
    const measure = () => page.style.setProperty("--map-government-bar-height", `${governmentBar.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(governmentBar);
    measure();
    return () => { observer.disconnect(); page.style.removeProperty("--map-government-bar-height"); };
  }, []);
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".authority-map-page");
    if (page) { page.dataset.headerPinned = String(headerPinned); page.dataset.headerVisible = String(headerVisible); }
  }, [headerPinned, headerVisible]);
  useEffect(() => {
    if (headerPinned) return;
    const chrome = document.querySelector<HTMLElement>(".authority-map-page__chrome");
    if (!chrome) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => { if (timer) clearTimeout(timer); };
    const reveal = () => { clear(); setHeaderVisible(true); };
    const schedule = () => { clear(); timer = setTimeout(() => { if (!chrome.matches(":hover") && !chrome.contains(document.activeElement)) setHeaderVisible(false); }, 4000); };
    const revealAtTop = (event: PointerEvent) => { if (event.clientY < 64) reveal(); };
    chrome.addEventListener("pointerenter", reveal);
    chrome.addEventListener("pointerleave", schedule);
    chrome.addEventListener("focusin", reveal);
    chrome.addEventListener("focusout", schedule);
    document.addEventListener("pointermove", revealAtTop);
    schedule();
    return () => { clear(); chrome.removeEventListener("pointerenter", reveal); chrome.removeEventListener("pointerleave", schedule); chrome.removeEventListener("focusin", reveal); chrome.removeEventListener("focusout", schedule); document.removeEventListener("pointermove", revealAtTop); };
  }, [headerPinned]);
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
    let map: MapLibre.Map | undefined;
    let observer: ResizeObserver | undefined;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    let loaded = false;
    import("maplibre-gl").then((M) => {
      if (disposed || !mapNode.current) return;
      maplibreRef.current = M;
      try {
        map = new M.Map({ container: mapNode.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [scales[0].center[1], scales[0].center[0]], zoom: scales[0].zoom, minZoom: 2, maxZoom: 18, maxBounds: [[-179.9, -80], [179.9, 80]], renderWorldCopies: false, attributionControl: false });
        mapRef.current = map;
        map.addControl(new M.AttributionControl({ compact: false }), "bottom-right");
        map.on("load", () => {
          if (disposed || !map) return;
          loaded = true;
          if (loadTimer) clearTimeout(loadTimer);
          map.getContainer().querySelectorAll<HTMLAnchorElement>(".maplibregl-ctrl-attrib a").forEach((anchor) => { anchor.target = "_blank"; anchor.rel = "noopener noreferrer"; });
          setReady(true);
        });
        loadTimer = setTimeout(() => { if (!disposed && !loaded) setMapError(true); }, 8000);
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(mapNode.current);
      } catch { setMapError(true); }
    }).catch(() => { if (!disposed) setMapError(true); });
    return () => { disposed = true; if (loadTimer) clearTimeout(loadTimer); observer?.disconnect(); markersRef.current.forEach((marker) => marker.remove()); markersRef.current = []; map?.remove(); mapRef.current = null; maplibreRef.current = null; };
  }, []);
  useEffect(() => {
    if (!mapError || !rasterNode.current) return;
    let disposed = false;
    let map: Leaflet.Map | undefined;
    import("leaflet").then((L) => {
      if (disposed || !rasterNode.current) return;
      leafletRef.current = L;
      map = L.map(rasterNode.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: true, minZoom: 3, maxZoom: 18, maxBounds: [[-85, -180], [85, 180]], maxBoundsViscosity: 1, worldCopyJump: true }).setView(scales[0].center, scales[0].zoom);
      rasterRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
      L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);
      rasterMarkersRef.current = L.layerGroup().addTo(map);
      setRasterReady(true);
    }).catch(() => {});
    return () => { disposed = true; map?.remove(); rasterRef.current = null; rasterMarkersRef.current = null; leafletRef.current = null; };
  }, [mapError]);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.isStyleLoaded()) return;
    const label = ["coalesce", ["get", `name:${language}`], ["get", `name_${language}`], ["get", "name:latin"], ["get", "name_en"], ["get", "name"]];
    for (const layer of map.getStyle().layers) {
      if (layer.type !== "symbol" || !layer.layout?.["text-field"] || !layer.id.match(/name|label|poi|airport/i)) continue;
      map.setLayoutProperty(layer.id, "text-field", label);
    }
  }, [ready, language]);
  useEffect(() => { if (rasterReady) rasterRef.current?.flyTo(scale.center, scale.zoom, { duration: .8 }); else if (ready) mapRef.current?.flyTo({ center: [scale.center[1], scale.center[0]], zoom: scale.zoom, duration: 800 }); }, [ready, rasterReady, scale]);
  useEffect(() => {
    const M = maplibreRef.current;
    const map = mapRef.current;
    if (!ready || !M || !map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    places.forEach((place) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "authority-world__marker";
      element.title = place.name;
      element.setAttribute("aria-label", place.name);
      element.addEventListener("click", () => { setSelected(place.key); setPanelOpen(true); });
      markersRef.current.push(new M.Marker({ element, anchor: "center" }).setLngLat([place.longitude, place.latitude]).addTo(map));
    });
  }, [places, ready]);
  useEffect(() => {
    const L = leafletRef.current;
    const group = rasterMarkersRef.current;
    if (!rasterReady || !L || !group) return;
    group.clearLayers();
    places.forEach((place) => {
      const marker = L.circleMarker([place.latitude, place.longitude], { radius: 8, weight: 2, color: "#fff", fillColor: "#173d7b", fillOpacity: 1, className: "authority-world__marker" });
      marker.bindTooltip(place.name, { direction: "top" });
      marker.on("click", () => { setSelected(place.key); setPanelOpen(true); });
      group.addLayer(marker);
    });
  }, [places, rasterReady]);
  const choosePlace = (place: (typeof places)[number]) => {
    setSelected(place.key);
    if (rasterReady) { const map = rasterRef.current; map?.flyTo([place.latitude, place.longitude], Math.max(map.getZoom(), 12), { duration: .7 }); }
    else { const map = mapRef.current; if (map) map.flyTo({ center: [place.longitude, place.latitude], zoom: Math.max(map.getZoom(), 12), duration: 700 }); }
  };
  return <main className="authority-world" id="mapa-autoridades">
    <div ref={mapNode} className="authority-world__canvas" role="region" aria-label={ui.mapLabel} />
    {mapError && <div ref={rasterNode} className="authority-world__raster" role="region" aria-label={ui.mapLabel} />}
    {(places.length === 0 || (mapError && !rasterReady)) && <div className="authority-world__empty">{mapError && !rasterReady ? ui.mapUnavailable : points.length ? t.noResults : t.empty}</div>}
    <div className="authority-world__zoom" role="group" aria-label={ui.mapControls}><button type="button" onClick={() => rasterReady ? rasterRef.current?.zoomIn() : mapRef.current?.zoomIn()} aria-label={t.zoomIn} title={t.zoomIn}>+</button><button type="button" onClick={() => rasterReady ? rasterRef.current?.zoomOut() : mapRef.current?.zoomOut()} aria-label={t.zoomOut} title={t.zoomOut}>−</button><button type="button" onClick={() => rasterReady ? rasterRef.current?.flyTo(scale.center, scale.zoom) : mapRef.current?.flyTo({ center: [scale.center[1], scale.center[0]], zoom: scale.zoom })} aria-label={t.reset} title={t.reset}><AppIcon name="compass" /></button></div>
    <aside className="authority-world__panel" data-open={panelOpen} aria-label={t.title}>
      <div className="authority-world__panel-content" hidden={!panelOpen}>
        <div className="authority-world__panel-heading"><p className="eyebrow"><AppIcon name="globe" />{ui.panelEyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p></div>
        <label className="authority-world__search"><span>{t.search}</span><div><AppIcon name="search" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder={t.search} /></div></label>
        <div className="authority-world__scale"><label htmlFor="authority-map-scale">{ui.scale}</label><p>{ui.scaleHint}</p><input id="authority-map-scale" type="range" min="0" max="4" step="1" value={scaleIndex} onChange={(event) => { setScaleIndex(Number(event.target.value)); setSelected(null); }} aria-valuetext={scale.key === "world" ? t.world : scale.key === "brazil" ? t.brazil : ui[scale.key]} /><div className="authority-world__scale-stops">{scales.map((item, index) => <button type="button" key={item.key} aria-current={scaleIndex === index ? "step" : undefined} onClick={() => { setScaleIndex(index); setSelected(null); }}>{item.key === "world" ? t.world : item.key === "brazil" ? t.brazil : ui[item.key]}</button>)}</div></div>
        {active ? <div className="authority-world__selection"><button type="button" className="authority-world__back" onClick={() => setSelected(null)}>← {t.all}</button><h2>{active.name}</h2><ul>{active.points.map((point) => <li key={point.authority_id}><Link href={`/autoridades/${point.authority_id}`}>{point.term_label} <span aria-hidden="true">↗</span></Link></li>)}</ul></div> : <div className="authority-world__places"><h2>{t.all} <span>{places.length}</span></h2>{places.length > 0 ? <ul>{places.map((place) => <li key={place.key}><button type="button" onClick={() => choosePlace(place)}>{place.name}<span>{place.points.length} {t.themes} →</span></button></li>)}</ul> : <p>{points.length ? t.noResults : t.empty}</p>}</div>}
      </div>
      <div className="authority-world__panel-footer"><button type="button" className="authority-world__panel-toggle" onClick={() => setPanelOpen((value) => !value)} aria-expanded={panelOpen} aria-label={panelOpen ? ui.collapsePanel : ui.expandPanel}><AppIcon name={panelOpen ? "panelCollapse" : "panelExpand"} /><span>{panelOpen ? ui.collapsePanel : ui.explorePanel}</span></button>{panelOpen && <button type="button" className="authority-world__pin" onClick={() => { setHeaderPinned((value) => !value); setHeaderVisible(true); }} aria-pressed={headerPinned} title={headerPinned ? ui.unpinHeader : ui.pinHeader}>{headerPinned ? <IconPinnedOff size={17} /> : <IconPin size={17} />}<span>{headerPinned ? ui.unpinHeader : ui.pinHeader}</span></button>}</div>
    </aside>
  </main>;
}
