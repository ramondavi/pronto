"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { showPanelChange } from "@/components/panel-change-toast";

type StaffCandidate = { user_id: string; email: string };

export function AdminProvisioningAlert({ candidates }: { candidates: StaffCandidate[] }) {
  const [selectedId, setSelectedId] = useState(candidates[0]?.user_id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = candidates.find((candidate) => candidate.user_id === selectedId);
  const supabase = createClient();

  async function provision(formData: FormData) {
    setBusy(true);
    setMessage("");
    const { error } = await supabase.rpc("provision_staff_account", {
      target_user_id: selectedId,
      staff_full_name: String(formData.get("full_name") ?? ""),
      staff_professional_name: String(formData.get("full_name") ?? ""),
      staff_crb: String(formData.get("crb") ?? ""),
      staff_role: String(formData.get("role") ?? ""),
    });
    setMessage(error ? "Não foi possível provisionar a conta. Confira os dados e tente novamente." : "Conta provisionada. Atualize a página para conferir a lista pendente.");
    if (!error) showPanelChange("Conta provisionada");
    setBusy(false);
  }

  if (!candidates.length) return null;
  return <section className="panel provisioning-alert">
    <div>
      <p className="eyebrow">Ação necessária</p>
      <h2>{candidates.length === 1 ? "1 conta aguarda provisionamento" : `${candidates.length} contas aguardam provisionamento`}</h2>
      <p>Há contas institucionais confirmadas no Supabase que ainda não têm perfil no Pronto!.</p>
    </div>
    <form className="admin-grid" action={provision}>
      <label>Conta confirmada<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} required>{candidates.map((candidate) => <option key={candidate.user_id} value={candidate.user_id}>{candidate.email}</option>)}</select></label>
      <p className="provisioning-alert__summary"><strong>Resumo da conta</strong><span>{selected?.email}</span><small>E-mail institucional confirmado; nenhum perfil associado.</small></p>
      <label>Nome completo<input name="full_name" required /></label>
      <label>CRB<input name="crb" required /></label>
      <label>Perfil<select name="role" defaultValue="cataloger"><option value="cataloger">Catalogador</option><option value="administrator">Administrador</option></select></label>
      <button className="button button--primary button--small" type="submit" disabled={busy}>{busy ? "Provisionando…" : "Provisionar conta"}</button>
    </form>
    {message && <p className="auth-feedback" role="status">{message}</p>}
  </section>;
}
