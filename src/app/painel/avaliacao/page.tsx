import { panelMetadata } from "@/lib/panel-metadata";
export async function generateMetadata() { return panelMetadata("/painel/avaliacao"); }
import { AppIcon } from "@/components/app-icon";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedbackQuestionnaire } from "@/components/feedback-questionnaire";
import { createClient } from "@/lib/supabase/server";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";


export default async function FeedbackPage() {
  const language = await getInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  if (!user || profile?.role !== "student") redirect("/painel");
  const { data: invitations } = await supabase.from("feedback_invitations").select("request_id,invited_at,responded").order("invited_at", { ascending: false });
  const requestIds = (invitations ?? []).map((item) => item.request_id);
  if (!requestIds.length) return <main className="dashboard-main dashboard-main--narrow"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="review" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Avaliação do atendimento")}</span></span></h1></div></div><section className="panel"><h2>{t("Nenhuma avaliação disponível")}</h2><p>{t("Não há uma avaliação disponível para sua conta.")}</p><Link className="button button--secondary" href="/painel/solicitacao">{t("Ver minhas solicitações")}</Link></section></main>;
  const { data: requests } = await supabase.from("cataloging_requests").select("id,protocol,status,academic_enrollments(academic_programs(level))").in("id", requestIds);
  const invitation = (invitations ?? []).find((item) => !item.responded && Date.now() < new Date(item.invited_at).getTime() + 30 * 86_400_000);
  const request = (requests ?? []).find((item) => item.id === invitation?.request_id);
  if (!invitation || !request) return <main className="dashboard-main dashboard-main--narrow"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="review" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Avaliação do atendimento")}</span></span></h1></div></div><section className="feedback-thanks panel"><span aria-hidden="true">✓</span><h2>{t("Suas respostas foram registradas.")}</h2><p>{t("Elas vão orientar melhorias no Pronto! e nos serviços da BIB/FAUFBA.")}</p><Link className="button button--secondary" href="/painel/solicitacao">{t("Ver minhas solicitações")}</Link></section></main>;
  const enrollment = Array.isArray(request.academic_enrollments) ? request.academic_enrollments[0] : request.academic_enrollments;
  const program = enrollment && (Array.isArray(enrollment.academic_programs) ? enrollment.academic_programs[0] : enrollment.academic_programs);
  return <main className="dashboard-main dashboard-main--narrow"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="review" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Avaliação do atendimento")}</span></span></h1></div></div><FeedbackQuestionnaire requestId={request.id} protocol={request.protocol} postgraduate={Boolean(program && program.level !== "undergraduate")} /></main>;
}
