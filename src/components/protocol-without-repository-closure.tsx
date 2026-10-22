"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FinalDecisionDialog } from "@/components/final-decision-dialog";

export function ProtocolWithoutRepositoryClosure({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function complete() {
    setBusy(true); setError("");
    try {
      const { error } = await createClient().rpc("complete_request_without_repository", { target_request_id: requestId });
      if (error) setError("Não foi possível concluir. Confira a homologação, o Nada Consta, a situação do guia e sua responsabilidade pelo atendimento.");
      else router.refresh();
    } catch { setError("Confira sua conexão e tente novamente."); }
    finally { setBusy(false); setConfirming(false); }
  }
  return <section className="panel protocol-next-action"><h2>Concluir atendimento da ficha</h2><p>O guia deste programa está desativado. A ficha homologada continuará disponível ao aluno. A conclusão registrará essa condição para permitir um lembrete futuro, após a habilitação do guia.</p><button type="button" className="button button--primary" onClick={() => setConfirming(true)} disabled={busy}>Concluir ficha sem depósito no RI</button>{error && <p role="alert">{error}</p>}{confirming && <FinalDecisionDialog title="Concluir este atendimento sem depósito?" description="Confirme a conclusão da ficha homologada e do Nada Consta aprovado. O protocolo ficará concluído, com registro de que o guia do RI estava desativado. A publicação não será presumida." confirmLabel="Confirmar conclusão" busy={busy} onCancel={() => setConfirming(false)} onConfirm={complete} />}</section>;
}
