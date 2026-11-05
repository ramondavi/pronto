"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "./app-icon";
import { createClient } from "@/lib/supabase/client";
import { authorityHeadingLabel } from "@/lib/authority-heading-types";

export type AuthorityPlaceDraft = {
  placeLabel: string; latitude: string; longitude: string; inBrazil: boolean;
  source: string; linkedAuthorityId: string; linkReason: string;
};
export const emptyAuthorityPlace = (placeLabel = ""): AuthorityPlaceDraft => ({ placeLabel, latitude: "", longitude: "", inBrazil: false, source: "", linkedAuthorityId: "", linkReason: "" });
type Match = { authority_id: string; place_label: string; heading_tag: string; latitude: number; longitude: number; in_brazil: boolean; location_source: string };

export function AuthorityPlaceFields({ value, onChange, disabled, editablePlace = false, excludeAuthorityId }: { value: AuthorityPlaceDraft; onChange: (value: AuthorityPlaceDraft) => void; disabled?: boolean; editablePlace?: boolean; excludeAuthorityId?: string }) {
  const [lookup, setLookup] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  useEffect(() => {
    if (lookup.trim().length < 2) { setMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { void createClient().rpc("admin_search_authority_places", { search_value: lookup.trim() }).then(({ data }) => { if (active) setMatches(Array.isArray(data) ? data as Match[] : []); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [lookup]);
  const update = (patch: Partial<AuthorityPlaceDraft>) => onChange({ ...value, ...patch });
  return <div className="authority-place-fields">
    <div className="authority-place-fields__heading"><AppIcon name="globe" /><div><strong>Localização revisada</strong><small>Confira a posição no mapa antes de salvar. Nenhuma coordenada é inferida do nome.</small></div></div>
    <div className="authority-place-fields__grid">
      {editablePlace && <label className="authority-place-fields__wide"><span className="catalogue-field-label"><AppIcon name="tag" />Lugar associado</span><input value={value.placeLabel} disabled={disabled} maxLength={250} onChange={(event) => update({ placeLabel: event.target.value })} placeholder="Ex.: Salvador (BA)" /></label>}
      <label><span className="catalogue-field-label"><AppIcon name="globe" />Latitude</span><input type="number" step="any" min="-90" max="90" value={value.latitude} disabled={disabled} onChange={(event) => update({ latitude: event.target.value })} /></label>
      <label><span className="catalogue-field-label"><AppIcon name="globe" />Longitude</span><input type="number" step="any" min="-180" max="180" value={value.longitude} disabled={disabled} onChange={(event) => update({ longitude: event.target.value })} /></label>
      <label className="authority-place-fields__wide"><span className="catalogue-field-label"><AppIcon name="document" />Fonte das coordenadas</span><input value={value.source} disabled={disabled} maxLength={500} onChange={(event) => update({ source: event.target.value })} placeholder="Ex.: malha geográfica do IBGE" /></label>
      <label className="authority-place-fields__check"><input type="checkbox" checked={value.inBrazil} disabled={disabled} onChange={(event) => update({ inBrazil: event.target.checked })} />O ponto fica no Brasil</label>
    </div>
    <div className="authority-place-fields__associate"><label><span className="catalogue-field-label"><AppIcon name="hierarchy" />Associar a lugar já revisado</span><input value={lookup} disabled={disabled} onChange={(event) => setLookup(event.target.value)} placeholder="Busque outra autoridade geográfica" /></label>
      {matches.some((match) => match.authority_id !== excludeAuthorityId) && <div className="authority-place-fields__matches">{matches.filter((match) => match.authority_id !== excludeAuthorityId).map((match) => <button key={match.authority_id} type="button" disabled={disabled} onClick={() => { update({ placeLabel: editablePlace ? match.place_label : value.placeLabel, latitude: String(match.latitude), longitude: String(match.longitude), inBrazil: match.in_brazil, source: match.location_source, linkedAuthorityId: match.authority_id }); setLookup(match.place_label); setMatches([]); }}><strong>{match.place_label}</strong><small>{authorityHeadingLabel(match.heading_tag)}</small></button>)}</div>}
      {value.linkedAuthorityId && <label><span className="catalogue-field-label"><AppIcon name="document" />Motivo do vínculo</span><input value={value.linkReason} disabled={disabled} minLength={10} maxLength={1000} onChange={(event) => update({ linkReason: event.target.value })} placeholder="Explique por que os registros se referem ao mesmo lugar" /></label>}
    </div>
  </div>;
}

export function authorityPlaceComplete(value: AuthorityPlaceDraft): boolean {
  return !!value.placeLabel.trim() && Number.isFinite(Number(value.latitude)) && value.latitude.trim() !== ""
    && Number.isFinite(Number(value.longitude)) && value.longitude.trim() !== ""
    && value.source.trim().length >= 5 && (!value.linkedAuthorityId || value.linkReason.trim().length >= 10);
}

export async function saveAuthorityPlace(authorityId: string, position: number, value: AuthorityPlaceDraft, relationship: "same_place" | "associated_place") {
  if (!authorityPlaceComplete(value)) return;
  const client = createClient();
  const point = await client.rpc("admin_set_subject_authority_map_point", { target_authority_id: authorityId, part_position: position, latitude_value: Number(value.latitude), longitude_value: Number(value.longitude), in_brazil_value: value.inBrazil, location_source_value: value.source.trim(), remove_value: false });
  if (point.error) throw point.error;
  if (value.linkedAuthorityId) {
    const link = await client.rpc("admin_link_authority_place", { source_authority_id: authorityId, target_authority_id: value.linkedAuthorityId, relationship_value: relationship, edit_reason: value.linkReason.trim() });
    if (link.error) throw link.error;
  }
}
