"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FinalDecisionDialog } from "@/components/final-decision-dialog";
import { enqueueDepositReminders } from "@/app/painel/admin/deposit-actions";

export type DepositFollowupRow = {
  request_id: string; protocol: string; title: string; student_name: string; student_email: string;
  program_id: string; program_name: string; repository_deposit_enabled: boolean;
  repository_guide_enabled_at_completion: boolean | null; completed_at: string | null;
  queued_at: string | null; delivered_at: string | null; email_status: string | null; can_send: boolean;
};
export type DepositFollowupData = { rows: DepositFollowupRow[]; total: number; sendable: number };
type Decision = { kind: "send"; ids: string[]; all: boolean; count: number } | { kind: "history"; id: string } | { kind: "publication"; id: string; url: string };

export function RepositoryDepositFollowup({ data, programs, programId, search, page, canManage }: {
  data: DepositFollowupData; programs: { id: string; name: string }[]; programId: string; search: string; page: number; canManage: boolean;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [all, setAll] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedIds = data.rows.filter((row) => row.can_send && selection.has(row.request_id)).map((row) => row.request_id);
  const count = all ? data.sendable : selectedIds.length;
  const pageHref = (target: number) => `/painel/admin?${new URLSearchParams({ area: "controle", aba: "deposits", programa: programId, busca: search, pagina: String(target) })}`;
  function select(id: string, checked: boolean) {
    setAll(false);
    setSelection((current) => { const next = new Set(current); if (checked) next.add(id); else next.delete(id); return next; });
  }
  async function confirm() {
    if (!decision || busy) return;
    setBusy(true); setMessage("");
    let queued = 0;
    try {
      if (decision.kind === "send") {
        let remaining = decision.count;
        for (let batch = 0; batch < Math.ceil(decision.count / 100) + 1 && remaining > 0; batch++) {
          const result = await enqueueDepositReminders({ ids: decision.ids, all: decision.all, programId, search });
          if (result.error) throw new Error(result.error);
          queued += result.queued;
          remaining = result.remaining;
          if (!decision.all || result.queued === 0) break;
        }
        setMessage(`${queued} ${queued === 1 ? "lembrete incluído" : "lembretes incluídos"} na fila de envio.${remaining ? " Alguns pedidos não puderam ser agendados agora; atualize a lista para conferir." : ""}`);
        setSelection(new Set()); setAll(false);
      } else {
        const args = decision.kind === "history" ? { target_request_id: decision.id } : { target_request_id: decision.id, permanent_url: decision.url };
        const { error } = await createClient().rpc(decision.kind === "history" ? "confirm_repository_guide_history" : "record_completed_repository_publication", args);
        if (error) throw new Error(decision.kind === "history" ? "Não foi possível confirmar o histórico. Atualize a lista." : "Não foi possível registrar. Confira a URL permanente do RI/UFBA e a habilitação do guia.");
        setMessage(decision.kind === "history" ? "Condição histórica confirmada e registrada em auditoria." : "Publicação registrada. O trabalho saiu da relação de depósitos pendentes.");
      }
    } catch (error) { setMessage(`${queued ? `${queued} lembretes já foram incluídos na fila. ` : ""}${error instanceof Error ? error.message : "Confira sua conexão e tente novamente."}`); }
    finally { setBusy(false); setDecision(null); router.refresh(); }
  }
  return <>
    <section className="panel"><h2>Trabalhos concluídos sem depósito</h2><p>Esta relação reúne atendimentos concluídos sem publicação registrada no RI/UFBA, quando o guia estava desativado. Registros antigos sem evidência precisam de confirmação histórica da biblioteca.</p><p>O envio só fica disponível após habilitar o guia do programa. O atendimento permanece concluído; o estudante acessa os metadados homologados na mesma conta.</p>
      <form className="form-stack" method="get" action="/painel/admin"><input type="hidden" name="area" value="controle" /><input type="hidden" name="aba" value="deposits" /><label>Programa<select name="programa" defaultValue={programId}><option value="">Todos os programas</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Aluno, e-mail, título ou protocolo<input name="busca" defaultValue={search} maxLength={150} /></label><button className="button button--secondary">Filtrar</button></form>
    </section>
    <section className="panel deposit-followup" aria-label="Relação de depósitos pendentes"><h2>{data.total} {data.total === 1 ? "trabalho na relação" : "trabalhos na relação"}</h2><p>{data.sendable} {data.sendable === 1 ? "lembrete disponível para envio" : "lembretes disponíveis para envio"}.</p>
      {canManage && <div className="deposit-followup__selection"><label className="check"><input type="checkbox" checked={all} disabled={busy || !data.sendable} onChange={(event) => { setAll(event.target.checked); setSelection(new Set()); }} />Selecionar todos os elegíveis deste filtro ({data.sendable})</label><button type="button" className="button button--primary" disabled={busy || !count} onClick={() => setDecision({ kind: "send", ids: selectedIds, all, count })}>Enviar lembretes ({count})</button></div>}
      {message && <p className="auth-feedback" role="status">{message}</p>}
      {!data.rows.length && <p>Nenhum trabalho encontrado neste filtro.</p>}
      <ul className="deposit-followup__list">{data.rows.map((row) => <li key={row.request_id} className="deposit-followup__row">
        <div className="deposit-followup__heading">{canManage && row.can_send && <input type="checkbox" aria-label={`Selecionar ${row.student_name}, ${row.protocol}`} checked={all || selection.has(row.request_id)} disabled={busy} onChange={(event) => select(row.request_id, event.target.checked)} />}<div><Link href={`/painel/atendimento/${row.request_id}`}><strong>{row.protocol}</strong> · {row.title}</Link><p>{row.student_name} · {row.student_email}</p><p>{row.program_name}</p></div></div>
        <p>{row.repository_guide_enabled_at_completion === null ? "Condição histórica a confirmar" : !row.repository_deposit_enabled ? "Aguardando habilitação do guia do programa" : row.email_status === "delivered" ? "Lembrete entregue" : ["pending", "processing"].includes(row.email_status ?? "") ? "Lembrete na fila de envio" : row.email_status === "failed" ? "Falha de entrega; disponível para nova tentativa" : row.can_send ? "Disponível para envio" : "Envio indisponível para esta conta"}{row.delivered_at && ` em ${new Date(row.delivered_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}</p>
        {canManage && <div className="deposit-followup__actions">
          {row.repository_guide_enabled_at_completion === null && <button className="button button--secondary" disabled={busy} onClick={() => setDecision({ kind: "history", id: row.request_id })}>Confirmar condição histórica</button>}
          {row.can_send && <button className="button button--secondary" disabled={busy} onClick={() => setDecision({ kind: "send", ids: [row.request_id], all: false, count: 1 })}>{row.email_status === "failed" ? "Tentar envio novamente" : "Enviar lembrete ao aluno"}</button>}
          {row.repository_guide_enabled_at_completion === false && row.repository_deposit_enabled && <details><summary>Registrar publicação já conferida</summary><form className="form-stack" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); setDecision({ kind: "publication", id: row.request_id, url: String(values.get("url") ?? "").trim() }); }}><label>URL permanente do RI/UFBA<input name="url" required type="url" placeholder="https://repositorio.ufba.br/handle/…" /></label><button className="button button--secondary" disabled={busy}>Registrar publicação</button></form></details>}
        </div>}
      </li>)}</ul>
      <nav className="deposit-followup__pagination" aria-label="Páginas dos depósitos pendentes">{page > 0 && <Link href={pageHref(page - 1)}>← Anterior</Link>}<span>Página {page + 1}</span>{(page + 1) * 100 < data.total && <Link href={pageHref(page + 1)}>Próxima →</Link>}</nav>
    </section>
    {decision && <FinalDecisionDialog title={decision.kind === "send" ? `Agendar ${decision.count} ${decision.count === 1 ? "lembrete" : "lembretes"}?` : decision.kind === "history" ? "O guia estava desativado na conclusão?" : "Confirmar publicação no RI/UFBA?"} description={decision.kind === "send" ? "Os alunos selecionados receberão um e-mail com acesso ao guia do RI na própria conta. O envio ocorre pela fila institucional, em lotes, sem reabrir os atendimentos." : decision.kind === "history" ? "Confirme somente se você verificou que o guia deste programa estava desativado quando o atendimento foi concluído. A declaração ficará registrada em auditoria." : `Confirme que você conferiu este endereço e que ele corresponde ao trabalho: ${decision.url}`} confirmLabel={decision.kind === "send" ? "Agendar envio" : "Confirmar registro"} busy={busy} onCancel={() => setDecision(null)} onConfirm={confirm} />}
  </>;
}
