"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { authorityHeadingTag } from "@/lib/authority-heading-types";
import { AppIcon } from "./app-icon";
import { AuthorityPlaceFields, authorityPlaceComplete, emptyAuthorityPlace, saveAuthorityPlace, type AuthorityPlaceDraft } from "./authority-place-fields";

type RecordInfo = { heading_type?: string; associated_place?: string; fields?: { tag: string; subfields?: { code: string; value: string }[] }[]; components?: { kind: string; value: string }[] };
type Point = { component_position: number; place_label: string; latitude: number; longitude: number; in_brazil: boolean; location_source: string; geography?: Partial<AuthorityPlaceDraft["geography"]> };
type Candidate = { position: number; value: string; relationship: "same_place" | "associated_place" };

export function SubjectAuthorityMapPoints({ authorityId, record }: { authorityId: string; record: RecordInfo }) {
  const tag = authorityHeadingTag(record);
  const corporatePlace = record.associated_place?.trim() || record.fields?.find((field) => field.tag === "370")?.subfields?.find((part) => part.code === "e")?.value.trim() || "";
  const [associatedPlace, setAssociatedPlace] = useState(corporatePlace);
  const candidates: Candidate[] = (record.components ?? []).flatMap((part, position) =>
    (position === 0 && (tag === "151" || tag === "181")) || (position > 0 && ["z", "geographic", "Subdivisão geográfica"].includes(part.kind))
      ? [{ position, value: part.value, relationship: "same_place" as const }] : []);
  if (tag === "110") candidates.unshift({ position: -1, value: associatedPlace, relationship: "associated_place" });
  const [points, setPoints] = useState<Point[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<AuthorityPlaceDraft>(emptyAuthorityPlace());
  const [placeReason, setPlaceReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { setAssociatedPlace(corporatePlace); }, [corporatePlace, authorityId]);

  useEffect(() => {
    if (!candidates.length) return;
    let live = true;
    void createClient().rpc("admin_list_subject_authority_map_points", { target_authority_id: authorityId }).then(({ data }) => {
      if (live && Array.isArray(data)) setPoints(data as Point[]);
    });
    return () => { live = false; };
  }, [authorityId, tag, record.components?.length]);

  function edit(candidate: Candidate) {
    const point = points.find((item) => item.component_position === candidate.position);
    setEditing(candidate.position);
    setDraft({ ...emptyAuthorityPlace(candidate.value || point?.place_label || ""), latitude: point ? String(point.latitude) : "", longitude: point ? String(point.longitude) : "", inBrazil: point?.in_brazil ?? false, source: point?.location_source ?? "", geography: { ...emptyAuthorityPlace().geography, ...(point?.in_brazil ? { continent: "América do Sul", country: "Brasil" } : {}), ...(point?.geography ?? {}) } });
    setPlaceReason(""); setMessage("");
  }

  async function refresh() {
    const { data } = await createClient().rpc("admin_list_subject_authority_map_points", { target_authority_id: authorityId });
    if (Array.isArray(data)) setPoints(data as Point[]);
  }

  async function save(candidate: Candidate, remove = false) {
    setBusy(true); setMessage("");
    try {
      if (remove) {
        const { error } = await createClient().rpc("admin_set_subject_authority_map_point", { target_authority_id: authorityId, part_position: candidate.position, remove_value: true });
        if (error) throw error;
      } else {
        if (candidate.position === -1 && draft.placeLabel.trim() !== candidate.value) {
          const { error } = await createClient().rpc("admin_set_authority_associated_place", { target_authority_id: authorityId, place_value: draft.placeLabel.trim(), edit_reason: placeReason.trim() });
          if (error) throw error;
        }
        await saveAuthorityPlace(authorityId, candidate.position, draft, candidate.relationship);
      }
      await refresh(); if (candidate.position === -1 && !remove) setAssociatedPlace(draft.placeLabel.trim());
      setEditing(null); setMessage(remove ? "Ponto retirado do mapa." : "Localização revisada e salva.");
    } catch { setMessage("Não foi possível salvar. Confira o lugar, as coordenadas, a fonte e o motivo da alteração."); }
    setBusy(false);
  }

  if (!candidates.length) return <section className="authority-map-review authority-map-review--empty"><h4><AppIcon name="globe" />Localização no mapa público</h4><p>Este registro não contém lugar nem subdivisão geográfica para marcar no mapa.</p></section>;
  return <section className="authority-map-review"><h4><AppIcon name="globe" />Localização no mapa público</h4><p>Confira as coordenadas e a fonte de cada lugar. Instituições podem ser associadas a um lugar sem se tornarem autoridades geográficas. O mapa só mostra autoridades publicadas vinculadas a trabalhos elegíveis.</p>
    <ul>{candidates.map((candidate) => { const point = points.find((item) => item.component_position === candidate.position); return <li key={candidate.position}>
      <div className="authority-map-review__row"><div><strong>{candidate.value || "Lugar da instituição"}</strong><small>{point ? `${point.latitude}, ${point.longitude} · ${[point.geography?.continent, point.geography?.country, point.geography?.macroregion, point.geography?.state, point.geography?.municipality].filter(Boolean).join(" › ") || "Hierarquia pendente de revisão"}` : "Sem localização revisada"}</small></div><button type="button" className="button button--secondary button--small" onClick={() => edit(candidate)}><AppIcon name={point ? "edit" : "globe"} />{point ? "Revisar ponto" : "Adicionar ponto"}</button></div>
      {editing === candidate.position && <div className="authority-map-review__form"><AuthorityPlaceFields value={draft} onChange={setDraft} disabled={busy} editablePlace={candidate.position === -1} excludeAuthorityId={authorityId} />
        {candidate.position === -1 && draft.placeLabel.trim() !== candidate.value && <label><span className="catalogue-field-label"><AppIcon name="document" />Motivo da alteração do lugar</span><textarea value={placeReason} minLength={10} maxLength={1000} onChange={(event) => setPlaceReason(event.target.value)} /></label>}
        <div className="authority-map-review__actions"><button type="button" className="button button--primary button--small" disabled={busy || !authorityPlaceComplete(draft) || (candidate.position === -1 && draft.placeLabel.trim() !== candidate.value && placeReason.trim().length < 10)} onClick={() => void save(candidate)}><AppIcon name="check" />{busy ? "Salvando…" : "Salvar localização"}</button><button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => setEditing(null)}>Cancelar</button>{point && <button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => void save(candidate, true)}>Retirar do mapa</button>}</div>
      </div>}
    </li>; })}</ul>{message && <p role="status" className="authority-map-review__message">{message}</p>}
  </section>;
}
