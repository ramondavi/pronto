"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/app-icon";
import { FinalDecisionDialog } from "@/components/final-decision-dialog";
import { useInterfaceLanguage } from "@/components/interface-language";
import { createClient } from "@/lib/supabase/client";
import { uiText } from "@/lib/ui-text";

export function RepositorySubmissionConfirmation({ requestId, submittedAt, publicationVerified = false, preview = false }: { requestId: string; submittedAt: string | null; publicationVerified?: boolean; preview?: boolean }) {
  const { language } = useInterfaceLanguage();
  const router = useRouter();
  const t = (text: string) => uiText(language, text);
  const [recordedAt, setRecordedAt] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitted = recordedAt ?? submittedAt;
  async function confirm() {
    if (busy || submitted || publicationVerified) return;
    setBusy(true); setError("");
    try {
      if (preview) setRecordedAt(new Date().toISOString());
      else {
        const { data, error } = await createClient().rpc("confirm_repository_submission", { target_request_id: requestId });
        if (error) throw error;
        setRecordedAt(String(data)); router.refresh();
      }
      setConfirming(false);
    } catch { setError("Não foi possível registrar o envio. Atualize a página para conferir a situação do protocolo antes de tentar novamente."); }
    finally { setBusy(false); }
  }
  return <section className="panel repository-guide__submission"><div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name={publicationVerified ? "check" : submitted ? "clock" : "upload"} /></span><div><p className="eyebrow">{t("Depois do envio no RI/UFBA")}</p><h2>{t(publicationVerified ? "Publicação verificada pela Biblioteca" : submitted ? "Envio informado · aguardando validação" : "Concluiu a submissão do trabalho?")}</h2><p>{t(publicationVerified ? "A Biblioteca já verificou a publicação deste trabalho." : "Depois de enviar o trabalho no RI/UFBA, confirme aqui. A submissão aguardará a validação da Biblioteca; o RI/UFBA informará o resultado pelo e-mail cadastrado no repositório.")}</p></div></div><button type="button" className="button button--primary cataloging-homologation__action" disabled={Boolean(submitted) || publicationVerified || busy} onClick={() => setConfirming(true)}><span><strong>{t(publicationVerified ? "Publicação já verificada" : submitted ? "Envio já informado" : "Confirmo que enviei o trabalho ao RI/UFBA")}</strong>{(submitted || publicationVerified) && <small>{t(publicationVerified ? "A confirmação de envio já não é necessária." : "Aguardando a validação da Biblioteca no RI/UFBA.")}</small>}</span><AppIcon name={publicationVerified ? "check" : submitted ? "clock" : "upload"} /></button>{error && <p className="form-error" role="alert">{t(error)}</p>}{confirming && <FinalDecisionDialog title={t("Você concluiu a submissão no RI/UFBA?")} description={t("Confirme somente depois de finalizar o envio no repositório. Este registro informa que você enviou o trabalho; a validação da Biblioteca ainda será realizada no RI/UFBA.")} confirmLabel={t("Sim, concluí o envio ao RI/UFBA")} busy={busy} onCancel={() => setConfirming(false)} onConfirm={() => void confirm()} />}</section>;
}
