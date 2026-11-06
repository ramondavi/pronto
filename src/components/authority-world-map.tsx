"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconPin, IconPinnedOff } from "@tabler/icons-react";
import { AppIcon } from "@/components/app-icon";
import type * as MapLibre from "maplibre-gl";
import type * as Leaflet from "leaflet";
import type { AuthorityMapPoint } from "@/lib/authority-map";
import type { PublicAuthority } from "@/lib/public-subject-authority";
import { authorityValueCopy } from "@/components/authority-value-note";
import { publicAuthorityType } from "@/lib/authority-type-public-copy";
import { authorityMapCopy, authorityMapUiCopy } from "@/lib/authority-map-copy";
import scaleOutlines from "../../public/maps/authority-scale-outlines.json";

type Language = keyof typeof authorityMapCopy;
type Scale = "world" | "southAmerica" | "brazil" | "northeast" | "bahia" | "salvador";
const panelCopy = {
  pt: { explore: "Explorar", details: "Autoridade", openPage: "Abrir página da autoridade", loading: "Carregando autoridade…", unavailable: "Não foi possível carregar a autoridade.", preferred: "Termo preferido", equivalent: "Em outros idiomas", composition: "Como o termo é formado", variants: "Outras formas de busca", relations: "Termos relacionados", notes: "Sobre este tema", source: "Origem", publicUse: "Para quem pesquisa", librarianUse: "Para bibliotecários" },
  en: { explore: "Explore", details: "Authority", openPage: "Open authority page", loading: "Loading authority…", unavailable: "Could not load the authority.", preferred: "Preferred term", equivalent: "In other languages", composition: "How the term is formed", variants: "Other search forms", relations: "Related terms", notes: "About this theme", source: "Source", publicUse: "For visitors", librarianUse: "For librarians" },
  es: { explore: "Explorar", details: "Autoridad", openPage: "Abrir página de la autoridad", loading: "Cargando autoridad…", unavailable: "No se pudo cargar la autoridad.", preferred: "Término preferido", equivalent: "En otros idiomas", composition: "Cómo se forma el término", variants: "Otras formas de búsqueda", relations: "Términos relacionados", notes: "Sobre este tema", source: "Origen", publicUse: "Para visitantes", librarianUse: "Para bibliotecarios" },
  de: { explore: "Erkunden", details: "Normdatensatz", openPage: "Normdatensatz öffnen", loading: "Datensatz wird geladen…", unavailable: "Datensatz konnte nicht geladen werden.", preferred: "Bevorzugter Begriff", equivalent: "In anderen Sprachen", composition: "Aufbau des Begriffs", variants: "Weitere Suchformen", relations: "Verwandte Begriffe", notes: "Über dieses Thema", source: "Quelle", publicUse: "Für Besuchende", librarianUse: "Für Bibliotheken" },
  fr: { explore: "Explorer", details: "Autorité", openPage: "Ouvrir la notice", loading: "Chargement de la notice…", unavailable: "Impossible de charger la notice.", preferred: "Terme préféré", equivalent: "Dans d’autres langues", composition: "Composition du terme", variants: "Autres formes de recherche", relations: "Termes associés", notes: "À propos de ce thème", source: "Source", publicUse: "Pour les visiteurs", librarianUse: "Pour les bibliothécaires" },
  it: { explore: "Esplora", details: "Autorità", openPage: "Apri pagina dell’autorità", loading: "Caricamento autorità…", unavailable: "Impossibile caricare l’autorità.", preferred: "Termine preferito", equivalent: "In altre lingue", composition: "Composizione del termine", variants: "Altre forme di ricerca", relations: "Termini correlati", notes: "Informazioni sul tema", source: "Fonte", publicUse: "Per i visitatori", librarianUse: "Per i bibliotecari" },
} as const;
const scales: { key: Scale; center: [number, number]; zoom: number; bounds?: [[number, number], [number, number]] }[] = [
  { key: "world", center: [12, 0], zoom: 3 },
  { key: "southAmerica", center: [-19, -60], zoom: 4, bounds: [[-82, -56], [-34, 13.5]] },
  { key: "brazil", center: [-14, -52], zoom: 5, bounds: [[-74, -34], [-34, 6]] },
  { key: "northeast", center: [-9.3, -40.3], zoom: 6, bounds: [[-48.8, -18.4], [-34.7, -1]] },
  { key: "bahia", center: [-12.5, -41.5], zoom: 7, bounds: [[-46.7, -18.4], [-37.1, -8.4]] },
  { key: "salvador", center: [-12.97, -38.51], zoom: 12, bounds: [[-38.7, -13.15], [-38.25, -12.7]] },
];
function outline(scale: Scale) {
  const names: Partial<Record<Scale, keyof typeof scaleOutlines>> = { southAmerica: "south-america", brazil: "brazil", northeast: "northeast", bahia: "bahia", salvador: "salvador" };
  const name = names[scale];
  const rings = name ? scaleOutlines[name] : [];
  return { type: "FeatureCollection" as const, features: rings.length ? [{ type: "Feature" as const, properties: {}, geometry: { type: "MultiLineString" as const, coordinates: rings } }] : [] };
}
function inScale(point: AuthorityMapPoint, scale: Scale) {
  if (scale === "world") return true;
  if (scale === "southAmerica") return point.latitude >= -56 && point.latitude <= 13.5 && point.longitude >= -82 && point.longitude <= -34;
  if (scale === "brazil") return point.in_brazil;
  if (scale === "northeast") return point.in_brazil && point.latitude >= -18.4 && point.latitude <= -1 && point.longitude >= -48.8 && point.longitude <= -34.7;
  if (scale === "bahia") return point.latitude >= -18.4 && point.latitude <= -8.4 && point.longitude >= -46.7 && point.longitude <= -37.1;
  return point.latitude >= -13.15 && point.latitude <= -12.7 && point.longitude >= -38.7 && point.longitude <= -38.25;
}

