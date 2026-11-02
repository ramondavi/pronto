"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppIcon } from "./app-icon";
import { backupPollingDelay, type BackupRun } from "@/lib/backup-control";

type StatusResponse = { runs?: BackupRun[]; checkedAt?: string; error?: string };
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function runDescription(run: BackupRun | undefined) {
  if (!run) return { label: "Sem execuções recentes", detail: "Nenhuma execução foi encontrada no histórico consultado.", state: "neutral" };
  if (run.status !== "completed") return { label: "Verificação em andamento", detail: `Iniciada em ${dateFormat.format(new Date(run.createdAt))}.`, state: "running" };
  if (run.conclusion === "success") return { label: "Última verificação concluída", detail: `Execução concluída · ${dateFormat.format(new Date(run.createdAt))}. Uma verificação pode terminar sem gerar nova cópia.`, state: "success" };
  return { label: "Última verificação requer atenção", detail: `Resultado: ${run.conclusion === "failure" ? "falha" : run.conclusion === "cancelled" ? "cancelada" : "não confirmado"} · ${dateFormat.format(new Date(run.createdAt))}.`, state: "warning" };
}

export function StaffBackupStatus() {
  const [runs, setRuns] = useState<BackupRun[] | null>(null);
  const [checkedAt, setCheckedAt] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    let controller: AbortController | null = null;
    let failures = 0;
    let activeRun = false;
    const load = async () => {
      if (stopped || document.visibilityState === "hidden" || !navigator.onLine) return;
      controller?.abort();
      const next = new AbortController();
      controller = next;
      try {
        const response = await fetch("/api/admin/backups", { cache: "no-store", signal: AbortSignal.any([next.signal, AbortSignal.timeout(12000)]) });
        const data = await response.json() as StatusResponse;
        if (!response.ok || !Array.isArray(data.runs) || !data.checkedAt) throw new Error(data.error ?? "Consulta indisponível");
        if (stopped || next.signal.aborted) return;
        activeRun = data.runs.some((run) => run.status !== "completed");
        setRuns(data.runs); setCheckedAt(data.checkedAt); setError(""); failures = 0;
      } catch {
        if (!stopped && !next.signal.aborted) { failures += 1; setError("Não foi possível atualizar o estado. Os dados exibidos podem estar desatualizados."); }
      } finally {
        const current = controller === next;
        if (current) controller = null;
        if (current && !stopped && !document.hidden && navigator.onLine) {
          timer = window.setTimeout(load, backupPollingDelay(activeRun, failures));
        }
      }
    };
    const resume = () => { window.clearTimeout(timer); if (document.visibilityState === "hidden" || !navigator.onLine) { controller?.abort(); if (!navigator.onLine) setError("Sem conexão. O estado será atualizado quando a conexão voltar."); } else void load(); };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    resume();
    return () => { stopped = true; window.clearTimeout(timer); controller?.abort(); document.removeEventListener("visibilitychange", resume); window.removeEventListener("online", resume); window.removeEventListener("offline", resume); };
  }, []);

  const latest = runs?.[0];
  const status = runDescription(latest);
  const displayStatus = runs === null && error ? { label: "Consulta indisponível", detail: "Ainda não há um resultado confirmado nesta sessão.", state: "warning" } : status;
  return <section className={`panel staff-backup-status staff-backup-status--${error ? "warning" : displayStatus.state}`} aria-labelledby="staff-backup-title">
    <div className="staff-backup-status__heading"><span className="staff-backup-status__icon"><AppIcon name="shield" /></span><div><p className="eyebrow">Produção</p><h2 id="staff-backup-title">Estado do backup</h2></div><span className="staff-backup-status__pulse" aria-hidden="true" /></div>
    <strong aria-live="polite">{runs === null && !error ? "Consultando execuções…" : displayStatus.label}</strong>
    <p>{runs === null && !error ? "Aguarde a primeira consulta." : displayStatus.detail}</p>
    {error && <p className="staff-backup-status__error" role="status">{error}</p>}
    <div className="staff-backup-status__foot"><small>{checkedAt ? `Consultado em ${dateFormat.format(new Date(checkedAt))} às ${timeFormat.format(new Date(checkedAt))}` : "Aguardando atualização"}</small><Link href="/painel/admin?area=controle&aba=backups">Ver backup e restauro <AppIcon name="arrowRight" /></Link></div>
  </section>;
}
