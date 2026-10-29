"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AppIcon } from "./app-icon";
type Foundation = { rationale:string; references_data:{kind:string;request_id:string|null;citation:string|null;url:string|null;location:string|null;evidence:string}[] };
export function AuthorityFoundationDetails({authorityId}:{authorityId:string}) {
 const [loaded,setLoaded]=useState(false);const [busy,setBusy]=useState(false);const [foundation,setFoundation]=useState<Foundation|null>(null);const [error,setError]=useState("");
 async function load() {if(busy)return;setBusy(true);setError("");try {const result=await createClient().from("subject_authority_foundations").select("rationale,references_data").eq("authority_id",authorityId).maybeSingle();if(result.error)throw result.error;setFoundation(result.data as Foundation|null);setLoaded(true);}catch{setError("Não foi possível consultar a fundamentação interna. Tente novamente.");}finally{setBusy(false);}}
 return <section className="manual-authority__parts"><h4><AppIcon name="document" />Fundamentação interna</h4>{!loaded && <button type="button" className="button button--secondary button--small" disabled={busy} onClick={()=>void load()}>{busy?"Consultando…":"Consultar justificativa e referências"}</button>}{error && <p className="notice notice--error" role="alert">{error}</p>}{loaded && !foundation && <p className="notice">A fundamentação é restrita a quem criou o registro e a quem gerencia assuntos.</p>}{foundation && <><p>{foundation.rationale}</p><ol>{foundation.references_data.map((reference,index)=><li key={index}><strong>{reference.kind === "request" ? "Trabalho no Pronto!" : "Referência bibliográfica"}</strong>{reference.citation && <p>{reference.citation}</p>}{reference.location && <p>Localização: {reference.location}</p>}<p>{reference.evidence}</p>{reference.url && <p>{reference.url}</p>}{reference.request_id && <Link href={`/painel/atendimento/${reference.request_id}`}>Abrir atendimento <AppIcon name="arrowRight" /></Link>}</li>)}</ol></>}</section>;
}
