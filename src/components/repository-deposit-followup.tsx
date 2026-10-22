"use client";

import Link from "next/link";
import { AppIcon } from "@/components/app-icon";
import { ProtocolCopyButton } from "@/components/protocol-copy-button";
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

export function RepositoryDepositFollowup({ data, programs, programId, search, page, canSend, canConfirmHistory, canRecordPublication }: {
  data: DepositFollowupData; programs: { id: string; name: string }[]; programId: string; search: string; page: number; canSend: boolean; canConfirmHistory: boolean; canRecordPublication: boolean;
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
    <div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="upload" /></span><div><p className="eyebrow">Acompanhamento do RI/UFBA</p><h2>Trabalhos concluídos sem publicação</h2><p>Localize os trabalhos, confira as pendências e convide os estudantes a fazer o depósito. O protocolo da ficha permanece concluído.</p></div></div>
    <div className="admin-section__stats" aria-label="Resumo dos depósitos"><div className="admin-section__stat"><span className="admin-section__stat-icon"><AppIcon name="document" /></span><div><strong>{data.total}</strong><span>Trabalhos neste filtro</span></div></div><div className="admin-section__stat"><span className="admin-section__stat-icon"><AppIcon name="message" /></span><div><strong>{data.sendable}</strong><span>Lembretes disponíveis</span></div></div></div>
    <details className="retrospective-workflow"><summary><AppIcon name="help" />Como funciona o acompanhamento</summary><ol><li><strong>Confira a situação histórica.</strong> Para registros antigos, confirme que o guia estava desativado na conclusão somente após consultar as evidências.</li><li><strong>Habilite o guia do programa.</strong> O lembrete fica disponível depois da habilitação e da confirmação histórica.</li><li><strong>Acompanhe a publicação.</strong> Envie o convite e registre a URL permanente após conferir o trabalho no RI/UFBA.</li></ol></details>
    <form className="deposit-followup__filters" method="get" action="/painel/admin"><input type="hidden" name="area" value="controle" /><input type="hidden" name="aba" value="deposits" /><label>Programa<select name="programa" defaultValue={programId}><option value="">Todos os programas</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><label>Buscar trabalho ou estudante<input name="busca" placeholder="Nome, e-mail, título ou protocolo" defaultValue={search} maxLength={150} /></label><button className="button button--secondary button--with-icon"><AppIcon name="search" />Filtrar</button></form>
    {canSend && <div className="deposit-followup__selection"><label className="check"><input type="checkbox" checked={all} disabled={busy || !data.sendable} onChange={(event) => { setAll(event.target.checked); setSelection(new Set()); }} />Selecionar todos os disponíveis ({data.sendable})</label><button type="button" className="button button--primary button--with-icon" disabled={busy || !count} onClick={() => setDecision({ kind: "send", ids: selectedIds, all, count })}><AppIcon name="message" />Enviar lembretes ({count})</button></div>}
    {message && <p className="auth-feedback" role="status">{message}</p>}
    {!data.rows.length && <div className="history-empty"><AppIcon name="upload" /><div><h3>Nenhum trabalho encontrado</h3><p>Altere os filtros para consultar outros programas ou estudantes.</p></div></div>}
    <ul className="deposit-followup__list">{data.rows.map((row) => {
      const historyUnknown = row.repository_guide_enabled_at_completion === null;
      const waitingGuide = !row.repository_deposit_enabled;
      const delivered = row.email_status === "delivered";
      const queued = ["pending", "processing"].includes(row.email_status ?? "");
      const status = historyUnknown ? "Confirmar histórico" : waitingGuide ? "Guia desativado" : delivered ? "Lembrete entregue" : queued ? "Na fila de envio" : row.email_status === "failed" ? "Falha na entrega" : row.can_send ? "Pronto para lembrete" : "Envio indisponível";
      return <li key={row.request_id} className="deposit-followup__row">
        <div className="deposit-followup__identity"><span className="queue-item__protocol"><AppIcon name="document" /><ProtocolCopyButton protocol={row.protocol} showLabel={false} /></span><span className={`progress-badge progress-badge--${delivered ? "done" : queued ? "active" : row.can_send ? "ready" : "waiting"}`}><AppIcon name={delivered ? "check" : queued ? "inbox" : "review"} />{status}</span></div>
        <div className="deposit-followup__heading">{canSend && row.can_send && <input type="checkbox" aria-label={`Selecionar ${row.student_name}, ${row.protocol}`} checked={all || selection.has(row.request_id)} disabled={busy} onChange={(event) => select(row.request_id, event.target.checked)} />}<h3>{row.title}</h3></div>
        <dl className="deposit-followup__details"><div><dt><AppIcon name="person" />Estudante</dt><dd>{row.student_name}</dd></div><div><dt><AppIcon name="message" />E-mail</dt><dd>{row.student_email}</dd></div><div><dt><AppIcon name="book" />Programa</dt><dd>{row.program_name}</dd></div><div><dt><AppIcon name="calendar" />Último lembrete entregue</dt><dd>{row.delivered_at ? new Date(row.delivered_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Ainda não entregue"}</dd></div></dl>
        {(historyUnknown || waitingGuide) && <p className="field-help">{historyUnknown ? "A Biblioteca precisa confirmar a configuração do guia na época da conclusão." : "O envio será liberado depois que o guia deste programa for habilitado."}</p>}
        <div className="deposit-followup__actions"><Link className="button button--secondary button--small button--with-icon" href={`/painel/atendimento/${row.request_id}`}><AppIcon name="search" />Ver protocolo</Link>{canConfirmHistory && historyUnknown && <button className="button button--secondary button--small button--with-icon" disabled={busy} onClick={() => setDecision({ kind: "history", id: row.request_id })}><AppIcon name="review" />Confirmar histórico</button>}{canSend && row.can_send && <button className="button button--primary button--small button--with-icon" disabled={busy} onClick={() => setDecision({ kind: "send", ids: [row.request_id], all: false, count: 1 })}><AppIcon name="message" />{row.email_status === "failed" ? "Tentar novamente" : "Enviar lembrete"}</button>}</div>
        {canRecordPublication && row.repository_guide_enabled_at_completion === false && row.repository_deposit_enabled && <details className="deposit-followup__publication"><summary>Registrar publicação conferida no RI/UFBA</summary><form className="form-stack" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); setDecision({ kind: "publication", id: row.request_id, url: String(values.get("url") ?? "").trim() }); }}><label>URL permanente do trabalho<input name="url" required type="url" placeholder="https://repositorio.ufba.br/handle/…" /></label><button className="button button--secondary button--with-icon" disabled={busy}><AppIcon name="check" />Confirmar publicação</button></form></details>}
      </li>;
    })}</ul>
    <nav className="queue-pagination" aria-label="Páginas dos depósitos pendentes">{page > 0 && <Link className="button button--secondary button--small" href={pageHref(page - 1)}>Anterior</Link>}<span>Página {page + 1}</span>{(page + 1) * 100 < data.total && <Link className="button button--secondary button--small" href={pageHref(page + 1)}>Próxima</Link>}</nav>
    {decision && <FinalDecisionDialog title={decision.kind === "send" ? `Agendar ${decision.count} ${decision.count === 1 ? "lembrete" : "lembretes"}?` : decision.kind === "history" ? "O guia estava desativado na conclusão?" : "Confirmar publicação no RI/UFBA?"} description={decision.kind === "send" ? "Os alunos selecionados receberão um e-mail com acesso ao guia do RI na própria conta. O envio ocorre pela fila institucional, em lotes, sem reabrir os atendimentos." : decision.kind === "history" ? "Confirme somente se você verificou que o guia deste programa estava desativado quando o atendimento foi concluído. A declaração ficará registrada em auditoria." : `Confirme que você conferiu este endereço e que ele corresponde ao trabalho: ${decision.url}`} confirmLabel={decision.kind === "send" ? "Agendar envio" : "Confirmar registro"} busy={busy} onCancel={() => setDecision(null)} onConfirm={confirm} />}
  </>;
}
