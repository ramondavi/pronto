import { panelMetadata } from "@/lib/panel-metadata";
export async function generateMetadata() { return panelMetadata("/painel/admin/avaliacoes"); }
import { AppIcon } from "@/components/app-icon";
import { redirect } from "next/navigation";
import { FeedbackAdminDashboard } from "@/components/feedback-admin-dashboard";
import { createClient } from "@/lib/supabase/server";
import { userHasPermission } from "@/lib/staff-permissions";


export default async function FeedbackAdministrationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  if (!user || !profile) redirect("/painel");
  const [canView, canExport, canActivate] = await Promise.all(["admin.feedback.view", "admin.feedback.export", "admin.feedback.activate"].map((code) => userHasPermission(supabase, code, profile.role)));
  if (!canView && !canExport && !canActivate) redirect("/painel");
  const [{ data: campaign }, { data: stats }, { data: responses }] = await Promise.all([
    supabase.from("feedback_campaign").select("activated_at,site_url").eq("id", true).single(),
    supabase.rpc("feedback_campaign_stats"),
    supabase.from("feedback_responses").select("id,answers"),
  ]);
  const counts = stats as { invited?: number; responded?: number; invitations_close_at?: string; report_ready_at?: string; responses_purged_at?: string | null; aggregate_report?: Record<string, Record<string, number>> | null } | null;
  return <main className="dashboard-main"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name="review" /><span className="panel-heading-text"><span className="panel-heading-text__inner">Avaliações</span></span></h1></div></div><FeedbackAdminDashboard activatedAt={campaign?.activated_at ?? null} siteUrl={campaign?.site_url ?? null} invitedCount={counts?.invited ?? 0} respondedCount={counts?.responded ?? 0} invitationsCloseAt={counts?.invitations_close_at ?? null} reportReadyAt={counts?.report_ready_at ?? null} responsesPurgedAt={counts?.responses_purged_at ?? null} aggregateReport={counts?.aggregate_report ?? null} responses={(responses ?? []) as { id: string; answers: Record<string, string> }[]} canActivate={canActivate} canExport={canExport} /></main>;
}
