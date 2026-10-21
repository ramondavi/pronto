import { hasRetrospectiveAccess } from "@/lib/retrospective-access";
import { RetrospectiveDepositReport } from "@/components/retrospective-deposit-report";
import Link from "next/link";
import { StudentFeedbackInvite } from "@/components/student-feedback-invite";
import { redirect } from "next/navigation";
import { StudentRequestShortcut } from "@/components/student-request-shortcut";
import { StudentDraftSummary } from "@/components/student-request-form";
import { NadaConstaUpload } from "@/components/nada-consta-upload";
import { BrowserPdfDelivery, BrowserPdfDeliveryFollowup } from "@/components/browser-pdf-delivery";
import type { CatalogingCardSnapshot } from "@/domain/cataloging-card/types";
import { RequestTimelineDialog, type TimelineEvent } from "@/components/request-timeline";
import { RelativeDateTime } from "@/components/relative-date-time";
import { createClient } from "@/lib/supabase/server";
import { RequestSlaEstimate } from "@/components/request-sla-estimate";
import { AppIcon } from "@/components/app-icon";
import { formatWorkTitle } from "@/lib/work-title";
import { panelMetadata } from "@/lib/panel-metadata";
import { studentHelpAllowedForProgram, studentOverviewHelpSlug, studentRequestProgress } from "@/lib/student-request-progress";
import { getPublishedKnowledge } from "@/lib/knowledge-service";
import { StudentRequestStatus } from "@/components/student-request-status";
import { StudentRequestHistoryEmpty } from "@/components/student-request-history-empty";
import { StudentRequestLiveRefresh } from "@/components/student-request-live-refresh";
import { ProtocolCopyButton } from "@/components/protocol-copy-button";
import { monographDisplayName, programDisplayName } from "@/domain/staff-queue/program-labels";
import { StudentRevisionGallery, type StudentRevision } from "@/components/student-revision-gallery";
import { StudentCompletedStage } from "@/components/student-completed-stage";
import { StudentPublicationRecord } from "@/components/student-publication-record";
import { CanceledRequestNotice } from "@/components/canceled-request-notice";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";

export async function generateMetadata() { return panelMetadata("/painel/solicitacao"); }

const statusLabels: Record<string, string> = { submitted: "Solicitação enviada", in_review: "Em análise", changes_requested: "Correções solicitadas", approved: "Ficha homologada", completed: "Concluída", canceled: "Cancelada" };
type PreviousRequest = { id: string; protocol: string; status: string; title: string; subtitle: string | null; submitted_at: string };

