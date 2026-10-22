import { hasRetrospectiveAccess } from "@/lib/retrospective-access";
import { AppIcon } from "@/components/app-icon";
import { redirect } from "next/navigation";
import { StudentRequestForm } from "@/components/student-request-form";
import { StudentFeedbackInvite } from "@/components/student-feedback-invite";
import { createClient } from "@/lib/supabase/server";
import { panelMetadata } from "@/lib/panel-metadata";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";
export async function generateMetadata() { return panelMetadata("/painel/solicitacao/nova"); }


export default async function NewStudentRequestPage({ searchParams }: { searchParams: Promise<{ revisao?: string }> }) {
  const { revisao } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const retrospective = await hasRetrospectiveAccess();
  const { data: previousRequests } = await supabase.from("cataloging_requests").select("status, academic_enrollments(registration_number)").neq("status", "canceled");
  if (!retrospective && previousRequests?.some((request) => ["submitted", "in_review", "changes_requested", "approved"].includes(request.status))) redirect("/painel/solicitacao");
  const usedRegistrations = (previousRequests ?? []).flatMap((request) => {
    const enrollment = Array.isArray(request.academic_enrollments) ? request.academic_enrollments[0] : request.academic_enrollments;
    return enrollment?.registration_number ? [enrollment.registration_number] : [];
  });
  const { data: student } = await supabase.from("student_profiles").select("birth_date").eq("profile_id", user.id).maybeSingle();
  if (!retrospective && !student?.birth_date) redirect("/painel/conta?error=Informe%20sua%20data%20de%20nascimento%20antes%20de%20abrir%20uma%20solicita%C3%A7%C3%A3o.");
  const { data: requester } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const { data: programs } = await supabase.from("academic_programs").select("id, code, name, level, work_type").eq("active", true).order("name");
  return <main className="dashboard-main dashboard-main--form"><div className="page-heading request-heading"><div><h1><AppIcon className="panel-heading-icon" name="document" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{uiText(await getInterfaceLanguage(), "Nova solicitação")}</span></span></h1></div></div><StudentFeedbackInvite /><StudentRequestForm key={user.id} userId={user.id} requesterName={requester?.full_name ?? ""} retrospective={retrospective} programs={(programs ?? []).filter((program) => !retrospective || program.code === "athdc-specialization")} usedRegistrations={usedRegistrations} openReview={revisao === "1"} /></main>;
}
