"use client";

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
  return <section className="panel"><h2>Acesso provisório da secretaria da RAU+E</h2><p>Conceda somente à conta institucional dedicada ao acervo retrospectivo, com e-mail já confirmado. A conta poderá abrir vários pedidos, sem Nada Consta. O encerramento do lote torna a conta inativa e preserva o histórico.</p><form onSubmit={(event) => { event.preventDefault(); void run("grant"); }}><label>Nome da pessoa responsável<input required minLength={3} value={name} onChange={(event) => setName(event.target.value)} /></label><label>E-mail institucional<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="button button--primary" disabled={busy}>Conceder acesso provisório</button></form><ul>{accounts.map((account) => { const profile = Array.isArray(account.profile) ? account.profile[0] : account.profile; return <li key={account.profile_id}><strong>{profile?.full_name}</strong> · {profile?.email} · {account.ended_at ? "Encerrado" : "Provisório"}{!account.ended_at && <button className="button button--ghost" disabled={busy} onClick={() => setEnding(account.profile_id)}>Encerrar lote e inativar conta</button>}</li>; })}</ul>{message && <p role="status">{message}</p>}{ending && <FinalDecisionDialog title="Encerrar o acesso provisório?" description="Confirme que todas as remessas terminaram. A conta ficará inativa e o histórico será preservado." confirmLabel="Encerrar lote e inativar" busy={busy} onCancel={() => setEnding(null)} onConfirm={() => run("end")} />}</section>;
}