export function AuthorityWorldMap({ points, language, initialAuthorityId }: { points: AuthorityMapPoint[]; language: Language; initialAuthorityId?: string }) {
  const t = authorityMapCopy[language];
  const ui = authorityMapUiCopy[language];
  const panelText = panelCopy[language];
  const [query, setQuery] = useState("");
  const [scaleIndex, setScaleIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<"explore" | "details">(initialAuthorityId ? "details" : "explore");
  const [selectedAuthorityId, setSelectedAuthorityId] = useState<string | null>(initialAuthorityId ?? null);
  const [authorityRecord, setAuthorityRecord] = useState<(PublicAuthority & { marc_text: string }) | null>(null);
  const [recordError, setRecordError] = useState(false);
  const [headerPinned, setHeaderPinned] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [viewportRevision, setViewportRevision] = useState(0);
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre.Map | null>(null);
  const markersRef = useRef<MapLibre.Marker[]>([]);
  const maplibreRef = useRef<typeof MapLibre | null>(null);
  const [mapError, setMapError] = useState(false);
  const rasterNode = useRef<HTMLDivElement>(null);
  const rasterRef = useRef<Leaflet.Map | null>(null);
  const rasterMarkersRef = useRef<Leaflet.LayerGroup | null>(null);
  const rasterOutlineRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const [rasterReady, setRasterReady] = useState(false);
  const scale = scales[scaleIndex];
  const scaleRef = useRef(scale);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
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
    const revealAtTop = (event: PointerEvent) => { if (event.clientY < chrome.getBoundingClientRect().top + 64) reveal(); };
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
  useEffect(() => {
    if (!selectedAuthorityId) { setAuthorityRecord(null); return; }
    const controller = new AbortController();
    setAuthorityRecord(null);
    setRecordError(false);
    fetch(`/autoridades/${encodeURIComponent(selectedAuthorityId)}/mapa.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("authority_unavailable"); return response.json() as Promise<PublicAuthority & { marc_text: string }>; })
      .then((record) => setAuthorityRecord(record))
      .catch(() => { if (!controller.signal.aborted) setRecordError(true); });
    return () => controller.abort();
  }, [selectedAuthorityId]);
  const openAuthority = (point: AuthorityMapPoint) => {
    setSelectedAuthorityId(point.authority_id);
    setPanelTab("details");
    setPanelOpen(true);
    if (rasterReady && rasterRef.current) rasterRef.current.flyTo([point.latitude, point.longitude], Math.max(rasterRef.current.getZoom(), 12), { duration: .7 });
    else if (mapRef.current) mapRef.current.flyTo({ center: [point.longitude, point.latitude], zoom: Math.max(mapRef.current.getZoom(), 12), duration: 700 });
  };
  useEffect(() => {
    if (!mapNode.current) return;
    let disposed = false;
    let map: MapLibre.Map | undefined;
    let observer: ResizeObserver | undefined;
    let themeObserver: MutationObserver | undefined;
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    let loaded = false;
    import("maplibre-gl").then((M) => {
      if (disposed || !mapNode.current) return;
      maplibreRef.current = M;
      try {
        const styleForTheme = () => `https://tiles.openfreemap.org/styles/${document.documentElement.dataset.theme === "dark" ? "fiord" : "liberty"}`;
        let currentStyle = styleForTheme();
        map = new M.Map({ container: mapNode.current, style: currentStyle, center: [scales[0].center[1], scales[0].center[0]], zoom: scales[0].zoom, minZoom: 2, maxZoom: 18, maxBounds: [[-179.9, -80], [179.9, 80]], renderWorldCopies: false, attributionControl: false });
        mapRef.current = map;
        map.on("style.load", () => {
          if (!map) return;
          const dark = document.documentElement.dataset.theme === "dark";
          const label = ["coalesce", ["get", `name:${language}`], ["get", `name_${language}`], ["get", "name:latin"], ["get", "name_en"], ["get", "name"]];
          for (const layer of map.getStyle().layers) {
            if (layer.type === "fill") {
              if (/water|ocean|sea/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", dark ? "#24425a" : "#bed2e4");
              else if (/park|forest|wood|grass|landcover/i.test(layer.id)) map.setPaintProperty(layer.id, "fill-color", dark ? "#35483f" : "#dce8d7");
            }
            if (layer.type === "symbol" && layer.layout?.["text-field"] && /name|label|poi|airport/i.test(layer.id)) {
              map.setLayoutProperty(layer.id, "text-field", label);
              map.setPaintProperty(layer.id, "text-halo-color", dark ? "#182531" : "#f8f8f4");
              map.setPaintProperty(layer.id, "text-halo-width", 1.25);
            }
          }
          map.addSource("authority-scale-outline", { type: "geojson", data: outline(scaleRef.current.key) });
          map.addLayer({ id: "authority-scale-outline", type: "line", source: "authority-scale-outline", paint: { "line-color": dark ? "#d5e8ff" : "#1a3b70", "line-width": 2, "line-opacity": .82, "line-dasharray": [3, 2] } });
        });
        map.on("load", () => {
          if (disposed || !map) return;
          loaded = true;
          if (loadTimer) clearTimeout(loadTimer);
          setReady(true);
        });
        map.on("moveend", () => setViewportRevision((value) => value + 1));
        themeObserver = new MutationObserver(() => { const nextStyle = styleForTheme(); if (nextStyle !== currentStyle) { currentStyle = nextStyle; map?.setStyle(nextStyle); } });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        loadTimer = setTimeout(() => { if (!disposed && !loaded) setMapError(true); }, 8000);
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(mapNode.current);
      } catch { setMapError(true); }
    }).catch(() => { if (!disposed) setMapError(true); });
    return () => { disposed = true; if (loadTimer) clearTimeout(loadTimer); observer?.disconnect(); themeObserver?.disconnect(); markersRef.current.forEach((marker) => marker.remove()); markersRef.current = []; map?.remove(); mapRef.current = null; maplibreRef.current = null; };
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
      rasterMarkersRef.current = L.layerGroup().addTo(map);
      map.on("moveend", () => setViewportRevision((value) => value + 1));
      setRasterReady(true);
    }).catch(() => {});
    return () => { disposed = true; map?.remove(); rasterRef.current = null; rasterMarkersRef.current = null; rasterOutlineRef.current = null; leafletRef.current = null; };
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
  useEffect(() => {
    const vectorSource = mapRef.current?.getSource("authority-scale-outline") as MapLibre.GeoJSONSource | undefined;
    vectorSource?.setData(outline(scale.key));
    if (rasterReady && rasterRef.current) {
      rasterOutlineRef.current?.remove();
      rasterOutlineRef.current = leafletRef.current ? leafletRef.current.layerGroup((outline(scale.key).features[0]?.geometry.coordinates ?? []).map((ring) => leafletRef.current!.polyline(ring.map(([longitude, latitude]) => [latitude, longitude] as [number, number]), { color: "#1a3b70", weight: 2, dashArray: "6 5", interactive: false }))).addTo(rasterRef.current) : null;
      if (scale.bounds) rasterRef.current.flyToBounds([[scale.bounds[0][1], scale.bounds[0][0]], [scale.bounds[1][1], scale.bounds[1][0]]], { padding: [64, 64], duration: .8 });
      else rasterRef.current.flyTo(scale.center, scale.zoom, { duration: .8 });
    } else if (ready && mapRef.current) {
      if (scale.bounds) mapRef.current.fitBounds(scale.bounds, { padding: 64, duration: 800 });
      else mapRef.current.flyTo({ center: [scale.center[1], scale.center[0]], zoom: scale.zoom, duration: 800 });
    }
  }, [ready, rasterReady, scale]);
  useEffect(() => {
    const M = maplibreRef.current;
    const map = mapRef.current;
    if (!ready || !M || !map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    const clusters: (typeof places)[] = [];
    for (const place of places) {
      const position = map.project([place.longitude, place.latitude]);
      const cluster = clusters.find((group) => { const anchor = map.project([group[0].longitude, group[0].latitude]); return Math.hypot(position.x - anchor.x, position.y - anchor.y) < 30; });
      if (cluster) cluster.push(place); else clusters.push([place]);
    }
    clusters.forEach((group) => {
      const place = group[0];
      const total = group.reduce((sum, item) => sum + item.points.length, 0);
      const element = document.createElement("button");
      element.type = "button";
      element.className = `authority-world__marker${group.some((item) => item.points.some((point) => point.authority_id === selectedAuthorityId)) ? " authority-world__marker--selected" : ""}${total > 1 ? " authority-world__marker--cluster" : ""}`;
      element.setAttribute("aria-label", total > 1 ? `${total} ${t.themes}` : place.name);
      if (total > 1) element.textContent = String(total);
      const tooltip = document.createElement("span");
      tooltip.className = "authority-world__marker-tooltip";
      tooltip.textContent = total > 1 ? `${total} ${t.themes}` : place.name;
      element.append(tooltip);
      element.addEventListener("click", () => {
        if (total > 1 && group.length > 1) map.flyTo({ center: [place.longitude, place.latitude], zoom: Math.min(map.getZoom() + 2, 18), duration: 500 });
        else openAuthority(place.points[0]);
      });
      markersRef.current.push(new M.Marker({ element, anchor: "center" }).setLngLat([place.longitude, place.latitude]).addTo(map));
    });
  }, [places, ready, selectedAuthorityId, viewportRevision]);
  useEffect(() => {
    const L = leafletRef.current;
    const markerLayer = rasterMarkersRef.current;
    if (!rasterReady || !L || !markerLayer) return;
    markerLayer.clearLayers();
    const map = rasterRef.current;
    if (!map) return;
    const clusters: (typeof places)[] = [];
    for (const place of places) {
      const position = map.latLngToContainerPoint([place.latitude, place.longitude]);
      const cluster = clusters.find((group) => position.distanceTo(map.latLngToContainerPoint([group[0].latitude, group[0].longitude])) < 30);
      if (cluster) cluster.push(place); else clusters.push([place]);
    }
    clusters.forEach((group) => {
      const place = group[0];
      const total = group.reduce((sum, item) => sum + item.points.length, 0);
      const selectedMarker = group.some((item) => item.points.some((point) => point.authority_id === selectedAuthorityId));
      const marker = L.marker([place.latitude, place.longitude], { icon: L.divIcon({ className: "authority-world__marker-shell", html: `<span class="authority-world__marker${selectedMarker ? " authority-world__marker--selected" : ""}${total > 1 ? " authority-world__marker--cluster" : ""}">${total > 1 ? total : ""}</span>`, iconSize: [total > 1 ? 30 : 16, total > 1 ? 30 : 16] }) });
      marker.bindTooltip(total > 1 ? `${total} ${t.themes}` : place.name, { direction: "top", className: selectedMarker ? "authority-world__leaflet-tooltip authority-world__leaflet-tooltip--selected" : "authority-world__leaflet-tooltip" });
      marker.on("click", () => { if (total > 1 && group.length > 1) map.flyTo([place.latitude, place.longitude], Math.min(map.getZoom() + 2, 18), { duration: .5 }); else openAuthority(place.points[0]); });
      rasterMarkersRef.current?.addLayer(marker);
    });
  }, [places, rasterReady, selectedAuthorityId, viewportRevision]);
  const choosePlace = (place: (typeof places)[number]) => {
    openAuthority(place.points[0]);
  };
  useEffect(() => {
    if (!initialAuthorityId || (!ready && !rasterReady)) return;
    const point = points.find((item) => item.authority_id === initialAuthorityId);
    if (!point) return;
    const timer = window.setTimeout(() => {
      if (rasterReady) rasterRef.current?.flyTo([point.latitude, point.longitude], Math.max(rasterRef.current?.getZoom() ?? 0, 11), { duration: .7 });
      else mapRef.current?.flyTo({ center: [point.longitude, point.latitude], zoom: Math.max(mapRef.current?.getZoom() ?? 0, 11), duration: 700 });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [initialAuthorityId, points, ready, rasterReady]);
  return <main className="authority-world" id="mapa-autoridades">
    <div ref={mapNode} className="authority-world__canvas" role="region" aria-label={ui.mapLabel} />
    {mapError && <div ref={rasterNode} className="authority-world__raster" role="region" aria-label={ui.mapLabel} />}
    {(places.length === 0 || (mapError && !rasterReady)) && <div className="authority-world__empty">{mapError && !rasterReady ? ui.mapUnavailable : points.length ? t.noResults : t.empty}</div>}
    <div className="authority-world__controls"><button type="button" className="authority-world__header-pin" onClick={() => { setHeaderPinned((value) => !value); setHeaderVisible(true); }} aria-label={headerPinned ? ui.unpinHeader : ui.pinHeader} aria-pressed={headerPinned} title={headerPinned ? ui.unpinHeader : ui.pinHeader}>{headerPinned ? <IconPinnedOff size={18} /> : <IconPin size={18} />}</button><div className="authority-world__zoom" role="group" aria-label={ui.mapControls}><button type="button" onClick={() => rasterReady ? rasterRef.current?.zoomIn() : mapRef.current?.zoomIn()} aria-label={t.zoomIn} title={t.zoomIn}>+</button><button type="button" onClick={() => rasterReady ? rasterRef.current?.zoomOut() : mapRef.current?.zoomOut()} aria-label={t.zoomOut} title={t.zoomOut}>−</button><button type="button" onClick={() => { if (rasterReady && rasterRef.current) { if (scale.bounds) rasterRef.current.flyToBounds([[scale.bounds[0][1], scale.bounds[0][0]], [scale.bounds[1][1], scale.bounds[1][0]]], { padding: [64, 64] }); else rasterRef.current.flyTo(scale.center, scale.zoom); } else if (mapRef.current) { if (scale.bounds) mapRef.current.fitBounds(scale.bounds, { padding: 64 }); else mapRef.current.flyTo({ center: [scale.center[1], scale.center[0]], zoom: scale.zoom }); } }} aria-label={t.reset} title={t.reset}><AppIcon name="compass" /></button></div></div>
    <div className="authority-world__credits">{!mapError && <><span>{ui.creditsMap}: <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a></span><span aria-hidden="true"> · </span></>}<span>{ui.creditsData}: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap {ui.creditsContributors}</a></span></div>
    <aside className="authority-world__panel" data-open={panelOpen} aria-label={t.title} style={{ height: panelOpen ? "min(520px, calc(100% - 48px))" : "56px" }}>
      <div className="authority-world__panel-content" aria-hidden={!panelOpen} inert={!panelOpen}>
        <div className="authority-world__panel-heading"><p className="eyebrow"><AppIcon name="globe" />{ui.panelEyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p></div>
        <label className="authority-world__search"><span>{t.search}</span><div><AppIcon name="search" /><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPanelTab("explore"); }} placeholder={t.search} /></div></label>
        <div className="authority-world__tabs" role="tablist" aria-label={t.title}><button type="button" role="tab" aria-selected={panelTab === "explore"} onClick={() => setPanelTab("explore")}>{panelText.explore}</button><button type="button" role="tab" aria-selected={panelTab === "details"} disabled={!selectedAuthorityId} onClick={() => setPanelTab("details")}>{panelText.details}</button></div>
        {panelTab === "explore" ? <>
        <div className="authority-world__scale"><label htmlFor="authority-map-scale">{ui.scale}</label><p>{ui.scaleHint}</p><div className="authority-world__scale-track"><span className="authority-world__scale-progress" style={{ width: `${scaleIndex / (scales.length - 1) * 100}%` }} aria-hidden="true" /><span className="authority-world__scale-thumb" style={{ left: `${scaleIndex / (scales.length - 1) * 100}%` }} aria-hidden="true" /><input id="authority-map-scale" type="range" min="0" max={scales.length - 1} step="1" value={scaleIndex} onChange={(event) => setScaleIndex(Number(event.target.value))} aria-valuetext={scale.key === "world" ? t.world : scale.key === "brazil" ? t.brazil : ui[scale.key]} /></div><div className="authority-world__scale-stops">{scales.map((item, index) => <button type="button" key={item.key} aria-current={scaleIndex === index ? "step" : undefined} onClick={() => setScaleIndex(index)}><span>{item.key === "world" ? t.world : item.key === "brazil" ? t.brazil : ui[item.key]}</span>{item.key === "world" ? <AppIcon name="globe" /> : <span className={`authority-world__scale-shape authority-world__scale-shape--${item.key}`} aria-hidden="true" />}</button>)}</div></div>
        <div className="authority-world__places"><h2>{t.all} <span>{places.length}</span></h2>{query ? <ul>{places.slice(0, 20).flatMap((place) => place.points.map((point) => <li key={`${place.key}:${point.authority_id}`}><button type="button" onClick={() => choosePlace({ ...place, points: [point] })}>{point.term_label}<span>{place.name} →</span></button></li>))}</ul> : <p>{points.length ? "" : t.empty}</p>}{query && places.length === 0 && <p>{t.noResults}</p>}</div>
        </> : <div className="authority-world__record" role="tabpanel">
          {recordError ? <p>{panelText.unavailable}</p> : !authorityRecord ? <p>{panelText.loading}</p> : <>
            <div className="authority-world__record-heading"><span className="public-authority-detail__type">{publicAuthorityType(language, authorityRecord.heading_type)}</span><Link href={`/autoridades/${authorityRecord.id}`} aria-label={panelText.openPage} title={panelText.openPage}><AppIcon name="external" /></Link></div>
            <p className="eyebrow">{panelText.preferred}</p><h2>{authorityRecord.label}</h2>
            {places.find((place) => place.points.some((point) => point.authority_id === authorityRecord.id))?.points.filter((point) => point.authority_id !== authorityRecord.id).map((point) => <button type="button" className="authority-world__related-place" key={point.authority_id} onClick={() => openAuthority(point)}>{point.term_label} →</button>)}
            {authorityRecord.notes[0]?.value && <p>{authorityRecord.notes[0].value}</p>}
            {authorityRecord.label_en && <div className="authority-world__record-section"><h3>{panelText.equivalent}</h3><p><span lang="en">English (EN)</span> {authorityRecord.label_en}</p></div>}
            {!!authorityRecord.components.length && <div className="authority-world__record-section"><h3>{panelText.composition}</h3><ol>{authorityRecord.components.map((part, index) => <li key={index}><strong>{part.kind}</strong> {part.value}</li>)}</ol></div>}
            {!!authorityRecord.variants.length && <div className="authority-world__record-section"><h3>{panelText.variants}</h3><ul>{authorityRecord.variants.map((part, index) => <li key={index}>{part.value}</li>)}</ul></div>}
            {!!authorityRecord.relations.length && <div className="authority-world__record-section"><h3>{panelText.relations}</h3><ul>{authorityRecord.relations.map((part, index) => <li key={index}>{part.kind && <strong>{part.kind}: </strong>}{part.value}</li>)}</ul></div>}
            {authorityRecord.notes.slice(1).map((note, index) => <div className="authority-world__record-section" key={index}><h3>{note.kind || panelText.notes}</h3><p>{note.value}</p></div>)}
            <div className="authority-world__record-section"><h3>{panelText.source}</h3><p>{authorityRecord.source}{authorityRecord.source_identifier ? ` · ${authorityRecord.source_identifier}` : ""}</p>{authorityRecord.source_url?.startsWith("https://") && <a href={authorityRecord.source_url} target="_blank" rel="noopener noreferrer">{authorityRecord.source_url}</a>}</div>
            <div className="authority-world__record-section"><h3>{panelText.librarianUse}</h3><p>{authorityRecord.rights_statement}</p><div className="authority-world__record-downloads"><a href={`/autoridades/${authorityRecord.id}/marc.xml`}>MARCXML</a><a href={`/autoridades/${authorityRecord.id}/marc.mrc`}>ISO 2709</a><a href={`/autoridades/${authorityRecord.id}/skos.jsonld`}>SKOS/JSON-LD</a></div></div>
            <div className="authority-world__record-section authority-world__record-value"><details><summary>MARC21</summary><pre>{authorityRecord.marc_text}</pre></details></div>
            <div className="authority-world__record-section authority-world__record-value"><h3>{authorityValueCopy[language].title}</h3><details><summary>{panelText.publicUse}</summary><p>{authorityValueCopy[language].publicText}</p></details><details><summary>{panelText.librarianUse}</summary><p>{authorityValueCopy[language].librarianText}</p></details></div>
          </>}
        </div>}
      </div>
      <div className="authority-world__panel-footer"><button type="button" className="authority-world__panel-toggle" onClick={() => setPanelOpen((value) => !value)} aria-expanded={panelOpen} aria-label={panelOpen ? ui.collapsePanel : ui.expandPanel}><AppIcon name={panelOpen ? "panelCollapse" : "panelExpand"} /><span>{panelOpen ? ui.collapsePanel : ui.explorePanel}</span></button></div>
    </aside>
  </main>;
}
