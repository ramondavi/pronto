"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { feedbackAgeBands, feedbackComparisons, feedbackDifficulties, feedbackDigitalAutonomy, feedbackDigitalFamiliarity, feedbackRatings, feedbackResidences } from "@/lib/feedback-questions";

type Response = { id: string; answers: Record<string, string> };
type Category = readonly (readonly [string, string])[];

export function FeedbackAdminDashboard({ activatedAt, siteUrl, invitedCount, respondedCount, invitationsCloseAt, reportReadyAt, responsesPurgedAt, aggregateReport, responses, canActivate = false, canExport = false }: { activatedAt: string | null; siteUrl: string | null; invitedCount: number; respondedCount: number; invitationsCloseAt: string | null; reportReadyAt: string | null; responsesPurgedAt: string | null; aggregateReport: Record<string, Record<string, number>> | null; responses: Response[]; canActivate?: boolean; canExport?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(siteUrl ?? "https://prontobib.vercel.app");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("feedback-admin").on("postgres_changes", { event: "INSERT", schema: "public", table: "feedback_responses" }, () => router.refresh()).subscribe();
    const timer = window.setInterval(() => router.refresh(), 60_000);
    return () => { window.clearInterval(timer); void supabase.removeChannel(channel); };
  }, [router]);

  async function activate() {
    if (activating || activatedAt) return;
    setActivating(true);
    setError("");
    const { error: activationError } = await createClient().rpc("activate_feedback_campaign", { target_site_url: url.trim() });
    setActivating(false);
    if (activationError) { setError("Não foi possível ativar a coleta. Confira o endereço público e tente novamente."); return; }
    router.refresh();
  }

  const average = (key: string) => {
    const values = responses.map((response) => Number(response.answers[key])).filter((value) => value >= 1 && value <= 5);
    if (values.length) return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1).replace(".", ",");
    const counts = aggregateReport?.[key];
    const weighted = Object.entries(counts ?? {}).reduce((sum, [value, count]) => sum + (Number(value) >= 1 && Number(value) <= 5 ? Number(value) * count : 0), 0);
    const total = Object.entries(counts ?? {}).reduce((sum, [value, count]) => sum + (Number(value) >= 1 && Number(value) <= 5 ? count : 0), 0);
    return total ? (weighted / total).toFixed(1).replace(".", ",") : "—";
  };
  const lookup = (items: Category, value?: string) => items.find(([key]) => key === value)?.[1] ?? "—";
  const distribution = (items: Category, key: string) => items.map(([value, label]) => ({ label, count: aggregateReport?.[key]?.[value] ?? responses.filter((response) => response.answers[key] === value).length })).filter(({ count }) => count > 0);
  const dateLabel = (value: string | null) => {
    if (!value || value === "infinity" || value === "-infinity") return "a definir";
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parsed) : "a definir";
  };
  const date = activatedAt ? dateLabel(activatedAt) : "";
  const reportReady = Boolean(reportReadyAt && Number.isFinite(new Date(reportReadyAt).getTime()) && Date.now() >= new Date(reportReadyAt).getTime());
  const exportReady = reportReady && respondedCount >= 5 && !responsesPurgedAt && responses.length === respondedCount;
  const invitationsClosed = Boolean(invitationsCloseAt && Number.isFinite(new Date(invitationsCloseAt).getTime()) && Date.now() >= new Date(invitationsCloseAt).getTime());
  const campaignStatus = !activatedAt ? "Pronta para ativar" : responsesPurgedAt ? respondedCount >= 5 ? "Resultados agregados" : "Coleta encerrada sem amostra mínima" : reportReady ? respondedCount >= 5 ? "Relatório disponível" : "Coleta encerrada sem amostra mínima" : invitationsClosed ? "Aguardando respostas" : "Convites em andamento";

  return <div className="feedback-admin">
    <section className="panel feedback-admin__campaign"><div><p className="eyebrow">Pesquisa de lançamento</p><h2>{campaignStatus}</h2><p>{activatedAt ? `Ativada em ${date}. Convites até ${dateLabel(invitationsCloseAt)} ou até 50 protocolos, o que ocorrer primeiro. Cada convite pode ser respondido em 30 dias.` : "Ative no dia em que o Pronto! for lançado ao público. Protocolos anteriores não entram na pesquisa."}</p></div>{!activatedAt && canActivate && <div className="feedback-admin__activate"><label>Endereço público definitivo<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></label><button className="button button--primary" type="button" disabled={activating || !url.startsWith("https://")} onClick={() => void activate()}>{activating ? "Ativando…" : "Ativar pesquisa"}</button>{error && <p className="form-error" role="alert">{error}</p>}</div>}</section>
    <div className="feedback-admin__stats"><article className="panel"><span>Convidados</span><strong>{invitedCount} <small>/ 50</small></strong></article><article className="panel"><span>Respostas</span><strong>{respondedCount}</strong></article><article className="panel"><span>Taxa de resposta</span><strong>{invitedCount ? Math.round(respondedCount / invitedCount * 100) : 0}%</strong></article><article className="panel"><span>Avaliação geral</span><strong>{average("overall")} <small>/ 5</small></strong></article></div>
    {canExport && <section className="panel feedback-admin__export"><div><p className="eyebrow">Relatório final</p><h2>Exportar resultados</h2><p>{responsesPurgedAt ? `Respostas individuais eliminadas em ${dateLabel(responsesPurgedAt)}. O panorama agregado permanece abaixo e pode ser baixado em CSV ou PDF.` : exportReady ? `Relatório disponível: ${respondedCount} respostas de ${invitedCount} convites. O PDF inclui gráficos e todos os comentários recebidos.` : `Disponível a partir de ${dateLabel(reportReadyAt)}, após o fim dos convites e dos 30 dias de resposta, com pelo menos 5 respostas. Recebidas: ${respondedCount}.`}</p></div><div className="feedback-admin__export-actions">{exportReady ? <><a className="button button--secondary" href="/api/admin/avaliacoes/exportar?formato=csv" download>Baixar CSV</a><a className="button button--primary" href="/api/admin/avaliacoes/exportar?formato=pdf" download>Baixar PDF com gráficos</a></> : responsesPurgedAt && aggregateReport ? <><a className="button button--secondary" href="/api/admin/avaliacoes/exportar?formato=csv" download>Baixar CSV agregado</a><a className="button button--primary" href="/api/admin/avaliacoes/exportar?formato=pdf" download>Baixar PDF agregado</a></> : <><button className="button button--secondary" type="button" disabled>Baixar CSV</button><button className="button button--primary" type="button" disabled>Baixar PDF com gráficos</button></>}</div></section>}
    <section className="panel feedback-admin__summary"><p className="eyebrow">Panorama das respostas</p><h2>O que os participantes estão dizendo</h2><div>{feedbackRatings.map((item) => <div key={item.key}><span>{item.question}</span><strong>{average(item.key)} / 5</strong></div>)}</div></section>
    <section className="panel feedback-admin__summary"><p className="eyebrow">Perfil geral</p><h2>Quem participou</h2><p>Dados agrupados, sem nomes ou protocolos.</p><div>{[["Faixa etária", feedbackAgeBands, "age_band"], ["Local de residência", feedbackResidences, "residence"]].map(([title, options, key]) => <div key={title as string}><span>{title as string}</span><strong>{respondedCount < 5 ? "Disponível após 5 respostas" : distribution(options as Category, key as string).map(({ label, count }) => `${label}: ${count}`).join(" · ") || "Sem respostas"}</strong></div>)}</div></section>
    <section className="panel feedback-admin__summary"><p className="eyebrow">Experiência digital</p><h2>Familiaridade com serviços online</h2><p>Resultados agrupados disponíveis após cinco respostas.</p><div>{[["Uso de serviços digitais", feedbackDigitalFamiliarity, "digital_familiarity"], ["Autonomia em etapas online", feedbackDigitalAutonomy, "digital_autonomy"]].map(([title, options, key]) => <div key={title as string}><span>{title as string}</span><strong>{respondedCount < 5 ? "Disponível após 5 respostas" : distribution(options as Category, key as string).map(({ label, count }) => `${label}: ${count}`).join(" · ") || "Sem respostas"}</strong></div>)}</div></section>
    <section className="panel feedback-admin__responses"><p className="eyebrow">Respostas anônimas</p><h2>{responses.length ? `${responses.length} avaliações` : "Ainda não há respostas"}</h2>{responses.map((response, index) => <article key={response.id}><button type="button" aria-expanded={expanded === response.id} onClick={() => setExpanded(expanded === response.id ? null : response.id)}><span><strong>Resposta {index + 1}</strong><small>Sem identificação do participante</small></span><span className="feedback-admin__responded">{response.answers.overall}/5 na avaliação geral</span></button>{expanded === response.id && <div className="feedback-admin__detail">{feedbackRatings.map((item) => <div key={item.key}><span>{item.question}</span><strong>{response.answers[item.key] === "na" ? "Não se aplica" : `${response.answers[item.key]}/5`}</strong></div>)}<div><span>Etapa de maior dificuldade</span><strong>{lookup(feedbackDifficulties, response.answers.difficulty)}</strong></div>{response.answers.prior_email && <div><span>Já solicitou por e-mail?</span><strong>{lookup([["yes", "Sim"], ["no", "Não"], ["unsure", "Não tem certeza"]], response.answers.prior_email)}</strong></div>}{response.answers.comparison && <div><span>Comparação com e-mail</span><strong>{lookup(feedbackComparisons, response.answers.comparison)}</strong></div>}{response.answers.comparison_note && <p><strong>O que ficou melhor ou pior</strong>{response.answers.comparison_note}</p>}{response.answers.improvement && <p><strong>Melhoria prioritária</strong>{response.answers.improvement}</p>}</div>}</article>)}</section>
  </div>;
}
