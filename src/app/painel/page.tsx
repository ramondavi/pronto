import { panelMetadata } from "@/lib/panel-metadata";
export async function generateMetadata() { return panelMetadata("/painel"); }
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { FeedbackSparkles } from "@/components/feedback-sparkles";
import { redirect } from "next/navigation";
import { AdminProvisioningAlert } from "@/components/admin-provisioning-alert";
import { StudentRequestShortcut } from "@/components/student-request-shortcut";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { StudentDraftSummary } from "@/components/student-request-form";
import { StaffActivityFeed, type StaffActivityEvent } from "@/components/staff-activity-feed";
import { StaffAnnouncementsCalendar } from "@/components/staff-announcements-calendar";
import { formatWorkTitle } from "@/lib/work-title";
import { studentRequestProgress } from "@/lib/student-request-progress";
import { StudentRequestLiveRefresh } from "@/components/student-request-live-refresh";
import { formatLibraryHour, formatServiceDate, isCurrentServiceAnnouncement, isLibraryClosedNow, isLibraryClosureAnnouncement, libraryClosingTime, serviceDayKey } from "@/lib/service-announcements";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";
import { monographDisplayName, programDisplayName } from "@/domain/staff-queue/program-labels";
import { RelativeDateTime } from "@/components/relative-date-time";
import { ServiceStatusBanner } from "@/components/service-status-banner";
import { userHasPermission } from "@/lib/staff-permissions";
import { StaffGlobalSearch } from "@/components/staff-global-search";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("full_name, role").eq("id", user.id).single() : { data: null };
  if (!profile || !user) redirect("/entrar");
  if (profile.role === "cataloger" || profile.role === "administrator") {
    const allowed = await userHasPermission(supabase, "staff.overview.view", profile.role);
    if (!allowed) redirect("/painel/conta");
    return <StaffOverview role={profile.role} userId={user.id} firstName={profile.full_name.trim().split(/\s+/)[0] || "Olá"} />;
  }
  const { data: activeRequest } = await supabase.from("cataloging_requests").select("id, protocol, status, title, subtitle, submitted_at, academic_enrollments(academic_programs(code,name,work_type))").order("submitted_at", { ascending: false }).limit(1).maybeSingle();
  const activeEnrollment = activeRequest && (Array.isArray(activeRequest.academic_enrollments) ? activeRequest.academic_enrollments[0] : activeRequest.academic_enrollments);
  const activeProgram = activeEnrollment && (Array.isArray(activeEnrollment.academic_programs) ? activeEnrollment.academic_programs[0] : activeEnrollment.academic_programs);
  const [{ data: nadaConsta }, { data: homologation }] = activeRequest ? await Promise.all([
    supabase.from("nada_consta_documents").select("status").eq("request_id", activeRequest.id).order("uploaded_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("cataloging_card_homologations").select("request_id").eq("request_id", activeRequest.id).maybeSingle(),
  ]) : [{ data: null }, { data: null }];
  const language = await getInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const progress = activeRequest ? studentRequestProgress(activeRequest.status, nadaConsta?.status ?? null, Boolean(homologation), language) : null;
  const actionVisual: AppIconName = !activeRequest ? "document" : activeRequest.status === "changes_requested" ? "edit" : !nadaConsta || nadaConsta.status === "rejected" ? "upload" : nadaConsta.status === "pending" ? "inbox" : activeRequest.status === "approved" && homologation ? "document" : "book";
  const { data: programs } = activeRequest ? { data: [] } : await supabase.from("academic_programs").select("id,code,name,level,work_type").eq("active", true);
  const { data: feedbackInvitations } = await supabase.from("feedback_invitations").select("responded,invited_at");
  const hasPendingFeedback = (feedbackInvitations ?? []).some((invitation) => !invitation.responded && Date.now() < new Date(invitation.invited_at).getTime() + 30 * 86_400_000);
  const { data: announcements } = await supabase.from("library_announcements").select("id,title,message,type,starts_at,ends_at").eq("active", true).order("starts_at", { ascending: false }).limit(100);
  const now = new Date().toISOString();
  const { data: dailyHours } = await supabase.from("library_daily_hours").select("closing_time").eq("service_date", serviceDayKey(now)).maybeSingle();
  const closingTime = libraryClosingTime(dailyHours?.closing_time);
  const currentAnnouncement = announcements?.find((item) => item.type !== "normal" && item.starts_at <= now && (!item.ends_at || item.ends_at >= now) && isCurrentServiceAnnouncement(item, now));
  const closureAnnouncement = announcements?.find((item) => item.type !== "normal" && item.starts_at <= now && isCurrentServiceAnnouncement(item, now) && isLibraryClosureAnnouncement(item));
  const closed = isLibraryClosedNow(now, closingTime) || Boolean(closureAnnouncement);
  const serviceStatus = closed ? uiText(language, "Biblioteca fechada agora") : currentAnnouncement ? `${uiText(language, "Prazos impactados:")} ${currentAnnouncement.title}` : uiText(language, "Atendimento normal agora");
  const closedMessage = uiText(language, "Você pode solicitar a ficha mesmo com a biblioteca fechada. O prazo é contado em dias úteis.");
  return (
    <main className="dashboard-main dashboard-main--student-overview">
      <StudentRequestLiveRefresh active />
      <div className="page-heading">
        <div><h1><AppIcon className="panel-heading-icon" name="home" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Visão geral")}</span></span></h1></div>
      </div>

      {hasPendingFeedback && <section className="feedback-invite panel"><FeedbackSparkles /><div><p className="eyebrow">{t("Sua opinião faz diferença")}</p><h2>{t("Como foi sua experiência com o Pronto!?")}</h2><p>{t("Sua avaliação leva cerca de 3 minutos e ajuda a melhorar o sistema e o atendimento da BIB/FAUFBA.")}</p></div><Link className="button button--primary" href="/painel/avaliacao">{t("Responder avaliação")}</Link></section>}

      <section className={`dashboard-grid${activeRequest ? " dashboard-grid--active-request" : ""}`}>
        <article className="next-action">
          <div className="next-action__content">
            {activeRequest?.status === "completed" && <div className="next-action__new-request"><p className="eyebrow"><AppIcon name="book" />{t("Novo vínculo acadêmico")}</p><h2>{t("Ingressou em outro curso ou grau?")}</h2><p>{t("Você pode usar esta mesma conta para pedir outra ficha com a matrícula do novo vínculo. A matrícula do protocolo concluído não pode ser reutilizada.")}</p><Link className="button button--primary button--with-icon" href="/painel/solicitacao/nova"><AppIcon name="document" />{t("Solicitar com nova matrícula")}</Link></div>}
            {activeRequest?.status === "completed" ? <div className="next-action__completed-record">
              <p className="eyebrow"><AppIcon name="check" />{t("Protocolo concluído")}</p>
              <strong>{formatWorkTitle(activeRequest.title, activeRequest.subtitle)}</strong>
              <span>{activeRequest.protocol} · {t(programDisplayName(activeProgram))}</span>
              <Link href="/painel/solicitacao">{t("Ver protocolo")}</Link>
            </div> : <>
            {activeRequest && <header className="analysis-case-header next-action__request-header" aria-label={t("Dados da solicitação")}><div className="analysis-case-header__top"><span className="queue-item__protocol analysis-case-header__protocol"><AppIcon name="document" />{activeRequest.protocol}</span><span className="next-action__submitted"><AppIcon name="calendar" />{t("Enviada")} <RelativeDateTime value={activeRequest.submitted_at} /></span></div><div className="analysis-case-header__title"><strong>{formatWorkTitle(activeRequest.title, activeRequest.subtitle)}</strong></div><dl className="analysis-case-header__details"><div><dt><AppIcon name="book" />{t("Programa")}</dt><dd title={activeProgram?.name}>{t(programDisplayName(activeProgram))}</dd></div><div><dt><AppIcon name="document" />{t("Tipo de monografia")}</dt><dd>{t(monographDisplayName(activeProgram))}</dd></div></dl></header>}
            <p className="eyebrow next-action__eyebrow"><AppIcon name={actionVisual} />{t("Sua próxima ação")}</p>
            <h2>{activeRequest ? progress?.title : t("Sua solicitação")}</h2>
            {!activeRequest && <p>{t("Tenha em mãos a matrícula atual, a versão final já aprovada e um link público para o trabalho completo.")}</p>}
            {progress && <p className={`student-progress-message${progress.needsAction ? " student-progress-message--action" : ""}`} role="status">{progress.description}</p>}
            {!activeRequest && <StudentDraftSummary userId={user.id} programs={programs ?? []} />}
            {activeRequest && progress ? <Link className="button button--primary button--with-icon" href={progress.actionHref}><AppIcon name="request" />{progress.actionLabel}</Link> : <StudentRequestShortcut userId={user.id} className="button button--primary" programs={programs ?? []} />}
            {!activeRequest && <p className="next-action__draft-note"><AppIcon name="document" /><span>{t("O rascunho é salvo automaticamente neste dispositivo para você continuar depois.")}</span></p>}
            </>}
          </div>
        </article>
        <aside className="dashboard-side">
          <section className="panel panel--institutional calendar-panel" aria-label={t("Avisos e prazos")}>
            <strong className="panel-heading-with-icon"><AppIcon name="calendar" />{t("Avisos e prazos")}</strong>
            <ServiceStatusBanner className="calendar-panel__status" title={serviceStatus} date={{ value: serviceDayKey(now), label: formatServiceDate(now, language) }} reason={closureAnnouncement?.title} message={closed ? closedMessage : currentAnnouncement?.message} closingLabel={uiText(language, "Fechamento previsto hoje às {time}", { time: formatLibraryHour(closingTime) })} closed={closed} />
            <div className="calendar-panel__deadline"><span><strong>{t("Prazo de referência")}</strong><small>{t("Para análise da solicitação após o envio")}</small></span><strong>3 <span>{t("dias úteis")}</span></strong></div>
            <StaffAnnouncementsCalendar announcements={announcements ?? []} />
          </section>
        </aside>
      </section>

    </main>
  );
}