export default async function StudentRequestPage({ searchParams }: { searchParams: Promise<{ enviada?: string; corrigida?: string; protocolo?: string; pedido?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const language = await getInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const params = await searchParams;
  const retrospective = await hasRetrospectiveAccess();
  if (retrospective && !params.pedido) redirect("/painel/retrospectivas");
  let query = supabase.from("cataloging_requests").select("id, retrospective, protocol, status, title, subtitle, cancellation_reason, submitted_at, updated_at, people:request_people(role,transcribed_name), academic_enrollments(registration_number, academic_programs(code,name,level,work_type,service_level_business_days,repository_deposit_enabled))");
  if (params.pedido) query = query.eq("id", params.pedido);
  const { data: request } = await query.order("submitted_at", { ascending: false }).limit(1).maybeSingle();
  if (retrospective && !request) redirect("/painel/retrospectivas");
  const canStart = !request || request.status === "canceled";
  const { data: programs } = canStart ? await supabase.from("academic_programs").select("id,code,name,level,work_type").eq("active", true) : { data: [] };
  if (!request) return <main className="dashboard-main dashboard-main--narrow dashboard-main--student-request"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="request" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Minhas solicitações")}</span></span></h1></div></div><section className="panel student-draft-panel"><div className="student-draft-panel__heading"><p className="eyebrow">{t("Nova solicitação")}</p><h2>{t("Prepare seu pedido")}</h2><p>{t("Confira os dados necessários antes de iniciar o preenchimento.")}</p></div><StudentDraftSummary userId={user.id} programs={programs ?? []} emptyMessage={t("Você ainda não enviou uma solicitação. Comece seu preenchimento abaixo.")} /><StudentRequestShortcut userId={user.id} className="button button--primary" programs={programs ?? []} /></section><StudentRequestHistoryEmpty title={t("Nenhuma solicitação anterior")} description={t("Os protocolos concluídos ou cancelados aparecerão aqui para consulta.")} /></main>;
  const { data: previousRequests } = await supabase.from("cataloging_requests").select("id,protocol,status,title,subtitle,submitted_at").neq("id", request.id).order("submitted_at", { ascending: false }).limit(20);
  const enrollment = Array.isArray(request.academic_enrollments) ? request.academic_enrollments[0] : request.academic_enrollments;
  const program = enrollment && (Array.isArray(enrollment.academic_programs) ? enrollment.academic_programs[0] : enrollment.academic_programs);
  const { data: closures } = await supabase.from("library_announcements").select("type,starts_at,ends_at").eq("active", true).in("type", ["holiday", "optional_day", "recess", "strike", "closure"]);
  const { data: revisionData } = await supabase.from("request_revision_rounds").select("id, round_number, returned_at, responded_at, issues:request_field_issues(field_key, field_label, justification, original_value), corrections:request_corrections(field_key, corrected_value, submitted_at)").eq("request_id", request.id).order("round_number", { ascending: false });
  const { data: nadaConsta } = await supabase.from("nada_consta_documents").select("original_name, size_bytes, status, rejection_reason, validated_at").eq("request_id", request.id).order("uploaded_at", { ascending: false }).limit(1).maybeSingle();
  const { data: homologation } = await supabase.from("cataloging_card_homologations").select("snapshot, homologated_at, public_token").eq("request_id", request.id).maybeSingle();
  const baseProgress = studentRequestProgress(request.status, request.retrospective ? "approved" : nadaConsta?.status ?? null, Boolean(homologation), language, program?.repository_deposit_enabled === true);
  const helpSlug = studentOverviewHelpSlug(request.status, nadaConsta?.status ?? null, Boolean(homologation), program?.repository_deposit_enabled === true);
  const helpCandidate = helpSlug ? (await getPublishedKnowledge()).find((entry) => entry.kind === "article" && entry.slug === helpSlug) : null;
  const helpArticle = studentHelpAllowedForProgram(helpCandidate, program?.repository_deposit_enabled === true) ? helpCandidate : null;
  const justSubmitted = params.enviada === "1" && (!params.protocolo || params.protocolo === request.protocol) && request.status === "submitted";
  const [{data:publication},{data:timeline}]=await Promise.all([supabase.from("repository_publications").select("permanent_url,verified_at").eq("request_id",request.id).maybeSingle(),supabase.rpc("request_timeline",{target_request_id:request.id})]);
  const revisions = (revisionData ?? []) as unknown as StudentRevision[];
  const correctionsPending = request.status === "changes_requested" && revisions.length > 0;
  const progress = request.retrospective ? { ...baseProgress, description: request.status === "approved" ? "Ficha homologada. Baixe a ficha, deposite o trabalho e informe a URL do RI/UFBA para conferência da biblioteca." : request.status === "submitted" || request.status === "in_review" ? "Aguarde a análise e a homologação da ficha pela biblioteca. Nada Consta dispensado." : baseProgress.description, actionHref: `${baseProgress.actionHref}${baseProgress.actionHref.includes("?") ? "&" : "?"}pedido=${request.id}` } : baseProgress;
  const { data: depositReport } = request.retrospective ? await supabase.from("retrospective_deposit_reports").select("permanent_url").eq("request_id", request.id).maybeSingle() : { data: null };
  const nadaApproved = request.retrospective || nadaConsta?.status === "approved";
  const cardReleased = request.status === "approved" && nadaApproved && Boolean(homologation?.snapshot);
  const nadaSection = !request.retrospective && ["submitted", "in_review", "changes_requested", "approved"].includes(request.status) && <NadaConstaUpload requestId={request.id} document={nadaConsta} />;
  const nadaStage = nadaApproved && nadaSection ? <StudentCompletedStage title={t("Nada Consta")} completedLabel={t("Etapa concluída")}>{nadaSection}</StudentCompletedStage> : nadaSection;
  const revisionSection = revisions.length > 0 && <StudentRevisionGallery revisions={revisions} />;
  const revisionStage = !correctionsPending && revisions.every((revision) => Boolean(revision.responded_at)) && revisionSection ? <StudentCompletedStage title={t("Correções anteriores")} completedLabel={t("Etapa concluída")}>{revisionSection}</StudentCompletedStage> : revisionSection;
  const singleCorrection = request.status === "changes_requested" && revisions[0]?.issues.length === 1;
  const singleCorrectionResent = params.corrigida === "1" && revisions[0]?.issues.length === 1;
  return <main className="dashboard-main dashboard-main--narrow dashboard-main--student-request">
    <StudentRequestLiveRefresh active={!canStart} />
    {retrospective && <section className="panel"><Link href="/painel/retrospectivas">← Todos os trabalhos do lote</Link><p>Solicitação retrospectiva da RAU+E · Nada Consta dispensado.</p><Link href="/painel/solicitacao/nova">Nova solicitação retrospectiva</Link></section>}
    {retrospective && request.status === "approved" && homologation && <RetrospectiveDepositReport requestId={request.id} initialUrl={depositReport?.permanent_url ?? ""} />}
        {params.corrigida === "1" && <div className="auth-feedback auth-feedback--success" role="status">{singleCorrectionResent ? "Correção reenviada. A biblioteca conferirá o campo atualizado." : "Correções reenviadas. A biblioteca conferirá os campos atualizados."}</div>}
    <div className="page-heading student-request-heading"><div><h1><AppIcon className="panel-heading-icon" name="request" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Minhas solicitações")}</span></span></h1></div><div className="student-request-heading__actions">{!justSubmitted && <span className="request-status"><ProtocolCopyButton protocol={request.protocol} /></span>}<RequestTimelineDialog events={(timeline ?? []) as TimelineEvent[]} /></div></div>
    <StudentFeedbackInvite request />
    {!retrospective && request.status === "completed" && <section className="panel student-new-enrollment"><span className="student-new-enrollment__icon" aria-hidden="true"><AppIcon name="book" /></span><div><p className="eyebrow">{t("Novo vínculo acadêmico")}</p><h2>{t("Ingressou em outro curso ou grau?")}</h2><p>{t("Você pode usar esta mesma conta para pedir outra ficha com a matrícula do novo vínculo. A matrícula do protocolo concluído não pode ser reutilizada.")}</p></div><Link className="button button--primary button--with-icon" href="/painel/solicitacao/nova"><AppIcon name="document" />{t("Solicitar com nova matrícula")}</Link></section>}
    <StudentRequestStatus label={t(justSubmitted ? "Protocolo enviado" : "Situação atual do protocolo")} eyebrow={t("Situação atual")} title={justSubmitted ? t("Protocolo enviado com sucesso") : singleCorrection ? t("Correção solicitada") : progress.title} description={singleCorrection ? t("A biblioteca solicitou a correção de um campo para continuar a análise.") : request.status === "canceled" ? t("Veja abaixo o motivo do cancelamento e os dados deste protocolo.") : progress.description} icon={justSubmitted ? "check" : request.status === "changes_requested" ? "edit" : request.status === "canceled" ? "archive" : request.status === "approved" ? "document" : nadaConsta?.status === "pending" ? "inbox" : "upload"} needsAction={progress.needsAction} submitted={justSubmitted} action={progress.needsAction ? { href: progress.actionHref, label: singleCorrection ? t("Corrigir campo pendente") : progress.actionLabel } : undefined} help={helpArticle?.slug ? { slug: helpArticle.slug, title: helpArticle.title } : null}>{justSubmitted && <ProtocolCopyButton protocol={request.protocol} badge />}</StudentRequestStatus>
    {request.status === "canceled" && <CanceledRequestNotice title={formatWorkTitle(request.title, request.subtitle)} program={program?.name ?? "—"} registration={enrollment?.registration_number ?? "—"} submittedAt={request.submitted_at} reasons={request.cancellation_reason?.split("; ").filter(Boolean) ?? []} labels={{ reason: t("Motivo do cancelamento"), missingReason: t("O motivo não está disponível neste registro. Entre em contato com a biblioteca para esclarecimentos."), details: t("Dados do protocolo cancelado"), program: t("Curso ou programa"), registration: t("Matrícula deste vínculo"), submitted: t("Enviada"), closed: t("Este protocolo não pode ser reaberto.") }} />}
    {request.status === "canceled" && <section className="panel student-draft-panel"><div className="student-draft-panel__heading"><p className="eyebrow">{t("Nova solicitação")}</p><h2>{t("Prepare outro pedido")}</h2><p>{t("Se precisar de outra ficha, comece um novo pedido para este vínculo.")}</p></div><StudentDraftSummary userId={user.id} programs={programs ?? []} /><StudentRequestShortcut userId={user.id} className="button button--primary" programs={programs ?? []} /></section>}
    {["submitted", "in_review", "changes_requested", "approved"].includes(request.status) ? <header className={`analysis-case-header student-delivery-case-header${request.status === "approved" ? "" : " student-delivery-case-header--pending"}`} aria-labelledby="student-request-summary-title">
      <div className="analysis-case-header__top"><p className="eyebrow"><AppIcon name="document" />{t("Dados da solicitação")}</p></div>
      <div className="analysis-case-header__title"><h2 id="student-request-summary-title">{formatWorkTitle(request.title, request.subtitle)}</h2></div>
      <dl className="analysis-case-header__details">
        <div><dt><AppIcon name="book" />{t("Programa")}</dt><dd title={program?.name}>{t(programDisplayName(program))}</dd></div>
        <div><dt><AppIcon name="document" />{t("Tipo de monografia")}</dt><dd>{t(monographDisplayName(program))}</dd></div>
        <div><dt><AppIcon name="person" />{t("Autoria")}</dt><dd>{request.people?.filter((person) => person.role === "author").map((person) => person.transcribed_name).join("; ") || t("Não informada")}</dd></div>
        <div><dt><AppIcon name="person" />{t("Orientador")}</dt><dd>{request.people?.find((person) => person.role === "advisor")?.transcribed_name ?? t("Não informado")}</dd></div>
      </dl>
      <ol className="queue-item__timeline student-delivery-timeline" aria-label={t("Marcos da solicitação")}>
        <li className="is-complete"><span className="queue-item__timeline-dot" aria-hidden="true" /><span>{t("Solicitação enviada")}</span><RelativeDateTime value={request.submitted_at} /></li>
        <li className={homologation ? "is-complete" : "is-future"}><span className="queue-item__timeline-dot" aria-hidden="true" /><span>{t("Ficha homologada")}</span>{homologation?.homologated_at ? <RelativeDateTime value={homologation.homologated_at} /> : <small>{t("Aguardando análise")}</small>}</li>
        <li className={nadaApproved ? "is-current queue-status-color--approved" : "is-future"}><span className="queue-item__timeline-dot" aria-hidden="true" /><span>{request.retrospective ? "Nada Consta dispensado" : t("Nada Consta validado")}</span>{nadaConsta?.validated_at ? <RelativeDateTime value={nadaConsta.validated_at} /> : <small>{t(request.retrospective ? "Acervo retrospectivo da RAU+E" : nadaConsta?.status === "pending" ? "Em conferência" : nadaConsta?.status === "rejected" ? "Reenvio necessário" : "Aguardando envio")}</small>}</li>
      </ol>
      {request.status !== "approved" && <p className="student-delivery-case-header__sla"><AppIcon name="calendar" />{t("Prazo de referência")}: <RequestSlaEstimate submittedAt={request.submitted_at} businessDays={program?.service_level_business_days ?? null} closures={closures} status={request.status} /></p>}
    </header> : null}
    {cardReleased && homologation?.snapshot && <BrowserPdfDelivery snapshot={homologation.snapshot as unknown as CatalogingCardSnapshot} publicToken={homologation.public_token} />}
    {cardReleased && program?.repository_deposit_enabled && <BrowserPdfDeliveryFollowup repositoryDepositEnabled href={request.retrospective ? `/painel/autodeposito?pedido=${request.id}` : undefined} />}
    {request.status !== "completed" && correctionsPending && revisionStage}
    {request.status !== "completed" && nadaStage}
    {request.status !== "completed" && !correctionsPending && revisionStage}
    {publication && <StudentPublicationRecord url={publication.permanent_url} label={t} />}
    {request.status !== "completed" && !previousRequests?.length ? <StudentRequestHistoryEmpty title={t("Nenhuma solicitação anterior")} description={t("Os protocolos concluídos ou cancelados aparecerão aqui para consulta.")} /> : <section className="panel student-request-history" aria-labelledby="student-request-history-title"><div className="student-request-history__heading"><AppIcon name="archive" /><div><p className="eyebrow">{t("Histórico")}</p><h2 id="student-request-history-title">{t("Solicitações anteriores")}</h2></div></div>{request.status === "completed" && <article className="student-request-history__completed"><div className="student-request-history__completed-title"><AppIcon name="check" /><div><strong>{formatWorkTitle(request.title, request.subtitle)}</strong></div></div><dl><div><dt>{t("Curso ou programa")}</dt><dd>{program?.name ?? "—"}</dd></div><div><dt>{t("Matrícula deste vínculo")}</dt><dd>{enrollment?.registration_number ?? "—"}</dd></div><div><dt>{t("Enviada")}</dt><dd><RelativeDateTime value={request.submitted_at} /></dd></div><div><dt>{t("Concluída")}</dt><dd><RelativeDateTime value={request.updated_at} /></dd></div></dl></article>}{previousRequests?.length ? <ul>{(previousRequests as PreviousRequest[]).map((previous) => <li key={previous.id}><div><Link href={`/painel/solicitacao?pedido=${previous.id}`}><strong>{previous.protocol}</strong></Link><span>{formatWorkTitle(previous.title, previous.subtitle)}</span></div><div><span className="student-request-history__status">{t(statusLabels[previous.status] ?? previous.status)}</span><RelativeDateTime value={previous.submitted_at} /></div></li>)}</ul> : null}</section>}
  </main>;
}
