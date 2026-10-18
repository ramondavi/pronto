import Link from "next/link";
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
import { studentRequestProgress } from "@/lib/student-request-progress";
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

export default async function StudentRequestPage({ searchParams }: { searchParams: Promise<{ enviada?: string; corrigida?: string; protocolo?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const language = await getInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const { data: request } = await supabase.from("cataloging_requests").select("id, protocol, status, title, subtitle, cancellation_reason, submitted_at, updated_at, people:request_people(role,transcribed_name), academic_enrollments(registration_number, academic_programs(code,name,level,work_type,service_level_business_days,repository_deposit_enabled))").order("submitted_at", { ascending: false }).limit(1).maybeSingle();
  const params = await searchParams;
  const canStart = !request || request.status === "canceled";
  const { data: programs } = canStart ? await supabase.from("academic_programs").select("id,code,name,level,work_type").eq("active", true) : { data: [] };
  if (!request) return <main className="dashboard-main dashboard-main--narrow dashboard-main--student-request"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="request" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Minhas solicitações")}</span></span></h1></div></div><section className="panel student-draft-panel"><div className="student-draft-panel__heading"><p className="eyebrow">{t("Nova solicitação")}</p><h2>{t("Prepare seu pedido")}</h2><p>{t("Confira os dados necessários antes de iniciar o preenchimento.")}</p></div><StudentDraftSummary userId={user.id} programs={programs ?? []} emptyMessage={t("Você ainda não enviou uma solicitação. Comece seu preenchimento abaixo.")} /><StudentRequestShortcut userId={user.id} className="button button--primary" programs={programs ?? []} /></section><section className="panel student-request-history"><div className="student-request-history__heading"><AppIcon name="archive" /><div><p className="eyebrow">{t("Histórico")}</p><h2>{t("Nenhuma solicitação anterior")}</h2></div></div><p>{t("Os protocolos concluídos ou cancelados aparecerão aqui para consulta.")}</p></section></main>;
  const { data: previousRequests } = await supabase.from("cataloging_requests").select("id,protocol,status,title,subtitle,submitted_at").neq("id", request.id).order("submitted_at", { ascending: false }).limit(20);
  const enrollment = Array.isArray(request.academic_enrollments) ? request.academic_enrollments[0] : request.academic_enrollments;
  const program = enrollment && (Array.isArray(enrollment.academic_programs) ? enrollment.academic_programs[0] : enrollment.academic_programs);
  const { data: closures } = await supabase.from("library_announcements").select("type,starts_at,ends_at").eq("active", true).in("type", ["holiday", "optional_day", "recess", "strike", "closure"]);
  const { data: revisionData } = await supabase.from("request_revision_rounds").select("id, round_number, returned_at, responded_at, issues:request_field_issues(field_key, field_label, justification, original_value), corrections:request_corrections(field_key, corrected_value, submitted_at)").eq("request_id", request.id).order("round_number", { ascending: false });
  const { data: nadaConsta } = await supabase.from("nada_consta_documents").select("original_name, size_bytes, status, rejection_reason, validated_at").eq("request_id", request.id).order("uploaded_at", { ascending: false }).limit(1).maybeSingle();
  const { data: homologation } = await supabase.from("cataloging_card_homologations").select("snapshot, homologated_at, public_token").eq("request_id", request.id).maybeSingle();
  const progress = studentRequestProgress(request.status, nadaConsta?.status ?? null, Boolean(homologation), language);
  const justSubmitted = params.enviada === "1" && (!params.protocolo || params.protocolo === request.protocol) && request.status === "submitted";
  const [{data:publication},{data:timeline}]=await Promise.all([supabase.from("repository_publications").select("permanent_url,verified_at").eq("request_id",request.id).maybeSingle(),supabase.rpc("request_timeline",{target_request_id:request.id})]);
  const { data: feedbackInvitation } = request.status === "completed" ? await supabase.from("feedback_invitations").select("request_id,responded,invited_at").eq("request_id", request.id).maybeSingle() : { data: null };
  const revisions = (revisionData ?? []) as unknown as StudentRevision[];
  const correctionsPending = request.status === "changes_requested" && revisions.length > 0;
  const nadaApproved = nadaConsta?.status === "approved";
  const cardReleased = request.status === "approved" && nadaApproved && Boolean(homologation?.snapshot);
  const nadaSection = ["submitted", "in_review", "changes_requested", "approved"].includes(request.status) && <NadaConstaUpload requestId={request.id} document={nadaConsta} />;
  const nadaStage = nadaApproved && nadaSection ? <StudentCompletedStage title={t("Nada Consta")} completedLabel={t("Etapa concluída")}>{nadaSection}</StudentCompletedStage> : nadaSection;
  const revisionSection = revisions.length > 0 && <StudentRevisionGallery revisions={revisions} />;
  const revisionStage = !correctionsPending && revisions.every((revision) => Boolean(revision.responded_at)) && revisionSection ? <StudentCompletedStage title={t("Correções anteriores")} completedLabel={t("Etapa concluída")}>{revisionSection}</StudentCompletedStage> : revisionSection;
  const singleCorrection = request.status === "changes_requested" && revisions[0]?.issues.length === 1;
  const singleCorrectionResent = params.corrigida === "1" && revisions[0]?.issues.length === 1;
  return <main className="dashboard-main dashboard-main--narrow dashboard-main--student-request">
    <StudentRequestLiveRefresh active={!canStart} />
        {params.corrigida === "1" && <div className="auth-feedback auth-feedback--success" role="status">{singleCorrectionResent ? "Correção reenviada. A biblioteca conferirá o campo atualizado." : "Correções reenviadas. A biblioteca conferirá os campos atualizados."}</div>}
    <div className="page-heading student-request-heading"><div><h1><AppIcon className="panel-heading-icon" name="request" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Minhas solicitações")}</span></span></h1></div><div className="student-request-heading__actions">{!justSubmitted && <span className="request-status">{request.protocol} · {t(singleCorrection ? "Correção solicitada" : statusLabels[request.status] ?? request.status)}</span>}<RequestTimelineDialog events={(timeline ?? []) as TimelineEvent[]} /></div></div>
    {feedbackInvitation && !feedbackInvitation.responded && Date.now() < new Date(feedbackInvitation.invited_at).getTime() + 30 * 86_400_000 && <section className="feedback-invite panel"><span aria-hidden="true">✦</span><div><p className="eyebrow">{t("Convite especial")}</p><h2>{t("Ajude a melhorar o Pronto! e a BIB/FAUFBA")}</h2><p>{t("Você concluiu todas as etapas. Conte como foi sua experiência em cerca de 3 minutos. Sua avaliação não altera o resultado do protocolo.")}</p></div><Link className="button button--primary" href="/painel/avaliacao">{t("Avaliar minha experiência")}</Link></section>}
    {request.status === "completed" && <section className="panel student-new-enrollment"><span className="student-new-enrollment__icon" aria-hidden="true"><AppIcon name="book" /></span><div><p className="eyebrow">{t("Novo vínculo acadêmico")}</p><h2>{t("Ingressou em outro curso ou grau?")}</h2><p>{t("Você pode usar esta mesma conta para pedir outra ficha com a matrícula do novo vínculo. A matrícula do protocolo concluído não pode ser reutilizada.")}</p></div><Link className="button button--primary button--with-icon" href="/painel/solicitacao/nova"><AppIcon name="document" />{t("Solicitar com nova matrícula")}</Link></section>}
    <section className={`panel student-progress-panel${progress.needsAction ? " student-progress-panel--action" : ""}${justSubmitted ? " student-progress-panel--submitted" : ""}`} aria-label={t(justSubmitted ? "Protocolo enviado" : "Situação atual do protocolo")} aria-live="polite"><div>{justSubmitted && <span className="student-progress-panel__icon" aria-hidden="true"><AppIcon name="check" /></span>}<div className="student-progress-panel__content"><p className="eyebrow">{justSubmitted ? t("Solicitação enviada") : `${t("Situação atual")} · ${request.protocol}`}</p><h2>{justSubmitted ? t("Protocolo enviado com sucesso") : singleCorrection ? t("Correção solicitada") : progress.title}</h2><p>{singleCorrection ? t("A biblioteca solicitou a correção de um campo para continuar a análise.") : request.status === "canceled" ? t("Veja abaixo o motivo do cancelamento e os dados deste protocolo.") : progress.description}</p>{justSubmitted && <ProtocolCopyButton protocol={request.protocol} badge />}</div></div>{progress.needsAction && <Link className="button button--primary" href={progress.actionHref}>{singleCorrection ? t("Corrigir campo pendente") : progress.actionLabel}</Link>}</section>
    {request.status === "canceled" && <CanceledRequestNotice title={formatWorkTitle(request.title, request.subtitle)} program={program?.name ?? "—"} registration={enrollment?.registration_number ?? "—"} submittedAt={request.submitted_at} reasons={request.cancellation_reason?.split("; ").filter(Boolean) ?? []} labels={{ status: t("Protocolo cancelado"), reason: t("Motivo do cancelamento"), missingReason: t("O motivo não está disponível neste registro. Entre em contato com a biblioteca para esclarecimentos."), details: t("Dados do protocolo cancelado"), program: t("Curso ou programa"), registration: t("Matrícula deste vínculo"), submitted: t("Enviada"), closed: t("Este protocolo não pode ser reaberto.") }} />}
    {request.status === "canceled" && <section className="panel student-draft-panel"><div className="student-draft-panel__heading"><p className="eyebrow">{t("Nova solicitação")}</p><h2>{t("Prepare outro pedido")}</h2><p>{t("O protocolo cancelado não pode ser reaberto. Você pode iniciar uma nova solicitação.")}</p></div><StudentDraftSummary userId={user.id} programs={programs ?? []} /><StudentRequestShortcut userId={user.id} className="button button--primary" programs={programs ?? []} /></section>}
    {["submitted", "in_review", "changes_requested", "approved"].includes(request.status) ? <header className={`analysis-case-header student-delivery-case-header${request.status === "approved" ? "" : " student-delivery-case-header--pending"}`} aria-labelledby="student-request-summary-title">
      <div className="analysis-case-header__top"><span className="queue-item__protocol analysis-case-header__protocol"><AppIcon name="document" /><ProtocolCopyButton protocol={request.protocol} showLabel={false} /></span><span className={`progress-badge progress-badge--done queue-status-color queue-status-color--${request.status === "approved" && nadaConsta?.status === "approved" ? "approved" : request.status}`}><AppIcon name={request.status === "approved" && nadaConsta?.status === "approved" ? "check" : "review"} />{t(request.status === "approved" ? nadaConsta?.status === "approved" ? "Ficha liberada" : "Ficha homologada" : statusLabels[request.status] ?? request.status)}</span></div>
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
        <li className={nadaConsta?.status === "approved" ? "is-current queue-status-color--approved" : "is-future"}><span className="queue-item__timeline-dot" aria-hidden="true" /><span>{t("Nada Consta validado")}</span>{nadaConsta?.validated_at ? <RelativeDateTime value={nadaConsta.validated_at} /> : <small>{t(nadaConsta?.status === "pending" ? "Em conferência" : nadaConsta?.status === "rejected" ? "Reenvio necessário" : "Aguardando envio")}</small>}</li>
      </ol>
      {request.status !== "approved" && <p className="student-delivery-case-header__sla"><AppIcon name="calendar" />{t("Prazo de referência")}: <RequestSlaEstimate submittedAt={request.submitted_at} businessDays={program?.service_level_business_days ?? null} closures={closures} status={request.status} /></p>}
    </header> : null}
    {cardReleased && homologation?.snapshot && <BrowserPdfDelivery snapshot={homologation.snapshot as unknown as CatalogingCardSnapshot} publicToken={homologation.public_token} />}
    {cardReleased && program?.repository_deposit_enabled && <BrowserPdfDeliveryFollowup repositoryDepositEnabled />}
    {request.status !== "completed" && correctionsPending && revisionStage}
    {request.status !== "completed" && nadaStage}
    {request.status !== "completed" && !correctionsPending && revisionStage}
    {publication && <StudentPublicationRecord url={publication.permanent_url} label={t} />}
    <section className="panel student-request-history" aria-labelledby="student-request-history-title"><div className="student-request-history__heading"><AppIcon name="archive" /><div><p className="eyebrow">{t("Histórico")}</p><h2 id="student-request-history-title">{t("Solicitações anteriores")}</h2></div></div>{request.status === "completed" && <article className="student-request-history__completed"><div className="student-request-history__completed-title"><AppIcon name="check" /><div><strong>{formatWorkTitle(request.title, request.subtitle)}</strong><span>{request.protocol} · {t("Concluída")}</span></div></div><dl><div><dt>{t("Curso ou programa")}</dt><dd>{program?.name ?? "—"}</dd></div><div><dt>{t("Matrícula deste vínculo")}</dt><dd>{enrollment?.registration_number ?? "—"}</dd></div><div><dt>{t("Enviada")}</dt><dd><RelativeDateTime value={request.submitted_at} /></dd></div><div><dt>{t("Concluída")}</dt><dd><RelativeDateTime value={request.updated_at} /></dd></div></dl></article>}{previousRequests?.length ? <ul>{(previousRequests as PreviousRequest[]).map((previous) => <li key={previous.id}><div><strong>{previous.protocol}</strong><span>{formatWorkTitle(previous.title, previous.subtitle)}</span></div><div><span className="student-request-history__status">{t(statusLabels[previous.status] ?? previous.status)}</span><RelativeDateTime value={previous.submitted_at} /></div></li>)}</ul> : request.status !== "completed" && <p>{t("Você ainda não tem solicitações anteriores.")}</p>}</section>
  </main>;
}
