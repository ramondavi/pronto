"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FinalDecisionDialog } from "@/components/final-decision-dialog";
import { showPanelChange } from "@/components/panel-change-toast";

export function ProtocolClosure({ requestId, ready, initialUrl = "" }: { requestId: string; ready: boolean; initialUrl?: string }) {
  const router=useRouter(); const [url,setUrl]=useState(initialUrl); const [busy,setBusy]=useState(""); const [message,setMessage]=useState(""); const [confirmingClosure,setConfirmingClosure]=useState(false);
  async function close(){setBusy("close");setMessage("");const {error}=await createClient().rpc("close_cataloging_request",{target_request_id:requestId,permanent_url:url.trim()});if(error){setMessage("Não foi possível encerrar. Confirme o endereço HTTPS e se ficha, Nada Consta e autodepósito estão registrados.");setBusy("");setConfirmingClosure(false);return;}showPanelChange("Protocolo encerrado");setBusy("");router.refresh();}
  return <section className="panel protocol-closure"><div className="protocol-closure__heading"><p className="eyebrow">Última ação</p><h2>Confirmar publicação no RI/UFBA</h2><p>Confira o registro publicado e informe seu endereço permanente ou Handle para encerrar o protocolo.</p></div><div className="protocol-closure__form"><label>URL permanente ou Handle<input type="url" required placeholder="https://repositorio.ufba.br/handle/…" value={url} onChange={(event)=>setUrl(event.target.value)} /></label><button className="button button--primary" type="button" disabled={!ready||busy!==""||!url.startsWith("https://")} onClick={()=>setConfirmingClosure(true)}>{busy==="close"?"Encerrando…":"Encerrar protocolo"}</button></div>{!ready&&<p className="form-hint">É preciso homologar a ficha, aprovar o Nada Consta e registrar o início do autodepósito.</p>}{message&&<p className="auth-feedback" role="status">{message}</p>}{confirmingClosure&&<FinalDecisionDialog title="Encerrar este protocolo?" description="A publicação será registrada e o protocolo será concluído, iniciando as comunicações finais." confirmLabel="Confirmar encerramento" busy={busy==="close"} onCancel={()=>setConfirmingClosure(false)} onConfirm={close}/>}</section>;
}
