"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "./app-icon";
import { createClient } from "@/lib/supabase/client";
import { authorityHeadingLabel } from "@/lib/authority-heading-types";

export type AuthorityPlaceDraft = {
  placeLabel: string; latitude: string; longitude: string; inBrazil: boolean;
  source: string; linkedAuthorityId: string; linkReason: string; editReason: string;
  geography: { continent: string; country: string; macroregion: string; state: string; municipality: string };
};
export const emptyAuthorityPlace = (placeLabel = ""): AuthorityPlaceDraft => ({ placeLabel, latitude: "", longitude: "", inBrazil: false, source: "", linkedAuthorityId: "", linkReason: "", editReason: "", geography: { continent: "", country: "", macroregion: "", state: "", municipality: "" } });
type Match = { authority_id: string; place_label: string; heading_tag: string; latitude: number; longitude: number; in_brazil: boolean; location_source: string };
type PathMatch = { id: string; name: string; level: number; path: Partial<AuthorityPlaceDraft["geography"]> };

export function AuthorityPlaceFields({ value, onChange, disabled, editablePlace = false, excludeAuthorityId }: { value: AuthorityPlaceDraft; onChange: (value: AuthorityPlaceDraft) => void; disabled?: boolean; editablePlace?: boolean; excludeAuthorityId?: string }) {
  const [lookup, setLookup] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [pathLookup, setPathLookup] = useState("");
  const [pathMatches, setPathMatches] = useState<PathMatch[]>([]);
  const [renamePath, setRenamePath] = useState<PathMatch | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameReason, setRenameReason] = useState("");
  const [renameMessage, setRenameMessage] = useState("");
  useEffect(() => {
    if (lookup.trim().length < 2) { setMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { void createClient().rpc("admin_search_authority_places", { search_value: lookup.trim() }).then(({ data }) => { if (active) setMatches(Array.isArray(data) ? data as Match[] : []); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [lookup]);
  useEffect(() => {
    if (pathLookup.trim().length < 2) { setPathMatches([]); return; }
    let active = true;
    const timer = window.setTimeout(() => { void createClient().rpc("admin_search_geographic_paths", { search_value: pathLookup.trim() }).then(({ data }) => { if (active) setPathMatches(Array.isArray(data) ? data as PathMatch[] : []); }); }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [pathLookup]);
  const update = (patch: Partial<AuthorityPlaceDraft>) => onChange({ ...value, ...patch });
  return <div className="authority-place-fields">
    <div className="authority-place-fields__heading"><AppIcon name="globe" /><div><strong>Localização revisada</strong><small>Confira a posição no mapa antes de salvar. Nenhuma coordenada é inferida do nome.</small></div></div>
    <div className="authority-place-fields__grid">
      {editablePlace && <label className="authority-place-fields__wide"><span className="catalogue-field-label"><AppIcon name="tag" />Lugar associado</span><input value={value.placeLabel} disabled={disabled} maxLength={250} onChange={(event) => update({ placeLabel: event.target.value })} placeholder="Ex.: Salvador (BA)" /></label>}
      <label><span className="catalogue-field-label"><AppIcon name="globe" />Latitude</span><input type="number" step="any" min="-90" max="90" value={value.latitude} disabled={disabled} onChange={(event) => update({ latitude: event.target.value })} /></label>
      <label><span className="catalogue-field-label"><AppIcon name="globe" />Longitude</span><input type="number" step="any" min="-180" max="180" value={value.longitude} disabled={disabled} onChange={(event) => update({ longitude: event.target.value })} /></label>
      <label className="authority-place-fields__wide"><span className="catalogue-field-label"><AppIcon name="document" />Fonte das coordenadas</span><input value={value.source} disabled={disabled} maxLength={500} onChange={(event) => update({ source: event.target.value })} placeholder="Ex.: malha geográfica do IBGE" /></label>
      <label className="authority-place-fields__check"><input type="checkbox" checked={value.inBrazil} disabled={disabled} onChange={(event) => update({ inBrazil: event.target.checked, geography: event.target.checked ? { ...value.geography, continent: "América do Sul", country: "Brasil" } : value.geography })} />O ponto fica no Brasil</label>
    </div>
    <div className="authority-place-fields__hierarchy"><div className="authority-place-fields__heading"><AppIcon name="hierarchy" /><div><strong>Hierarquia geográfica</strong><small>Reaproveite um caminho já revisado. Para uma nova cidade do mesmo estado, confirme apenas a cidade e as coordenadas.</small></div></div>
      <label><span className="catalogue-field-label"><AppIcon name="search" />Buscar caminho revisado</span><input value={pathLookup} disabled={disabled} onChange={(event) => setPathLookup(event.target.value)} placeholder="Ex.: São Paulo, Brasil" /></label>
      {!!pathMatches.length && <div className="authority-place-fields__matches">{pathMatches.map((match) => <div className="authority-place-fields__path-option" key={match.id}><button type="button" disabled={disabled} onClick={() => { update({ geography: { ...emptyAuthorityPlace().geography, ...match.path } }); setPathLookup(match.name); setPathMatches([]); }}><strong>{match.name}</strong><small>{[match.path.continent, match.path.country, match.path.macroregion, match.path.state, match.path.municipality].filter(Boolean).join(" › ")}</small></button><button type="button" disabled={disabled} onClick={() => { setRenamePath(match); setRenameValue(match.name); setRenameReason(""); setRenameMessage(""); }}>Corrigir</button></div>)}</div>}
      {renamePath && <div className="authority-place-fields__correction"><p>Esta correção atualizará o nome para todos os lugares que reutilizam este nível.</p><label><span className="catalogue-field-label"><AppIcon name="edit" />Nome corrigido</span><input value={renameValue} maxLength={120} onChange={(event) => setRenameValue(event.target.value)} /></label><label><span className="catalogue-field-label"><AppIcon name="document" />Motivo da correção</span><input value={renameReason} maxLength={1000} onChange={(event) => setRenameReason(event.target.value)} /></label><div><button className="button button--primary button--small" type="button" disabled={renameValue.trim().length < 2 || renameReason.trim().length < 10} onClick={() => { void createClient().rpc("admin_rename_geographic_unit", { target_unit_id: renamePath.id, new_name: renameValue.trim(), edit_reason: renameReason.trim() }).then(({ error }) => { if (error) setRenameMessage("Não foi possível corrigir o nome. Verifique se já existe outro nível com esse nome."); else { setRenameMessage("Nome corrigido para os lugares vinculados."); setRenamePath(null); setPathLookup(""); setPathMatches([]); } }); }}>Salvar correção</button><button className="button button--secondary button--small" type="button" onClick={() => setRenamePath(null)}>Cancelar</button></div></div>}{renameMessage && <p role="status" className="field-help">{renameMessage}</p>}
      <div className="authority-place-fields__grid">
        {([['continent','Continente'],['country','País'],['macroregion','Região (se houver)'],['state','Estado ou unidade federativa'],['municipality','Município (se houver)']] as const).map(([key,label]) => <label key={key}><span className="catalogue-field-label"><AppIcon name="globe" />{label}</span><input value={value.geography[key]} disabled={disabled || (value.inBrazil && (key === 'continent' || key === 'country'))} maxLength={120} onChange={(event) => update({ geography: { ...value.geography, [key]: event.target.value } })} placeholder={key === 'macroregion' ? 'Ex.: Sudeste' : key === 'state' ? 'Ex.: São Paulo' : key === 'municipality' ? 'Ex.: Campinas' : undefined} /></label>)}
      </div>
      <label><span className="catalogue-field-label"><AppIcon name="document" />Motivo da correção da hierarquia</span><input value={value.editReason} disabled={disabled} maxLength={1000} onChange={(event) => update({ editReason: event.target.value })} placeholder="Preencha ao alterar um caminho já conferido" /></label>
    </div>
    <div className="authority-place-fields__associate"><label><span className="catalogue-field-label"><AppIcon name="hierarchy" />Associar a lugar já revisado</span><input value={lookup} disabled={disabled} onChange={(event) => setLookup(event.target.value)} placeholder="Busque outra autoridade geográfica" /></label>
      {matches.some((match) => match.authority_id !== excludeAuthorityId) && <div className="authority-place-fields__matches">{matches.filter((match) => match.authority_id !== excludeAuthorityId).map((match) => <button key={match.authority_id} type="button" disabled={disabled} onClick={() => { void createClient().rpc("admin_list_subject_authority_map_points", { target_authority_id: match.authority_id }).then(({ data }) => { const point = Array.isArray(data) ? data.find((item: { place_label: string; latitude: number; longitude: number }) => item.place_label === match.place_label && item.latitude === match.latitude && item.longitude === match.longitude) : null; update({ placeLabel: editablePlace ? match.place_label : value.placeLabel, latitude: String(match.latitude), longitude: String(match.longitude), inBrazil: match.in_brazil, source: match.location_source, linkedAuthorityId: match.authority_id, geography: { ...emptyAuthorityPlace().geography, ...(match.in_brazil ? { continent: "América do Sul", country: "Brasil" } : {}), ...(point?.geography ?? {}) } }); }); setLookup(match.place_label); setMatches([]); }}><strong>{match.place_label}</strong><small>{authorityHeadingLabel(match.heading_tag)}</small></button>)}</div>}
      {value.linkedAuthorityId && <label><span className="catalogue-field-label"><AppIcon name="document" />Motivo do vínculo</span><input value={value.linkReason} disabled={disabled} minLength={10} maxLength={1000} onChange={(event) => update({ linkReason: event.target.value })} placeholder="Explique por que os registros se referem ao mesmo lugar" /></label>}
    </div>
  </div>;
}

export function authorityPlaceComplete(value: AuthorityPlaceDraft): boolean {
  return !!value.placeLabel.trim() && Number.isFinite(Number(value.latitude)) && value.latitude.trim() !== ""
    && Number.isFinite(Number(value.longitude)) && value.longitude.trim() !== ""
    && value.source.trim().length >= 5 && value.geography.continent.trim().length >= 2 && value.geography.country.trim().length >= 2
    && (!value.inBrazil || (value.geography.continent.trim() === "América do Sul" && value.geography.country.trim() === "Brasil"))
    && (!value.geography.macroregion.trim() || !!value.geography.state.trim())
    && (!value.geography.municipality.trim() || !!value.geography.state.trim())
    && (!value.linkedAuthorityId || value.linkReason.trim().length >= 10);
}

export async function saveAuthorityPlace(authorityId: string, position: number, value: AuthorityPlaceDraft, relationship: "same_place" | "associated_place") {
  if (!authorityPlaceComplete(value)) return;
  const client = createClient();
  const point = await client.rpc("admin_review_subject_authority_map_point", { target_authority_id: authorityId, part_position: position, latitude_value: Number(value.latitude), longitude_value: Number(value.longitude), in_brazil_value: value.inBrazil, location_source_value: value.source.trim(), continent_value: value.geography.continent.trim(), country_value: value.geography.country.trim(), macroregion_value: value.geography.macroregion.trim() || null, state_value: value.geography.state.trim() || null, municipality_value: value.geography.municipality.trim() || null, edit_reason: value.editReason.trim() || null });
  if (point.error) throw point.error;
  if (value.linkedAuthorityId) {
    const link = await client.rpc("admin_link_authority_place", { source_authority_id: authorityId, target_authority_id: value.linkedAuthorityId, relationship_value: relationship, edit_reason: value.linkReason.trim() });
    if (link.error) throw link.error;
  }
}
