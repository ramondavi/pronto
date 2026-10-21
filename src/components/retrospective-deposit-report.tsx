"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RetrospectiveDepositReport({ requestId, initialUrl = "" }: { requestId: string; initialUrl?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <section className="panel"><h2>Informar publicação no RI/UFBA</h2><p>Depois de depositar este trabalho, informe o endereço permanente. A biblioteca conferirá a publicação antes de concluir o protocolo.</p><form onSubmit={async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await createClient().rpc("report_retrospective_deposit", { target_request_id: requestId, permanent_url: url.trim() });
      setMessage(error ? "Não foi possível registrar. Informe a URL permanente do trabalho no RI/UFBA e tente novamente." : "Publicação informada. Aguarde a conferência da biblioteca.");
      if (!error) router.refresh();
    } catch { setMessage("Confira sua conexão e tente novamente."); }
    finally { setBusy(false); }
  }}><label>URL permanente do trabalho<input type="url" required value={url} placeholder="https://repositorio.ufba.br/handle/…" onChange={(event) => setUrl(event.target.value)} /></label><button className="button button--primary" disabled={busy}>{busy ? "Registrando…" : "Informar publicação"}</button></form>{message && <p role="status">{message}</p>}{initialUrl && <p>Endereço informado: <a href={initialUrl} target="_blank" rel="noreferrer">{initialUrl}</a></p>}</section>;
}
