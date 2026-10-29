"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mapping = { heading_ind1: string; variant_ind1: string[]; relation_ind1: string[] };
type Status = { published: boolean; rights_statement: string | null; marc_mapping: Mapping | null };
type RecordInfo = { heading_type?: string; fields?: { tag: string; indicators?: string }[]; relations?: { value: string }[] };
export function SubjectAuthorityPublication({ authorityId, eligible, record }: { authorityId: string; eligible: boolean; record: RecordInfo }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [rights, setRights] = useState("");
  const [variants, setVariants] = useState<{ label: string }[]>([]);
  const headingTag = ({ topic: "150", geographic: "151", personal: "100", corporate: "110", title: "130" } as Record<string, string>)[record.heading_type ?? ""]
    ?? record.fields?.find((field) => ["100", "110", "130", "150", "151"].includes(field.tag))?.tag ?? "";
  const choices = headingTag === "100" ? ["0", "1", "3"] : headingTag === "110" ? ["0", "1", "2"] : headingTag === "130" ? ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] : [" "];
  const [mapping, setMapping] = useState<Mapping>({ heading_ind1: "", variant_ind1: [], relation_ind1: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const client = createClient();
    Promise.all([
      client.rpc("admin_subject_publication_status", { target_authority_id: authorityId }),
      client.from("subject_authority_variants").select("label").eq("authority_id", authorityId).order("label").order("id"),
    ]).then(([{ data, error: loadError }, variantResult]) => {
      if (!active) return;
      if (loadError || variantResult.error) { setError("Não foi possível consultar a publicação."); return; }
      const value = (data?.[0] ?? null) as Status | null;
      setStatus(value); setRights(value?.rights_statement ?? "");
      const loadedVariants = (variantResult.data ?? []) as { label: string }[];
      setVariants(loadedVariants);
      setMapping(value?.marc_mapping ?? {
        heading_ind1: choices.length === 1 ? " " : "",
        variant_ind1: loadedVariants.map(() => choices.length === 1 ? " " : ""),
        relation_ind1: (record.relations ?? []).map(() => choices.length === 1 ? " " : ""),
      });
    });
    return () => { active = false; };
  }, [authorityId, headingTag]);
  async function save(publish: boolean) {
    setBusy(true); setError("");
    const { error: saveError } = await createClient().rpc("admin_set_subject_publication", { target_authority_id: authorityId, publish_value: publish, rights_value: publish ? rights.trim() : null, mapping_value: publish ? mapping : null });
    setBusy(false);
    if (saveError) { setError("Não foi possível alterar a publicação. Confira a situação do assunto e as condições de redistribuição."); return; }
    setStatus({ published: publish, rights_statement: publish ? rights.trim() : null, marc_mapping: publish ? mapping : null });
  }
  function setArrayIndicator(key: "variant_ind1" | "relation_ind1", index: number, value: string) {
    setMapping((current) => ({ ...current, [key]: current[key].map((item, position) => position === index ? value : item) }));
  }
  const mappingComplete = !!headingTag && choices.includes(mapping.heading_ind1)
    && mapping.variant_ind1.length === variants.length && mapping.variant_ind1.every((value) => choices.includes(value))
    && mapping.relation_ind1.length === (record.relations?.length ?? 0) && mapping.relation_ind1.every((value) => choices.includes(value));
  const indicatorSelect = (value: string, onChange: (value: string) => void, label: string) => <label>{label}<select value={value} onChange={(event) => onChange(event.target.value)} disabled={busy || status?.published}>
    {choices.length > 1 && <option value="">Escolha o indicador</option>}
    {choices.map((choice) => <option key={choice} value={choice}>{choice === " " ? "Em branco" : choice}</option>)}
  </select></label>;
  return <section className="authority-publication"><h4>Catálogo público</h4>
    {!status && !error && <p>Conferindo publicação…</p>}
    {status && <><p>{status.published ? "Publicado para consulta e exportação." : "Não publicado."}</p>
      {status.published && <Link href={`/autoridades/${authorityId}`} target="_blank">Abrir página pública</Link>}
      <label><span>Condições de publicação e redistribuição verificadas</span><textarea value={rights} onChange={(event) => setRights(event.target.value)} minLength={10} maxLength={1000} rows={3} disabled={busy || status.published} placeholder="Registre a base para publicar e redistribuir este registro." /></label>
      {!status.published && <div className="authority-publication__mapping"><strong>Conferência dos indicadores MARC21</strong><p>Confira a forma de entrada do cabeçalho e de cada referência. O sistema não escolhe indicadores de nomes, entidades ou títulos.</p>
        {indicatorSelect(mapping.heading_ind1, (value) => setMapping((current) => ({ ...current, heading_ind1: value })), `Cabeçalho ${headingTag || "sem tipo reconhecido"}`)}
        {variants.map((variant, index) => <div key={`${variant.label}-${index}`}>{indicatorSelect(mapping.variant_ind1[index] ?? "", (value) => setArrayIndicator("variant_ind1", index, value), `Variante: ${variant.label}`)}</div>)}
        {(record.relations ?? []).map((relation, index) => <div key={`${relation.value}-${index}`}>{indicatorSelect(mapping.relation_ind1[index] ?? "", (value) => setArrayIndicator("relation_ind1", index, value), `Relação: ${relation.value}`)}</div>)}
      </div>}
      <div className="public-authorities__exports">{status.published
        ? <button type="button" className="button button--secondary button--small" disabled={busy} onClick={() => void save(false)}>Retirar da consulta pública</button>
        : <button type="button" className="button button--primary button--small" disabled={busy || !eligible || rights.trim().length < 10 || !mappingComplete} onClick={() => void save(true)}>Revisar e publicar autoridade</button>}</div>
      {!eligible && <p>Ative e valide o assunto antes de publicá-lo.</p>}
    </>}
    {error && <p role="alert" className="notice notice--error">{error}</p>}
  </section>;
}
