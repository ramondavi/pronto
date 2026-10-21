"use client";

import { useState } from "react";
import { AppIcon } from "@/components/app-icon";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RetrospectiveDepositReport({ requestId, initialUrl = "" }: { requestId: string; initialUrl?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <section className="panel retrospective-deposit-report retrospective-context"><div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="upload" /></span><div><p className="eyebrow">Publicação no RI/UFBA</p><h2>Informe o endereço do trabalho</h2><p>Após concluir o depósito, copie a URL permanente da página pública. A Biblioteca conferirá o trabalho antes de encerrar este protocolo.</p></div></div><form className="form-stack" onSubmit={async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await createClient().rpc("report_retrospective_deposit", { target_request_id: requestId, permanent_url: url.trim() });
      setMessage(error ? "Não foi possível registrar. Informe a URL permanente do trabalho no RI/UFBA e tente novamente." : "Endereço enviado. Aguarde a conferência da Biblioteca para a conclusão deste protocolo.");
      if (!error) router.refresh();
    } catch { setMessage("Confira sua conexão e tente novamente."); }
    finally { setBusy(false); }
  }}><label>URL permanente deste trabalho no RI/UFBA<input type="url" required value={url} placeholder="https://repositorio.ufba.br/handle/…" onChange={(event) => setUrl(event.target.value)} /></label><button className="button button--primary button--with-icon" disabled={busy}><AppIcon name="check" />{busy ? "Registrando…" : initialUrl ? "Atualizar endereço informado" : "Enviar endereço à Biblioteca"}</button></form>{message && <p className="auth-feedback" role="status">{message}</p>}{initialUrl && <p>Último endereço enviado à Biblioteca: <a href={initialUrl} target="_blank" rel="noreferrer">{initialUrl}</a></p>}</section>;
}
