"use client";

import { AppIcon } from "@/components/app-icon";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FinalDecisionDialog } from "@/components/final-decision-dialog";

export type RetrospectiveAccount = { profile_id: string; ended_at: string | null; profile: { full_name: string; email: string } | { full_name: string; email: string }[] | null };

export function RetrospectiveAccessAdmin({ accounts }: { accounts: RetrospectiveAccount[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ending, setEnding] = useState<string | null>(null);
  async function run(action: "grant" | "end") {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const { data, error } = action === "grant"
        ? await supabase.rpc("grant_retrospective_access", { target_email: email.trim(), display_name: name.trim() })
        : await supabase.rpc("end_retrospective_access", { target_profile_id: ending });
      if (error) setMessage(action === "end" ? "Não foi possível encerrar. Conclua ou cancele todos os protocolos do lote; ao menos um deve estar concluído." : "Não foi possível conceder. Use uma conta institucional confirmada, ativa e dedicada, sem solicitações anteriores.");
      else {
        const targetId = action === "grant" ? data : ending;
        const { data: saved, error: checkError } = await supabase.from("retrospective_accounts").select("profile_id,ended_at").eq("profile_id", targetId).single();
        const { data: account, error: profileError } = await supabase.from("profiles").select("status").eq("id", targetId).single();
        const confirmed = saved && account && !checkError && !profileError && (action === "grant" ? !saved.ended_at && account.status === "active" : Boolean(saved.ended_at) && account.status === "inactive");
        setMessage(confirmed ? action === "end" ? "Lote encerrado. A conta ficou inativa." : "Acesso provisório concedido." : "A operação foi recebida, mas não foi possível conferir o estado salvo. Atualize a página antes de tentar novamente.");
        router.refresh();
      }
    } catch { setMessage("Confira sua conexão e tente novamente."); }
    finally { setBusy(false); setEnding(null); }
  }
  return <section className="panel retrospective-access-admin retrospective-context"><div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="archive" /></span><div><p className="eyebrow">Acervo retrospectivo</p><h2>Acesso provisório da secretaria da RAU+E</h2><p>Use uma conta institucional confirmada. A secretaria poderá enviar vários trabalhos sem Nada Consta; a autoria será informada em cada protocolo.</p></div></div><form className="form-stack" onSubmit={(event) => { event.preventDefault(); void run("grant"); }}><div className="form-row"><label>Responsável pelo envio<input required minLength={3} value={name} onChange={(event) => setName(event.target.value)} /></label><label>E-mail institucional<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label></div><div className="retrospective-actions"><button className="button button--primary button--with-icon" disabled={busy}><AppIcon name="account" />Conceder acesso provisório</button></div></form><ul>{accounts.map((account) => { const profile = Array.isArray(account.profile) ? account.profile[0] : account.profile; return <li key={account.profile_id}><div><strong>{profile?.full_name}</strong><span>{profile?.email}</span><span className="field-help">{account.ended_at ? "Acesso encerrado · histórico preservado" : "Acesso provisório ativo"}</span></div>{!account.ended_at && <button className="button button--secondary button--small button--with-icon" disabled={busy} onClick={() => setEnding(account.profile_id)}><AppIcon name="lock" />Encerrar acesso</button>}</li>; })}</ul><p className="field-help">A Biblioteca encerra o acesso após concluir todas as remessas. A conta ficará inativa, com pedidos e fichas preservados.</p>{message && <p className="auth-feedback" role="status">{message}</p>}{ending && <FinalDecisionDialog title="Encerrar o acesso provisório?" description="Confirme que todas as remessas terminaram, sem pedidos em andamento e com ao menos um trabalho publicado e conferido. A conta ficará inativa; pedidos, fichas e histórico serão preservados." confirmLabel="Encerrar acesso" busy={busy} onCancel={() => setEnding(null)} onConfirm={() => run("end")} />}</section>;
}