async function StaffOverview({ role, userId, firstName }: { role: "cataloger" | "administrator"; userId: string; firstName: string }) {
  const supabase = await createClient();
  const canProvisionAccounts = await userHasPermission(supabase, "admin.accounts.provision", role);
  const [{ data: requests }, { data: announcements }, { data: candidates }, { count: activeStaffCount }, activityFeed, { data: priorityRows }] = await Promise.all([
    supabase.from("cataloging_requests").select("status,assigned_to"),
    supabase.from("library_announcements").select("id,title,message,type,starts_at,ends_at").eq("active", true).order("starts_at", { ascending: false }).limit(100),
    canProvisionAccounts ? supabase.rpc("list_confirmed_staff_candidates") : Promise.resolve({ data: [] as { user_id: string; email: string }[] }),
    canProvisionAccounts ? supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", ["cataloger", "administrator"]).eq("status", "active") : Promise.resolve({ count: null }),
    supabase.rpc("list_staff_activity_feed", { page_size: 10 }),
    supabase.from("request_priorities").select("request_id,marked_at,request:cataloging_requests!inner(id,protocol,title,subtitle,status)").order("marked_at", { ascending: true }),
  ]);
  const all = requests ?? [];
  const unassigned = all.filter((request) => !request.assigned_to).length;
  const mine = all.filter((request) => request.assigned_to === userId && ["in_review", "changes_requested"].includes(request.status)).length;
  const changes = all.filter((request) => request.status === "changes_requested").length;
  const approved = all.filter((request) => request.status === "approved").length;
  const administrator = canProvisionAccounts;
  const priorities = (priorityRows ?? []).flatMap((row) => {
    const request = Array.isArray(row.request) ? row.request[0] : row.request;
    return request && ["submitted", "in_review", "changes_requested", "approved"].includes(request.status)
      ? [{ id: request.id, protocol: request.protocol, title: formatWorkTitle(request.title, request.subtitle), markedAt: row.marked_at }]
      : [];
  });
  return <main className="dashboard-main dashboard-main--staff-overview">
    <StaffGlobalSearch prominent firstName={firstName} greetingVariant={Math.floor(Math.random() * 6)} />
    <h1 className="sr-only">Visão geral</h1>
    <div className={`staff-overview-main${administrator ? " staff-overview-main--admin" : " staff-overview-main--cataloger"}`}>
      <StaffActivityFeed initialEvents={(activityFeed.data ?? []) as StaffActivityEvent[]} userId={userId} initialLoadError={Boolean(activityFeed.error)} />
      <div className="staff-overview-main__side"><section className="overview-stats" aria-label="Indicadores rápidos">
      <article><AppIcon className="overview-stats__icon" name="queue" /><strong>{unassigned}</strong><span>na fila sem responsável</span><Link href="/painel/fila">Abrir fila</Link></article>
      <article><AppIcon className="overview-stats__icon" name="work" /><strong>{mine}</strong><span>{administrator ? "atendimentos em andamento" : "meus atendimentos em andamento"}</span><Link href="/painel/fila?responsavel=me">Ver atendimentos</Link></article>
      <article><AppIcon className="overview-stats__icon" name="edit" /><strong>{changes}</strong><span>solicitações aguardando correção</span><Link href="/painel/fila?status=changes_requested">Ver pendências</Link></article>
      <article><AppIcon className="overview-stats__icon" name={administrator ? "admin" : "check"} /><strong>{administrator ? candidates.length : approved}</strong><span>{administrator ? "contas aguardando provisionamento" : "solicitações aprovadas"}</span><Link href={administrator ? "/painel/admin" : "/painel/fila?status=approved"}>{administrator ? "Administrar contas" : "Ver aprovações"}</Link></article>
      </section>
      <section className="overview-context">{administrator && (candidates?.length ?? 0) > 0 && <article className="panel"><p className="eyebrow">Equipe ativa</p><h2>{activeStaffCount ?? 0} pessoas com acesso operacional</h2><p>Use a administração para ajustar perfis, situações e permissões.</p><Link className="button button--secondary button--small" href="/painel/admin">Abrir administração</Link></article>}<article className="panel overview-priorities"><p className="eyebrow overview-priorities__heading"><AppIcon name="star" /><span>Prioridade da fila</span></p><h2>{priorities.length ? `${priorities.length} ${priorities.length === 1 ? "protocolo prioritário" : "protocolos prioritários"} em aberto` : "Nenhum protocolo prioritário em aberto"}</h2>{priorities.length ? <ol>{priorities.map((item) => <li key={item.id}><div><strong>{item.protocol}</strong><span>{item.title}</span><small>Prioritário desde {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.markedAt))}</small></div><Link className="button button--secondary button--small" href={`/painel/atendimento/${item.id}`} aria-label={`Abrir protocolo ${item.protocol}`}>Abrir <AppIcon name="arrowRight" /></Link></li>)}</ol> : <p>Os protocolos marcados como prioritários aparecerão aqui até a finalização.</p>}</article></section>
      <StaffAnnouncementsCalendar announcements={announcements ?? []} />
      </div>
    </div>
    {administrator && <AdminProvisioningAlert candidates={candidates ?? []} />}
  </main>;
}
