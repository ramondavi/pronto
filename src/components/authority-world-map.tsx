"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Icon3dCubeSphere, IconCube3dSphereOff, IconEye, IconEyeOff } from "@tabler/icons-react";
import { publicAuthorityType } from "@/lib/authority-type-public-copy";
import { AppIcon } from "@/components/app-icon";
import { BookLoadingIcon } from "@/components/book-loading-icon";
import { AuthorityProfileView } from "@/components/authority-profile-view";
import type * as MapLibre from "maplibre-gl";
import type * as Leaflet from "leaflet";
import type { AuthorityMapPoint } from "@/lib/authority-map";
import type { PublicAuthority } from "@/lib/public-subject-authority";
import { authorityValueCopy } from "@/components/authority-value-note";
import { authorityMapCopy, authorityMapUiCopy } from "@/lib/authority-map-copy";
import scaleOutlines from "../../public/maps/authority-scale-outlines.json";

type Language = keyof typeof authorityMapCopy;
function CompassArt({ bearing, labels, degrees, direction }: { bearing: number; labels: string[]; degrees: number; direction: string }) {
  return <svg className="authority-world__compass-art" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <circle className="authority-world__compass-ring" cx="50" cy="50" r="47" />
    <g transform={`rotate(${-bearing} 50 50)`}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => <g key={angle} transform={`rotate(${angle} 50 50)`}>
        <path className={index === 0 ? "authority-world__compass-north" : index % 2 === 0 ? "authority-world__compass-cardinal" : "authority-world__compass-intercardinal"} d={index % 2 === 0 ? "M50 19 43 46 50 42 57 46Z" : "M50 28 46 45 50 42 54 45Z"} />
      </g>)}
      {labels.map((label, index) => { const angle = index * Math.PI / 4; return <text key={index} className={index === 0 ? "authority-world__compass-label authority-world__compass-label--north" : "authority-world__compass-label"} x={50 + 40 * Math.sin(angle)} y={50 - 40 * Math.cos(angle)} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${bearing} ${50 + 40 * Math.sin(angle)} ${50 - 40 * Math.cos(angle)})`}>{label}</text>; })}
    </g>
    <circle className="authority-world__compass-hub" cx="50" cy="50" r="15" />
    <text className="authority-world__compass-degrees" x="50" y="48" textAnchor="middle">{degrees}°</text>
    <text className="authority-world__compass-current" x="50" y="59" textAnchor="middle">{direction}</text>
  </svg>;
}
type Scale = "world" | "southAmerica" | "brazil" | "northeast" | "bahia" | "salvador";
type MapView = { zoom: number; west: number; east: number; south: number; north: number; latitude: number; longitude: number };
type MapSuggestion = { id: string; label: string; label_en: string | null; source: string; heading_type: string | null };
const geographicLevels = ["continent", "country", "macroregion", "state", "municipality"] as const;
function uniquePlaces(points: AuthorityMapPoint[]) {
  return Array.from(new Map(points.map((point) => [`${point.place_label.toLocaleLowerCase("pt-BR")}:${point.latitude}:${point.longitude}`, point])).values());
}
function markerKind(point: AuthorityMapPoint) {
  if (point.kind === "associated") return "associated";
  if (point.kind === "subdivision") return "subdivision";
  return "heading";
}
type PlaceType = "all" | "neighborhood" | "square" | "street" | "institution" | "other";
function placeType(point: AuthorityMapPoint): Exclude<PlaceType, "all"> {
  return point.place_type;
}
function activateMapTooltip(tooltip: HTMLElement) {
  requestAnimationFrame(() => {
    if (!tooltip.isConnected) return;
    const inner = tooltip.querySelector<HTMLElement>(".authority-world__tooltip-text");
    if (!inner || tooltip.dataset.measured === "true") return;
    tooltip.dataset.measured = "true";
    const travel = Math.max(0, inner.scrollWidth - Math.max(0, tooltip.clientWidth - 28));
    if (travel < 2) return;
    tooltip.classList.add("is-scrolling");
    tooltip.style.setProperty("--heading-travel", `${-travel}px`);
    const duration = Math.min(22000, Math.max(8000, travel / 22 * 1000 + 5000));
    tooltip.style.setProperty("--heading-duration", `${duration}ms`);
    window.setTimeout(() => { if (tooltip.isConnected && !tooltip.matches(":hover") && !tooltip.parentElement?.matches(":hover")) tooltip.classList.add("is-autoplaying"); }, 2400);
    tooltip.addEventListener("animationend", () => { if (!tooltip.classList.contains("is-autoplaying")) return; tooltip.classList.remove("is-autoplaying"); tooltip.classList.add("is-returning"); window.setTimeout(() => tooltip.classList.remove("is-returning"), 500); });
  });
}
function mapTooltip(name: string) {
  const tooltip = document.createElement("span");
  tooltip.className = "authority-world__marker-tooltip";
  const inner = document.createElement("span");
  inner.className = "authority-world__tooltip-text";
  inner.textContent = name;
  tooltip.append(inner);
  activateMapTooltip(tooltip);
  return tooltip;
}
const mapToolCopy = {
  pt: { filter: "Tipo de lugar", all: "Todos", neighborhood: "Bairros", square: "Praças", street: "Ruas e vias", institution: "Locais associados (instituição, evento etc.)", other: "Demais lugares", legend: "Legenda", heading: "Lugar", subdivision: "Subdivisão geográfica", associated: "Local associado", mixed: "Tipos diferentes no mesmo ponto", cluster: "Pontos agrupados", share: "Compartilhar esta vista", copied: "Link copiado", copyFailed: "Não foi possível copiar o link" },
  en: { filter: "Place type", all: "All", neighborhood: "Neighborhoods", square: "Squares", street: "Streets", institution: "Linked places", other: "Other places", legend: "Point legend", heading: "Place", subdivision: "Geographic subdivision", associated: "Linked place", mixed: "Several types", cluster: "Grouped points", share: "Share this view", copied: "Link copied", copyFailed: "Could not copy link" },
  es: { filter: "Tipo de lugar", all: "Todos", neighborhood: "Barrios", square: "Plazas", street: "Calles", institution: "Lugares vinculados", other: "Otros lugares", legend: "Leyenda de puntos", heading: "Lugar", subdivision: "Subdivisión geográfica", associated: "Lugar vinculado", mixed: "Varios tipos", cluster: "Puntos agrupados", share: "Compartir esta vista", copied: "Enlace copiado", copyFailed: "No se pudo copiar" },
  de: { filter: "Ortstyp", all: "Alle", neighborhood: "Stadtteile", square: "Plätze", street: "Straßen", institution: "Verknüpfte Orte", other: "Andere Orte", legend: "Punktlegende", heading: "Ort", subdivision: "Geografische Unterteilung", associated: "Verknüpfter Ort", mixed: "Mehrere Typen", cluster: "Gruppierte Punkte", share: "Ansicht teilen", copied: "Link kopiert", copyFailed: "Link konnte nicht kopiert werden" },
  fr: { filter: "Type de lieu", all: "Tous", neighborhood: "Quartiers", square: "Places", street: "Rues", institution: "Lieux associés", other: "Autres lieux", legend: "Légende des points", heading: "Lieu", subdivision: "Subdivision géographique", associated: "Lieu associé", mixed: "Plusieurs types", cluster: "Points regroupés", share: "Partager cette vue", copied: "Lien copié", copyFailed: "Impossible de copier le lien" },
  it: { filter: "Tipo di luogo", all: "Tutti", neighborhood: "Quartieri", square: "Piazze", street: "Strade", institution: "Luoghi associati", other: "Altri luoghi", legend: "Legenda dei punti", heading: "Luogo", subdivision: "Suddivisione geografica", associated: "Luogo associato", mixed: "Vari tipi", cluster: "Punti raggruppati", share: "Condividi questa vista", copied: "Link copiato", copyFailed: "Impossibile copiare il link" },
} as const;
const mapControlCopy = {
  pt: { hideHeader: "Ocultar cabeçalho", showHeader: "Mostrar cabeçalho", close: "Fechar legenda", legendHint: "Local associado reúne uma instituição, evento ou outro tema ligado ao lugar. Vários tipos indica temas diferentes no mesmo ponto.", filterHint: "Filtra pela categoria do lugar conferida pela biblioteca. Lugares antigos aguardam classificação." },
  en: { hideHeader: "Hide header", showHeader: "Show header", close: "Close legend", legendHint: "Linked places belong to an institution or another authority. Several types combines different authorities at one point.", filterHint: "Filters by the place category reviewed by the library. Older places await classification." },
  es: { hideHeader: "Ocultar encabezado", showHeader: "Mostrar encabezado", close: "Cerrar leyenda", legendHint: "Los lugares vinculados pertenecen a una institución u otra autoridad. Varios tipos reúne distintas autoridades en un punto.", filterHint: "Filtra por la categoría del lugar revisada por la biblioteca. Los lugares antiguos esperan clasificación." },
  de: { hideHeader: "Kopfzeile ausblenden", showHeader: "Kopfzeile anzeigen", close: "Legende schließen", legendHint: "Verknüpfte Orte gehören zu einer Einrichtung oder anderen Autorität. Mehrere Typen vereint verschiedene Autoritäten an einem Punkt.", filterHint: "Filtert nach der von der Bibliothek geprüften Ortskategorie. Ältere Orte warten auf Einordnung." },
  fr: { hideHeader: "Masquer l’en-tête", showHeader: "Afficher l’en-tête", close: "Fermer la légende", legendHint: "Les lieux associés sont liés à un établissement ou une autre autorité. Plusieurs types réunit diverses autorités sur un point.", filterHint: "Filtre selon la catégorie du lieu vérifiée par la bibliothèque. Les anciens lieux attendent leur classement." },
  it: { hideHeader: "Nascondi intestazione", showHeader: "Mostra intestazione", close: "Chiudi legenda", legendHint: "I luoghi associati sono collegati a un ente o a un’altra autorità. Vari tipi riunisce autorità diverse nello stesso punto.", filterHint: "Filtra per la categoria del luogo verificata dalla biblioteca. I luoghi precedenti attendono classificazione." },
} as const;
function hierarchyRows(points: AuthorityMapPoint[], view: MapView | null) {
  const all = uniquePlaces(points);
  if (!view || view.zoom < 4) {
    const continents = new Map<string, number>();
    for (const point of all) if (point.geography.continent) continents.set(point.geography.continent, (continents.get(point.geography.continent) ?? 0) + 1);
    return Array.from(continents, ([name, count]) => ({ name, count, depth: 0 }));
  }
  const visible = all.filter((point) => point.longitude >= view.west && point.longitude <= view.east && point.latitude >= view.south && point.latitude <= view.north && point.geography.country);
  if (!visible.length) return [];
  const maxDepth = view.zoom >= 10 ? 5 : view.zoom >= 7 ? 4 : view.zoom >= 6 ? 3 : view.zoom >= 5 ? 2 : 1;
  const rows: { name: string; count: number; depth: number }[] = [];
  for (let depth = 0; depth < maxDepth; depth++) {
    const key = geographicLevels[depth];
    const groups = new Map<string, { name: string; path: string[] }>();
    for (const point of visible) {
      const name = point.geography[key];
      if (!name) continue;
      const path = geographicLevels.slice(0, depth + 1).map((level) => point.geography[level]?.toLocaleLowerCase("pt-BR") ?? "");
      groups.set(path.join("/"), { name, path });
    }
    if (!groups.size) break;
    for (const { name, path } of groups.values()) {
      const count = all.filter((point) => geographicLevels.slice(0, depth + 1).every((level, index) => (point.geography[level]?.toLocaleLowerCase("pt-BR") ?? "") === path[index])).length;
      rows.push({ name, count, depth });
    }
    if (groups.size > 1) break;
  }
  return rows;
}
const panelCopy = {
  pt: { explore: "Explorar", details: "Autoridade", pending: "Hierarquia ainda não revisada", openPage: "Abrir página da autoridade", loading: "Carregando autoridade…", unavailable: "Não foi possível carregar a autoridade.", preferred: "Termo preferido", equivalent: "Em outros idiomas", composition: "Partes do nome", variants: "Outras formas de busca", relations: "Termos relacionados", notes: "Sobre este tema", source: "Origem", publicUse: "Para quem pesquisa", librarianUse: "Para bibliotecários" },
  en: { explore: "Explore", details: "Authority", pending: "Hierarchy awaiting review", openPage: "Open authority page", loading: "Loading authority…", unavailable: "Could not load the authority.", preferred: "Preferred term", equivalent: "In other languages", composition: "How the term is formed", variants: "Other search forms", relations: "Related terms", notes: "About this theme", source: "Source", publicUse: "For visitors", librarianUse: "For librarians" },
  es: { explore: "Explorar", details: "Autoridad", pending: "Jerarquía pendiente de revisión", openPage: "Abrir página de la autoridad", loading: "Cargando autoridad…", unavailable: "No se pudo cargar la autoridad.", preferred: "Término preferido", equivalent: "En otros idiomas", composition: "Cómo se forma el término", variants: "Otras formas de búsqueda", relations: "Términos relacionados", notes: "Sobre este tema", source: "Origen", publicUse: "Para visitantes", librarianUse: "Para bibliotecarios" },
  de: { explore: "Erkunden", details: "Normdatensatz", pending: "Hierarchie noch nicht geprüft", openPage: "Normdatensatz öffnen", loading: "Datensatz wird geladen…", unavailable: "Datensatz konnte nicht geladen werden.", preferred: "Bevorzugter Begriff", equivalent: "In anderen Sprachen", composition: "Aufbau des Begriffs", variants: "Weitere Suchformen", relations: "Verwandte Begriffe", notes: "Über dieses Thema", source: "Quelle", publicUse: "Für Besuchende", librarianUse: "Für Bibliotheken" },
  fr: { explore: "Explorer", details: "Autorité", pending: "Hiérarchie en attente de révision", openPage: "Ouvrir la notice", loading: "Chargement de la notice…", unavailable: "Impossible de charger la notice.", preferred: "Terme préféré", equivalent: "Dans d’autres langues", composition: "Composition du terme", variants: "Autres formes de recherche", relations: "Termes associés", notes: "À propos de ce thème", source: "Source", publicUse: "Pour les visiteurs", librarianUse: "Pour les bibliothécaires" },
  it: { explore: "Esplora", details: "Autorità", pending: "Gerarchia in attesa di revisione", openPage: "Apri pagina dell’autorità", loading: "Caricamento autorità…", unavailable: "Impossibile caricare l’autorità.", preferred: "Termine preferito", equivalent: "In altre lingue", composition: "Composizione del termine", variants: "Altre forme di ricerca", relations: "Termini correlati", notes: "Informazioni sul tema", source: "Fonte", publicUse: "Per i visitatori", librarianUse: "Per i bibliotecari" },
} as const;
const mapExtras = {
  pt: { theme: "Tema", selectPoint: "Selecione um ponto no mapa para ver o tema", searchTip: "Quer combinar termos, expressões e filtros? Use a busca completa do catálogo.", advancedSearch: "Abrir busca completa", dismiss: "Dispensar dica", tilt: "Inclinar mapa", flatten: "Voltar ao mapa plano", resetNorth: "Voltar à orientação norte", turnLeft: "Girar à esquerda", turnRight: "Girar à direita" },
  en: { theme: "Theme", selectPoint: "Select a map point to view its theme", searchTip: "Want to combine terms, expressions and filters? Use the full catalogue search.", advancedSearch: "Open full search", dismiss: "Dismiss tip", tilt: "Tilt map", flatten: "Return to flat map", resetNorth: "Reset north orientation", turnLeft: "Rotate left", turnRight: "Rotate right" },
  es: { theme: "Tema", selectPoint: "Selecciona un punto del mapa para ver el tema", searchTip: "¿Quieres combinar términos, expresiones y filtros? Usa la búsqueda completa del catálogo.", advancedSearch: "Abrir búsqueda completa", dismiss: "Cerrar consejo", tilt: "Inclinar mapa", flatten: "Volver al mapa plano", resetNorth: "Restablecer orientación norte", turnLeft: "Girar a la izquierda", turnRight: "Girar a la derecha" },
  de: { theme: "Thema", selectPoint: "Kartenpunkt auswählen, um das Thema zu sehen", searchTip: "Möchten Sie Begriffe, Suchausdrücke und Filter kombinieren? Nutzen Sie die vollständige Katalogsuche.", advancedSearch: "Vollständige Suche öffnen", dismiss: "Hinweis schließen", tilt: "Karte neigen", flatten: "Zur flachen Karte zurück", resetNorth: "Nach Norden ausrichten", turnLeft: "Nach links drehen", turnRight: "Nach rechts drehen" },
  fr: { theme: "Thème", selectPoint: "Sélectionnez un point pour voir le thème", searchTip: "Vous souhaitez combiner termes, expressions et filtres ? Utilisez la recherche complète du catalogue.", advancedSearch: "Ouvrir la recherche complète", dismiss: "Fermer le conseil", tilt: "Incliner la carte", flatten: "Revenir à la carte plane", resetNorth: "Réorienter vers le nord", turnLeft: "Tourner à gauche", turnRight: "Tourner à droite" },
  it: { theme: "Tema", selectPoint: "Seleziona un punto della mappa per vedere il tema", searchTip: "Vuoi combinare termini, espressioni e filtri? Usa la ricerca completa del catalogo.", advancedSearch: "Apri la ricerca completa", dismiss: "Chiudi suggerimento", tilt: "Inclina la mappa", flatten: "Torna alla mappa piana", resetNorth: "Ripristina l'orientamento nord", turnLeft: "Ruota a sinistra", turnRight: "Ruota a destra" },
} as const;
const scales: { key: Scale; center: [number, number]; zoom: number; bounds?: [[number, number], [number, number]] }[] = [
  { key: "world", center: [-14, -52], zoom: 2 },
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
  const extras = mapExtras[language];
  const toolText = mapToolCopy[language];
  const controlText = mapControlCopy[language];
  const [query, setQuery] = useState("");
  const [placeFilter, setPlaceFilter] = useState<PlaceType>("all");
  const [shareStatus, setShareStatus] = useState("");
  const [legendOpen, setLegendOpen] = useState(false);
  const [chromeHost, setChromeHost] = useState<HTMLElement | null>(null);
  const [scaleIndex, setScaleIndex] = useState(0);
  const [outlineScale, setOutlineScale] = useState<Scale | null>(null);
  const scaleFromMap = useRef(false);
  const userMovedMap = useRef(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<"explore" | "details">(initialAuthorityId ? "details" : "explore");
  const [searchTipVisible, setSearchTipVisible] = useState(false);
  const searchTipSeen = useRef(false);
  const [tilted, setTilted] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [mapZoom, setMapZoom] = useState(scales[0].zoom);
  const [minimumZoom, setMinimumZoom] = useState(2);
  const [explorePanelHeight, setExplorePanelHeight] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<MapSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selectedAuthorityId, setSelectedAuthorityId] = useState<string | null>(initialAuthorityId ?? null);
  const [authorityRecord, setAuthorityRecord] = useState<(PublicAuthority & { marc_text: string }) | null>(null);
  const [recordError, setRecordError] = useState(false);
  const [headerPinned, setHeaderPinned] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [viewportRevision, setViewportRevision] = useState(0);
  const [mapView, setMapView] = useState<MapView | null>(null);
  const mapNode = useRef<HTMLDivElement>(null);
  const panelNode = useRef<HTMLElement>(null);
  const compassDrag = useRef<{ startAngle: number; startBearing: number; startX: number; startY: number; moved: boolean } | null>(null);
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
  const restoredView = useRef(false);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { setChromeHost(document.querySelector<HTMLElement>(".authority-map-page__chrome")); }, []);
  const chooseScale = (index: number) => { scaleFromMap.current = false; setOutlineScale(scales[index].key); setScaleIndex(index); };
  const followMapZoom = (zoom: number) => {
    const next = zoom < 3 ? 0 : zoom < 4.5 ? 1 : zoom < 5.5 ? 2 : zoom < 6.5 ? 3 : zoom < 9 ? 4 : 5;
    scaleFromMap.current = true;
    setOutlineScale(null);
    setScaleIndex(next);
  };
  useEffect(() => {
    if (panelTab !== "explore" || !panelNode.current || !panelOpen) return;
    const panel = panelNode.current;
    const measure = () => setExplorePanelHeight(Math.round(panel.getBoundingClientRect().height));
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    measure();
    return () => observer.disconnect();
  }, [panelTab, panelOpen, searchTipVisible, suggestionsOpen]);
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
    const revealAtTop = (event: globalThis.PointerEvent) => { if (event.clientY < chrome.getBoundingClientRect().top + 64) reveal(); };
    chrome.addEventListener("pointerenter", reveal);
    chrome.addEventListener("pointerleave", schedule);
    chrome.addEventListener("focusin", reveal);
    chrome.addEventListener("focusout", schedule);
    document.addEventListener("pointermove", revealAtTop);
    schedule();
    return () => { clear(); chrome.removeEventListener("pointerenter", reveal); chrome.removeEventListener("pointerleave", schedule); chrome.removeEventListener("focusin", reveal); chrome.removeEventListener("focusout", schedule); document.removeEventListener("pointermove", revealAtTop); };
  }, [headerPinned]);
  const filtered = useMemo(() => points.filter((point) => inScale(point, scale.key) && (placeFilter === "all" || placeType(point) === placeFilter) && `${point.place_label} ${point.term_label}`.toLocaleLowerCase(language).includes(query.toLocaleLowerCase(language))), [points, scale.key, placeFilter, query, language]);
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setSuggestions([]); setSuggestionsLoading(false); return; }
    const controller = new AbortController();
    setSuggestionsLoading(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/autoridades?${new URLSearchParams({ q: term })}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() as Promise<{ results: MapSuggestion[] }> : Promise.reject())
        .then((data) => setSuggestions(data.results.filter((item) => points.some((point) => point.authority_id === item.id)).slice(0, 6)))
        .catch(() => { if (!controller.signal.aborted) setSuggestions([]); })
        .finally(() => { if (!controller.signal.aborted) setSuggestionsLoading(false); });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, points]);
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
    setQuery("");
    setSuggestionsOpen(false);
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
        // Liberty contains the 3D buildings and POI symbols absent from Fiord.
        // Keep its layers in both themes and change only their paint properties.
        const originalPaint = new Map<string, unknown>();
        const paint = (id: string, property: string, value: unknown, dark: boolean) => {
          if (!map?.getLayer(id)) return;
          const key = `${id}:${property}`;
          if (!originalPaint.has(key)) originalPaint.set(key, map.getPaintProperty(id, property) ?? null);
          map.setPaintProperty(id, property, dark ? value : originalPaint.get(key));
        };
        const applyTheme = () => {
          if (!map?.isStyleLoaded()) return;
          const dark = document.documentElement.dataset.theme === "dark";
          map.setSky({ "sky-color": dark ? "rgba(10, 20, 41, 0)" : "rgba(19, 42, 76, 0)", "horizon-color": dark ? "rgba(10, 20, 41, 0)" : "rgba(19, 42, 76, 0)", "atmosphere-blend": 0 });
          for (const layer of map.getStyle().layers) {
            if (layer.type === "background") paint(layer.id, "background-color", "#202b3a", dark);
            if (layer.type === "fill") {
              if (/water|ocean|sea/i.test(layer.id)) paint(layer.id, "fill-color", "#24425a", dark);
              else if (/park|forest|wood|grass|landcover/i.test(layer.id)) paint(layer.id, "fill-color", "#35483f", dark);
              else if (/building/i.test(layer.id)) paint(layer.id, "fill-color", "#526174", dark);
              else paint(layer.id, "fill-color", "#354155", dark);
            }
            if (layer.type === "fill-extrusion") paint(layer.id, "fill-extrusion-color", "#78899c", dark);
            if (layer.type === "line") {
              if (/road|street|highway|transport/i.test(layer.id)) paint(layer.id, "line-color", "#71849c", dark);
              else if (/water|river|stream/i.test(layer.id)) paint(layer.id, "line-color", "#507c9b", dark);
            }
            if (layer.type === "symbol" && layer.layout?.["text-field"]) {
              paint(layer.id, "text-color", "#e4ebf2", dark);
              paint(layer.id, "text-halo-color", "#182531", dark);
              paint(layer.id, "text-halo-width", 1.25, dark);
            }
          }
          if (map.getLayer("authority-scale-outline")) {
            paint("authority-scale-outline", "line-color", "#d5e8ff", dark);
          }
        };
        map = new M.Map({ container: mapNode.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [scales[0].center[1], scales[0].center[0]], zoom: scales[0].zoom, minZoom: 2, maxZoom: 18, maxPitch: 60, renderWorldCopies: true, attributionControl: false });
        mapRef.current = map;
        map.on("style.load", () => {
          if (!map) return;
          map.setProjection({ type: "globe" });
          const dark = document.documentElement.dataset.theme === "dark";
          const label = ["coalesce", ["get", `name:${language}`], ["get", `name_${language}`], ["get", "name:latin"], ["get", "name_en"], ["get", "name"]];
          for (const layer of map.getStyle().layers) {
            if (layer.type === "symbol" && layer.layout?.["text-field"] && /name|label|poi|airport/i.test(layer.id)) {
              map.setLayoutProperty(layer.id, "text-field", label);
            }
          }
          map.addSource("authority-scale-outline", { type: "geojson", data: outline(scaleRef.current.key) });
          map.addLayer({ id: "authority-scale-outline", type: "line", source: "authority-scale-outline", paint: { "line-color": dark ? "#d5e8ff" : "#1a3b70", "line-width": 2, "line-opacity": .82, "line-dasharray": [3, 2] } });
          applyTheme();
        });
        map.on("load", () => {
          if (disposed || !map) return;
          applyTheme();
          loaded = true;
          if (loadTimer) clearTimeout(loadTimer);
          setReady(true);
        });
        map.on("movestart", (event) => { if (event.originalEvent) userMovedMap.current = true; });
        map.on("zoom", () => { if (map && userMovedMap.current) followMapZoom(map.getZoom()); });
        map.on("moveend", () => { if (!map) return; const bounds = map.getBounds(); const center = map.getCenter(); setMapView({ zoom: map.getZoom(), west: bounds.getWest(), east: bounds.getEast(), south: bounds.getSouth(), north: bounds.getNorth(), latitude: center.lat, longitude: center.lng }); setMapZoom(map.getZoom()); setMinimumZoom(map.getMinZoom()); setBearing(map.getBearing()); setViewportRevision((value) => value + 1); userMovedMap.current = false; });
        map.on("pitchend", () => { if (map) setTilted(map.getPitch() > 1); });
        map.on("rotate", () => { if (map) setBearing(map.getBearing()); });
        themeObserver = new MutationObserver(applyTheme);
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
      map = L.map(rasterNode.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: true, minZoom: 2, maxZoom: 18, worldCopyJump: true }).setView(scales[0].center, scales[0].zoom);
      rasterRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' }).addTo(map);
      rasterMarkersRef.current = L.layerGroup().addTo(map);
      map.on("movestart", (event) => { if ("originalEvent" in event) userMovedMap.current = true; });
      map.on("zoom", () => { if (map && userMovedMap.current) followMapZoom(map.getZoom()); });
      map.on("moveend", () => { if (!map) return; const bounds = map.getBounds(); const center = map.getCenter(); setMapView({ zoom: map.getZoom(), west: bounds.getWest(), east: bounds.getEast(), south: bounds.getSouth(), north: bounds.getNorth(), latitude: center.lat, longitude: center.lng }); setMapZoom(map.getZoom()); setViewportRevision((value) => value + 1); userMovedMap.current = false; });
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
    vectorSource?.setData(outline(outlineScale ?? "world"));
    if (rasterReady && rasterRef.current) {
      rasterOutlineRef.current?.remove();
      rasterOutlineRef.current = leafletRef.current ? leafletRef.current.layerGroup((outline(outlineScale ?? "world").features[0]?.geometry.coordinates ?? []).map((ring) => leafletRef.current!.polyline(ring.map(([longitude, latitude]) => [latitude, longitude] as [number, number]), { color: "#1a3b70", weight: 2, dashArray: "6 5", interactive: false }))).addTo(rasterRef.current) : null;
      if (scaleFromMap.current) { scaleFromMap.current = false; return; }
      if (scale.bounds) rasterRef.current.flyToBounds([[scale.bounds[0][1], scale.bounds[0][0]], [scale.bounds[1][1], scale.bounds[1][0]]], { padding: [64, 64], duration: .8 });
      else rasterRef.current.flyTo(scale.center, scale.zoom, { duration: .8 });
    } else if (ready && mapRef.current) {
      if (scaleFromMap.current) { scaleFromMap.current = false; return; }
      if (scale.bounds) mapRef.current.fitBounds(scale.bounds, { padding: 64, duration: 800 });
      else mapRef.current.flyTo({ center: [scale.center[1], scale.center[0]], zoom: scale.zoom, duration: 800 });
    }
  }, [ready, rasterReady, scale, outlineScale]);
  useEffect(() => {
    if ((!ready && !rasterReady) || restoredView.current) return;
    const params = new URLSearchParams(window.location.search);
    const targetScale = scales.findIndex((item) => item.key === params.get("escala"));
    if (targetScale >= 0 && targetScale !== scaleIndex) { setScaleIndex(targetScale); return; }
    restoredView.current = true;
    const savedType = params.get("tipo");
    if (["neighborhood", "square", "street", "institution", "other"].includes(savedType ?? "")) setPlaceFilter(savedType as PlaceType);
    setQuery(params.get("busca") ?? "");
    const view = params.get("vista")?.split(",").map(Number);
    if (view?.length === 5 && view.every(Number.isFinite) && Math.abs(view[0]) <= 180 && Math.abs(view[1]) <= 90 && view[2] >= 2 && view[2] <= 18 && Math.abs(view[3]) <= 180 && view[4] >= 0 && view[4] <= 60) {
      if (rasterReady) rasterRef.current?.setView([view[1], view[0]], view[2], { animate: false });
      else mapRef.current?.jumpTo({ center: [view[0], view[1]], zoom: view[2], bearing: view[3], pitch: view[4] });
    }
  }, [ready, rasterReady, scaleIndex]);
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
      const place = group.find((item) => item.points.some((point) => point.authority_id === selectedAuthorityId)) ?? group[0];
      const total = group.reduce((sum, item) => sum + item.points.length, 0);
      const selectedMarker = group.some((item) => item.points.some((point) => point.authority_id === selectedAuthorityId));
      const kinds = new Set(group.flatMap((item) => item.points.map(markerKind)));
      const kind = kinds.size === 1 ? [...kinds][0] : "mixed";
      const element = document.createElement("button");
      element.type = "button";
      element.className = `authority-world__marker authority-world__marker--${kind}${selectedMarker ? " authority-world__marker--selected" : ""}${total > 1 ? " authority-world__marker--cluster" : ""}`;
      element.setAttribute("aria-label", total > 1 ? `${total} ${t.themes}` : place.name);
      if (total > 1) element.textContent = String(total);
      if (total === 1) {
        const tooltip = mapTooltip(place.name);
        const position = map.project([place.longitude, place.latitude]);
        const tooltipSide = position.x < (panelOpen ? 690 : 210) && position.y > map.getContainer().clientHeight - 380 ? "right" : position.x > map.getContainer().clientWidth - 225 ? "left" : position.y < 95 ? "bottom" : "top";
        tooltip.classList.add(`authority-world__marker-tooltip--${tooltipSide}`);
        element.append(tooltip);
      }
      element.addEventListener("click", () => {
        if (total > 1 && group.length > 1 && map.getZoom() < 16) map.flyTo({ center: [place.longitude, place.latitude], zoom: Math.min(map.getZoom() + 2, 16), duration: 500 });
        else openAuthority(place.points.find((point) => point.authority_id === selectedAuthorityId) ?? place.points[0]);
      });
      markersRef.current.push(new M.Marker({ element, anchor: "center" }).setLngLat([place.longitude, place.latitude]).addTo(map));
    });
  }, [places, ready, selectedAuthorityId, viewportRevision, panelOpen]);
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
      const place = group.find((item) => item.points.some((point) => point.authority_id === selectedAuthorityId)) ?? group[0];
      const total = group.reduce((sum, item) => sum + item.points.length, 0);
      const selectedMarker = group.some((item) => item.points.some((point) => point.authority_id === selectedAuthorityId));
      const kinds = new Set(group.flatMap((item) => item.points.map(markerKind)));
      const kind = kinds.size === 1 ? [...kinds][0] : "mixed";
      const marker = L.marker([place.latitude, place.longitude], { icon: L.divIcon({ className: "authority-world__marker-shell", html: `<span class="authority-world__marker authority-world__marker--${kind}${selectedMarker ? " authority-world__marker--selected" : ""}${total > 1 ? " authority-world__marker--cluster" : ""}">${total > 1 ? total : ""}</span>`, iconSize: [total > 1 ? 30 : 16, total > 1 ? 30 : 16] }) });
      if (total === 1) {
        const position = map.latLngToContainerPoint([place.latitude, place.longitude]);
        const direction = position.x < (panelOpen ? 690 : 210) && position.y > map.getContainer().clientHeight - 380 ? "right" : position.x > map.getContainer().clientWidth - 225 ? "left" : position.y < 95 ? "bottom" : "top";
        const tooltip = mapTooltip(place.name);
        marker.bindTooltip(tooltip, { direction, offset: [0, 12], permanent: selectedMarker, className: selectedMarker ? "authority-world__leaflet-tooltip authority-world__leaflet-tooltip--selected" : "authority-world__leaflet-tooltip" });
        marker.on("tooltipopen", () => activateMapTooltip(tooltip));
      }
      marker.on("click", () => { if (total > 1 && group.length > 1 && map.getZoom() < 16) map.flyTo([place.latitude, place.longitude], Math.min(map.getZoom() + 2, 16), { duration: .5 }); else openAuthority(place.points.find((point) => point.authority_id === selectedAuthorityId) ?? place.points[0]); });
      rasterMarkersRef.current?.addLayer(marker);
    });
  }, [places, rasterReady, selectedAuthorityId, viewportRevision, panelOpen]);
  useEffect(() => {
    if (!initialAuthorityId || (!ready && !rasterReady)) return;
    if (new URLSearchParams(window.location.search).has("vista")) return;
    const point = points.find((item) => item.authority_id === initialAuthorityId);
    if (!point) return;
    const timer = window.setTimeout(() => {
      if (rasterReady) rasterRef.current?.flyTo([point.latitude, point.longitude], Math.max(rasterRef.current?.getZoom() ?? 0, 11), { duration: .7 });
      else mapRef.current?.flyTo({ center: [point.longitude, point.latitude], zoom: Math.max(mapRef.current?.getZoom() ?? 0, 11), duration: 700 });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [initialAuthorityId, points, ready, rasterReady]);
  const compassAngle = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - bounds.top - bounds.height / 2, event.clientX - bounds.left - bounds.width / 2) * 180 / Math.PI;
  };
  const compassClickBearing = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - bounds.left - bounds.width / 2;
    const dy = event.clientY - bounds.top - bounds.height / 2;
    if (Math.hypot(dx, dy) <= bounds.width * .17) return 0;
    const angleFromNorth = (compassAngle(event) + 90 + 360) % 360;
    const currentBearing = mapRef.current?.getBearing() ?? 0;
    const directionIndex = Math.round((angleFromNorth + currentBearing) / 45) % 8;
    return directionIndex * 45;
  };
  const compassDegrees = ((Math.round(bearing) % 360) + 360) % 360;
  const compassLabels = language === "pt" ? ["N", "NE", "L", "SE", "S", "SO", "O", "NO"] : language === "de" ? ["N", "NO", "O", "SO", "S", "SW", "W", "NW"] : language === "en" ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] : ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const compassDirection = compassLabels[Math.round(compassDegrees / 45) % 8];
  const shareView = async () => {
    const url = new URL(window.location.href);
    url.search = "";
    if (selectedAuthorityId) url.searchParams.set("autoridade", selectedAuthorityId);
    url.searchParams.set("escala", scale.key);
    if (placeFilter !== "all") url.searchParams.set("tipo", placeFilter);
    if (query.trim()) url.searchParams.set("busca", query.trim());
    const map = mapRef.current;
    const raster = rasterRef.current;
    if (map || raster) {
      const center = map?.getCenter() ?? raster!.getCenter();
      const values = [center.lng, center.lat, map?.getZoom() ?? raster!.getZoom(), map?.getBearing() ?? 0, map?.getPitch() ?? 0];
      url.searchParams.set("vista", values.map((value) => Number(value.toFixed(5))).join(","));
    }
    try { await navigator.clipboard.writeText(url.toString()); setShareStatus(toolText.copied); }
    catch { setShareStatus(toolText.copyFailed); }
    window.setTimeout(() => setShareStatus(""), 3500);
  };
  return <main className="authority-world" id="mapa-autoridades">
    <div ref={mapNode} className="authority-world__canvas" role="region" aria-label={ui.mapLabel} />
    {mapError && <div ref={rasterNode} className="authority-world__raster" role="region" aria-label={ui.mapLabel} />}
    {(points.length === 0 || (mapError && !rasterReady)) && <div className="authority-world__empty">{mapError && !rasterReady ? ui.mapUnavailable : t.empty}</div>}
    {chromeHost && createPortal(<button type="button" className="authority-world__header-pin" onClick={() => { setHeaderPinned(!headerPinned); setHeaderVisible(!headerPinned); }} aria-label={headerPinned ? controlText.hideHeader : controlText.showHeader} aria-pressed={headerPinned} title={headerPinned ? controlText.hideHeader : controlText.showHeader}>{headerPinned ? <IconEyeOff size={18} /> : <IconEye size={18} />}</button>, chromeHost)}
    <div className="authority-world__controls">
      {legendOpen && <div className="authority-world__legend-popover" role="dialog" aria-label={toolText.legend}><div className="authority-world__legend-head"><strong>{toolText.legend}</strong><button type="button" onClick={() => setLegendOpen(false)} aria-label={controlText.close}>×</button></div><div>{(["heading", "subdivision", "associated", "mixed", "cluster"] as const).map((kind) => <span key={kind}><i className={`authority-world__legend-dot authority-world__legend-dot--${kind}`} />{toolText[kind]}</span>)}</div><p>{controlText.legendHint}</p></div>}
      <div className="authority-world__control-actions"><button type="button" onClick={() => setLegendOpen((open) => !open)} aria-expanded={legendOpen}><AppIcon name="help" />{toolText.legend}</button><button type="button" onClick={shareView} aria-label={shareStatus === toolText.copied ? toolText.copied : toolText.share} title={shareStatus === toolText.copied ? toolText.copied : toolText.share}><AppIcon name={shareStatus === toolText.copied ? "check" : "link"} /></button></div>
      <div className="authority-world__zoom" role="group" aria-label={ui.mapControls}>
        <button type="button" disabled={mapZoom >= 17.95} onClick={() => { userMovedMap.current = true; rasterReady ? rasterRef.current?.zoomIn() : mapRef.current?.zoomIn(); }} aria-label={t.zoomIn} title={t.zoomIn}>+</button>
        <button type="button" disabled={mapZoom <= minimumZoom + .01} onClick={() => { userMovedMap.current = true; rasterReady ? rasterRef.current?.zoomOut() : mapRef.current?.zoomOut(); }} aria-label={t.zoomOut} title={t.zoomOut}>−</button>
        <button type="button" onClick={() => { setSelectedAuthorityId(null); setPanelTab("explore"); setAuthorityRecord(null); setQuery(""); if (rasterReady && rasterRef.current) { if (scale.bounds) rasterRef.current.flyToBounds([[scale.bounds[0][1], scale.bounds[0][0]], [scale.bounds[1][1], scale.bounds[1][0]]], { padding: [64, 64] }); else rasterRef.current.flyTo(scale.center, scale.zoom); } else if (mapRef.current) { if (scale.bounds) mapRef.current.fitBounds(scale.bounds, { padding: 64 }); else mapRef.current.flyTo({ center: [scale.center[1], scale.center[0]], zoom: scale.zoom, pitch: 0, bearing: 0 }); } setTilted(false); }} aria-label={t.reset} title={t.reset}><AppIcon name="refresh" /></button>
        <button type="button" disabled={mapError} aria-pressed={tilted} onClick={() => { const map = mapRef.current; if (!map) return; map.easeTo({ pitch: tilted ? 0 : 58, duration: 700 }); }} aria-label={tilted ? extras.flatten : extras.tilt} title={tilted ? extras.flatten : extras.tilt}>{tilted ? <IconCube3dSphereOff size={18} /> : <Icon3dCubeSphere size={18} />}</button>
      </div>
      <div className="authority-world__compass" role="group" aria-label={extras.resetNorth}>
        <button type="button" disabled={mapError} onPointerDown={(event) => { compassDrag.current = { startAngle: compassAngle(event), startBearing: mapRef.current?.getBearing() ?? 0, startX: event.clientX, startY: event.clientY, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { const drag = compassDrag.current; if (!drag) return; const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY); if (distance > 4) drag.moved = true; if (drag.moved) mapRef.current?.setBearing(drag.startBearing + (compassAngle(event) - drag.startAngle)); }} onPointerUp={(event) => { if (compassDrag.current && !compassDrag.current.moved) mapRef.current?.rotateTo(compassClickBearing(event), { duration: 500 }); compassDrag.current = null; }} onPointerCancel={() => { compassDrag.current = null; }} onClick={(event) => { if (event.detail === 0) mapRef.current?.rotateTo(0, { duration: 500 }); }} aria-label={`${extras.resetNorth}. ${compassDirection}, ${compassDegrees}°`} title={`${compassDirection} · ${compassDegrees}° — ${extras.resetNorth}`}><CompassArt bearing={bearing} labels={compassLabels} degrees={compassDegrees} direction={compassDirection} /></button>
      </div>
    </div>
    <div className="authority-world__credits">{!mapError && <><span>{ui.creditsMap}: <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a></span><span aria-hidden="true"> · </span></>}<span>{ui.creditsData}: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap {ui.creditsContributors}</a></span></div>
    <aside ref={panelNode} className="authority-world__panel" data-open={panelOpen} data-tab={panelTab} style={panelOpen && panelTab === "details" ? { height: explorePanelHeight ?? 560 } : undefined} aria-label={t.title}>
      <div className="authority-world__tabs-shell" aria-hidden={!panelOpen} inert={!panelOpen}><div className="authority-world__tabs" role="tablist" aria-label={t.title}><button type="button" role="tab" aria-selected={panelTab === "explore"} onClick={() => setPanelTab("explore")}>{panelText.explore}</button><span className="authority-world__tab-wrap"><button type="button" role="tab" aria-selected={panelTab === "details"} disabled={!selectedAuthorityId} onClick={() => setPanelTab("details")}>{extras.theme}</button>{!selectedAuthorityId && <span className="authority-world__tab-tip" role="tooltip">{extras.selectPoint}</span>}</span></div></div>
      <div className="authority-world__panel-content" aria-hidden={!panelOpen} inert={!panelOpen} onScroll={(event) => { const panel = event.currentTarget.closest<HTMLElement>(".authority-world__panel"); if (panel) panel.dataset.scrolled = String(panelTab === "details" && event.currentTarget.scrollTop > 2); }}>
        {panelTab === "explore" ? <>
        <div className="authority-world__panel-heading"><p className="eyebrow"><AppIcon name="globe" />{ui.panelEyebrow}</p><h1>{t.title}</h1><p>{t.intro}</p></div>
        <label className="authority-world__search"><span>{t.search}</span><div><AppIcon name="search" /><input type="search" value={query} onFocus={() => { setSuggestionsOpen(true); if (!searchTipSeen.current) { searchTipSeen.current = true; setSearchTipVisible(true); } }} onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 180)} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} /></div></label>
        {suggestionsOpen && query.trim().length >= 2 && <div className="authority-world__suggestions" role="region" aria-live="polite">{suggestionsLoading ? <p>{t.search}…</p> : suggestions.length ? <ul>{suggestions.map((item) => <li key={item.id}><button type="button" onClick={() => { const point = points.find((candidate) => candidate.authority_id === item.id); if (point) openAuthority(point); }}><span className="authority-world__suggestion-type">{item.heading_type ? publicAuthorityType(language, item.heading_type) : item.source}</span><strong>{item.label}</strong>{item.label_en && <small>{item.label_en}</small>}</button></li>)}</ul> : <p>{t.noResults}</p>}</div>}
        {searchTipVisible && <div className="authority-world__search-tip" role="note"><AppIcon name="help" /><p>{extras.searchTip}</p><Link href={`/autoridades?busca=${encodeURIComponent(query.trim())}&mapa=1`} onClick={() => setSearchTipVisible(false)}>{extras.advancedSearch} ↗</Link><button type="button" onClick={() => setSearchTipVisible(false)} aria-label={extras.dismiss} title={extras.dismiss}>×</button></div>}
        <div className="authority-world__scale"><label htmlFor="authority-map-scale">{ui.scale}</label><p>{ui.scaleHint}</p><div className="authority-world__scale-track"><span className="authority-world__scale-progress" style={{ width: `${scaleIndex / (scales.length - 1) * 100}%` }} aria-hidden="true" /><span className="authority-world__scale-thumb" style={{ left: `${scaleIndex / (scales.length - 1) * 100}%` }} aria-hidden="true" /><input id="authority-map-scale" type="range" min="0" max={scales.length - 1} step="1" value={scaleIndex} onChange={(event) => chooseScale(Number(event.target.value))} aria-valuetext={scale.key === "world" ? t.world : scale.key === "brazil" ? t.brazil : ui[scale.key]} /></div><div className="authority-world__scale-stops">{scales.map((item, index) => <button type="button" key={item.key} aria-current={scaleIndex === index ? "step" : undefined} onClick={() => chooseScale(index)}><span>{item.key === "world" ? t.world : item.key === "brazil" ? t.brazil : ui[item.key]}</span>{item.key === "world" ? <AppIcon name="globe" /> : <span className={`authority-world__scale-shape authority-world__scale-shape--${item.key}`} aria-hidden="true" />}</button>)}</div></div>
        <div className="authority-world__place-tools"><label htmlFor="authority-map-place-type">{toolText.filter}<select id="authority-map-place-type" value={placeFilter} onChange={(event) => setPlaceFilter(event.target.value as PlaceType)}>{(["all", "neighborhood", "square", "street", "institution", "other"] as const).map((kind) => <option key={kind} value={kind}>{toolText[kind]}</option>)}</select></label><p>{controlText.filterHint}</p></div>
        {shareStatus && <p className="sr-only" role="status">{shareStatus}</p>}
        <div className="authority-world__places"><h2>{t.all} <span>{uniquePlaces(points).length}</span></h2><ul className="authority-world__hierarchy">{hierarchyRows(points, mapView).map((row) => <li key={`${row.depth}:${row.name}`} style={{ paddingInlineStart: `${row.depth * 12}px` }}><span>{row.name}</span><strong>{row.count}</strong></li>)}{uniquePlaces(points).filter((point) => !point.geography.country).length > 0 && <li><span>{panelText.pending}</span><strong>{uniquePlaces(points).filter((point) => !point.geography.country).length}</strong></li>}</ul>{points.length === 0 && <p>{t.empty}</p>}</div>
        </> : <div className="authority-world__record" role="tabpanel">
          {recordError ? <p>{panelText.unavailable}</p> : !authorityRecord ? <div className="authority-world__record-loading" role="status"><BookLoadingIcon compact /><span>{panelText.loading}</span></div> : <>
            <div className="authority-world__record-heading"><span className="public-authority-detail__type">{publicAuthorityType(language, authorityRecord.heading_type)}</span><Link href={`/autoridades/${authorityRecord.id}`} aria-label={panelText.openPage} title={panelText.openPage}><AppIcon name="external" /></Link></div>
            <p className="eyebrow">{panelText.preferred}</p><h2>{authorityRecord.label}</h2>
            {places.find((place) => place.points.some((point) => point.authority_id === authorityRecord.id))?.points.filter((point) => point.authority_id !== authorityRecord.id).map((point) => <button type="button" className="authority-world__related-place" key={point.authority_id} onClick={() => openAuthority(point)}>{point.term_label} →</button>)}
            {authorityRecord.notes[0]?.value && <div className="authority-world__record-section authority-world__record-section--intro"><h3><AppIcon name="book" />{panelText.notes}</h3><p>{authorityRecord.notes[0].value}</p></div>}
            <AuthorityProfileView profile={authorityRecord.public_profile} language={language} compact />
            {authorityRecord.label_en && <div className="authority-world__record-section"><h3><AppIcon name="globe" />{panelText.equivalent}</h3><p><span lang="en">English (EN)</span> {authorityRecord.label_en}</p></div>}
            {authorityRecord.components.length > 1 && <div className="authority-world__record-section"><h3><AppIcon name="hierarchy" />{panelText.composition}</h3><ol>{authorityRecord.components.map((part, index) => <li key={index}><strong>{part.kind === "Assunto-base" ? publicAuthorityType(language, authorityRecord.heading_type) : part.kind}</strong> {part.value}</li>)}</ol></div>}
            {!!authorityRecord.variants.length && <div className="authority-world__record-section"><h3><AppIcon name="search" />{panelText.variants}</h3><ul>{authorityRecord.variants.map((part, index) => <li key={index}>{part.value}</li>)}</ul></div>}
            {!!authorityRecord.relations.length && <div className="authority-world__record-section"><h3><AppIcon name="link" />{panelText.relations}</h3><ul>{authorityRecord.relations.map((part, index) => <li key={index}>{part.kind && <strong>{part.kind}: </strong>}{part.value}</li>)}</ul></div>}
            {authorityRecord.notes.slice(1).map((note, index) => <div className="authority-world__record-section" key={index}><h3><AppIcon name="document" />{note.kind || panelText.notes}</h3><p>{note.value}</p></div>)}
            <div className="authority-world__record-section"><h3><AppIcon name="book" />{panelText.source}</h3><p>{({ pronto: "Pronto!", pergamum_ufba: "Pergamum UFBA", rede_pergamum: "Rede Pergamum", bn: "Biblioteca Nacional", loc: "Library of Congress", getty_aat: "Getty AAT" } as Record<string, string>)[authorityRecord.source.toLowerCase()] ?? authorityRecord.source}{authorityRecord.source_identifier ? ` · ${authorityRecord.source_identifier}` : ""}</p>{authorityRecord.source_url?.startsWith("https://") && <a href={authorityRecord.source_url} target="_blank" rel="noopener noreferrer">{authorityRecord.source_url}</a>}</div>
            <AuthorityProfileView profile={authorityRecord.public_profile} language={language} professional compact />
            <div className="authority-world__record-section authority-world__record-value"><h3><AppIcon name="download" />{({ pt: "Exportar tema", en: "Export theme", es: "Exportar tema", de: "Thema exportieren", fr: "Exporter le thème", it: "Esporta tema" } as const)[language]}</h3><p>{authorityRecord.rights_statement}</p><div className="authority-world__record-downloads"><a href={`/autoridades/${authorityRecord.id}/marc.xml`}>MARCXML</a><a href={`/autoridades/${authorityRecord.id}/marc.mrc`}>ISO 2709</a><a href={`/autoridades/${authorityRecord.id}/skos.jsonld`}>SKOS/JSON-LD</a></div><details><summary><AppIcon name="document" />MARC21<AppIcon name="chevronDown" /></summary><div className="authority-professional-view__code" onCopy={(event) => { event.clipboardData.setData("text/plain", authorityRecord.marc_text); event.preventDefault(); }}><code>{authorityRecord.marc_text.split("\n").map((line, index) => <span className="authority-professional-view__code-line" key={index}><strong>{line.slice(0, 4)}</strong>{line.slice(4)}</span>)}</code></div></details></div>
            <div className="authority-world__record-section authority-world__record-value"><h3><AppIcon name="help" />{authorityValueCopy[language].title}</h3><details><summary><AppIcon name="globe" />{panelText.publicUse}<AppIcon name="chevronDown" /></summary><p>{authorityValueCopy[language].publicText}</p></details><details><summary><AppIcon name="book" />{panelText.librarianUse}<AppIcon name="chevronDown" /></summary><p>{authorityValueCopy[language].librarianText}</p></details></div>
          </>}
        </div>}
      </div>
      <div className="authority-world__panel-footer"><button type="button" className="authority-world__panel-toggle" onClick={() => setPanelOpen((value) => !value)} aria-expanded={panelOpen} aria-label={panelOpen ? ui.collapsePanel : ui.expandPanel}><AppIcon name={panelOpen ? "panelCollapse" : "panelExpand"} /><span>{panelOpen ? ui.collapsePanel : ui.explorePanel}</span></button></div>
    </aside>
  </main>;
}
