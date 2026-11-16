"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type * as Leaflet from "leaflet";
import { AppIcon } from "./app-icon";
import type { AuthorityPlaceDraft } from "./authority-place-fields";

type Suggestion = {
  id: string; label: string; latitude: number; longitude: number;
  sourceUrl: string; inBrazil: boolean; state: string; municipality: string;
};

export function AuthorityPlacePicker({ value, onChange, disabled }: { value: AuthorityPlaceDraft; onChange: (value: AuthorityPlaceDraft) => void; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const mapNode = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const leaflet = useRef<typeof Leaflet | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };

  useEffect(() => {
    if (!mapNode.current) return;
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !mapNode.current) return;
      leaflet.current = L;
      const current = latest.current.value;
      const hasPoint = current.latitude.trim() !== "" && current.longitude.trim() !== "" && Number.isFinite(Number(current.latitude)) && Number.isFinite(Number(current.longitude));
      const initial: [number, number] = hasPoint ? [Number(current.latitude), Number(current.longitude)] : [-14.2, -51.9];
      const instance = L.map(mapNode.current, { zoomControl: true, scrollWheelZoom: false }).setView(initial, hasPoint ? 13 : 4);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' }).addTo(instance);
      map.current = instance;
      instance.on("click", (event: Leaflet.LeafletMouseEvent) => choosePoint(event.latlng.lat, event.latlng.lng));
      if (hasPoint) showMarker(initial[0], initial[1]);
      window.setTimeout(() => { if (!disposed) instance.invalidateSize(); }, 100);
    });
    return () => { disposed = true; map.current?.remove(); map.current = null; marker.current = null; leaflet.current = null; };
  }, []);

  useEffect(() => {
    const latitude = Number(value.latitude), longitude = Number(value.longitude);
    if (value.latitude.trim() && value.longitude.trim() && Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180)
      showMarker(latitude, longitude);
    else if (marker.current) { marker.current.remove(); marker.current = null; }
  }, [value.latitude, value.longitude]);

  function showMarker(latitude: number, longitude: number) {
    if (!leaflet.current || !map.current) return;
    if (!marker.current) {
      const icon = leaflet.current.divIcon({ className: "authority-place-picker__pin", iconSize: [30, 38], iconAnchor: [15, 36] });
      marker.current = leaflet.current.marker([latitude, longitude], { draggable: true, icon }).addTo(map.current);
      marker.current.on("dragend", () => { const point = marker.current?.getLatLng(); if (point) choosePoint(point.lat, point.lng); });
    } else marker.current.setLatLng([latitude, longitude]);
  }

  function choosePoint(latitude: number, longitude: number) {
    const { value: current, onChange: change } = latest.current;
    const source = current.source.includes("OpenStreetMap (Nominatim)")
      ? `${current.source.replace(/; ajustado pela equipe$/, "")}; ajustado pela equipe`
      : "OpenStreetMap (mapa do Pronto!); ponto marcado pela equipe";
    change({ ...current, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6), source });
    setMessage("Ponto ajustado e fonte do mapa registrada automaticamente. Confira a posição antes de salvar.");
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 3 || busy) return;
    setBusy(true); setMessage(""); setResults([]);
    try {
      const response = await fetch(`/api/admin/lugares/buscar?q=${encodeURIComponent(term)}`, { cache: "no-store" });
      const payload = await response.json() as { results?: Suggestion[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "A busca está indisponível. Marque o ponto no mapa.");
      const found = Array.isArray(payload.results) ? payload.results : [];
      setResults(found);
      if (!found.length) setMessage("Nenhum lugar encontrado. Tente incluir município e estado ou marque o ponto no mapa.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "A busca está indisponível. Marque o ponto no mapa."); }
    setBusy(false);
  }

  function select(result: Suggestion) {
    const source = `OpenStreetMap (Nominatim), ${result.sourceUrl}; ponto sugerido`;
    onChange({ ...value, latitude: result.latitude.toFixed(6), longitude: result.longitude.toFixed(6),
      inBrazil: result.inBrazil, source,
      geography: { ...value.geography, ...(result.inBrazil ? { continent: "América do Sul", country: "Brasil" } : {}),
        state: result.state, municipality: result.municipality } });
    map.current?.setView([result.latitude, result.longitude], 14);
    showMarker(result.latitude, result.longitude);
    setResults([]);
    setMessage("Ponto sugerido selecionado e fonte da busca registrada automaticamente. Confira a posição e a hierarquia antes de salvar.");
  }

  return <section className="authority-place-picker" aria-label="Escolher ponto de referência">
    <div className="authority-place-fields__heading"><AppIcon name="search" /><div><strong>Encontrar ponto de referência</strong><small>Busque o bairro com município e estado. A busca só acontece ao acionar o botão; a escolha não salva nem publica o ponto.</small></div></div>
    <form className="authority-place-picker__search" onSubmit={(event) => void search(event)}><label><span className="catalogue-field-label">Buscar lugar</span><input value={query} onChange={(event) => setQuery(event.target.value)} disabled={disabled || busy} maxLength={120} placeholder="Ex.: Engenho Velho da Federação, Salvador, BA" /></label><button type="submit" className="button button--secondary" disabled={disabled || busy || query.trim().length < 3}><AppIcon name="search" />{busy ? "Buscando…" : "Buscar ponto"}</button></form>
    {!!results.length && <div className="authority-place-picker__results" role="group" aria-label="Pontos sugeridos">{results.map((result) => <button key={result.id} type="button" disabled={disabled} onClick={() => select(result)}><strong>{result.label}</strong><small>{result.latitude.toFixed(5)}, {result.longitude.toFixed(5)}</small></button>)}</div>}
    {message && <p className="field-help" role="status">{message}</p>}
    <div ref={mapNode} className="authority-place-picker__map" aria-label="Mapa para conferir ou ajustar o ponto" />
    <p className="field-help">Clique no mapa ou arraste o marcador para ajustar. A fonte do mapa ou da sugestão é registrada automaticamente. Em bairros, o ponto representa uma referência visual, não os limites do bairro. Dados de busca: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>.</p>
  </section>;
}
