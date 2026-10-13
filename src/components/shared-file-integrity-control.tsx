"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app-icon";
import { FinalDecisionDialog } from "@/components/final-decision-dialog";
import { createClient } from "@/lib/supabase/client";
import { showPanelChange } from "@/components/panel-change-toast";

export function SharedFileIntegrityControl({ requestId, publicWorkUrl }: { requestId: string; publicWorkUrl: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function cancelRequest() {
    setBusy(true);
    setError(false);
    const { error: rpcError } = await createClient().rpc("cancel_request_for_failed_declaration", {
      target_request_id: requestId,
      failed_declarations: ["shared_file_changed"],
      explanation: "",
    });
    if (rpcError) { setBusy(false); setConfirming(false); setError(true); return; }
    showPanelChange("Protocolo cancelado");
    router.push("/painel/fila");
    router.refresh();
  }

  return <details className="panel shared-file-integrity">
    <summary className="shared-file-integrity__summary"><AppIcon name="link" /><span><strong>Integridade do arquivo público</strong><small>Abra para conferir o trabalho e registrar eventual descumprimento.</small></span><span className="shared-file-integrity__chevron" aria-hidden="true" /></summary>
    <div className="shared-file-integrity__body"><p>Se constatar que o arquivo foi alterado, substituído ou removido antes do encerramento, registre o descumprimento da declaração. O protocolo será cancelado após sua confirmação.</p>
    <div className="shared-file-integrity__actions"><a className="button button--secondary button--small button--with-icon" href={publicWorkUrl} target="_blank" rel="noopener noreferrer"><AppIcon name="external" />Abrir trabalho</a><button className="button button--danger-soft button--small button--with-icon" type="button" onClick={() => setConfirming(true)}><AppIcon name="close" />Registrar descumprimento</button></div>
    {error && <p className="form-error" role="alert">Não foi possível cancelar o protocolo. Atualize a página e tente novamente.</p>}</div>
    {confirming && <FinalDecisionDialog title="Cancelar por alteração do arquivo?" description="Confirme somente se o arquivo do link público foi alterado, substituído ou removido. O protocolo será cancelado e o estudante receberá um aviso padronizado." confirmLabel="Confirmar cancelamento" confirmDanger busy={busy} onCancel={() => setConfirming(false)} onConfirm={cancelRequest} />}
  </details>;
}
