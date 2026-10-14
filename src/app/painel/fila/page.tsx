import { redirect } from "next/navigation";
import { StaffQueue } from "@/components/staff-queue";
import { createClient } from "@/lib/supabase/server";
import type { QueueRequest, StaffOption } from "@/domain/staff-queue/types";
import { describeRequestProgress } from "@/domain/request-progress";
import { panelMetadata } from "@/lib/panel-metadata";
import { monographDisplayName, programDisplayName } from "@/domain/staff-queue/program-labels";
import { userHasPermission } from "@/lib/staff-permissions";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ responsavel?: string }> }) {
  return panelMetadata("/painel/fila", { responsible: (await searchParams).responsavel });
}

type RawQueueRequest = {
  id: string; protocol: string; status: string; title: string; subtitle: string | null; cancellation_reason: string | null; submitted_at: string; updated_at: string; assigned_to: string | null;
  assignee: { full_name: string } | { full_name: string }[] | null;
  student: { profile: { full_name: string } | { full_name: string }[] | null } | { profile: { full_name: string } | { full_name: string }[] | null }[] | null;
  enrollment: { registration_number: string | null; program: { id: string; code: string; name: string; level: string; work_type: string } | { id: string; code: string; name: string; level: string; work_type: string }[] | null } | { registration_number: string | null; program: { id: string; code: string; name: string; level: string; work_type: string } | { id: string; code: string; name: string; level: string; work_type: string }[] | null }[] | null;
  people: { role: string; transcribed_name: string }[] | null;
  analysis: { analysis_notes: string; review_completed_at: string | null }[] | { analysis_notes: string; review_completed_at: string | null } | null;
  nadaConsta: { status: string; uploaded_at: string }[] | null;
  homologation: { id: string }[] | null;
  repositoryProgress: { started_at: string }[] | null;
  publication: { verified_at: string }[] | null;
  priority: { request_id: string; reason_code: string; reason_detail: string | null }[] | null;
};

const first = <T,>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;
export default async function StaffQueuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  if (!user || !profile || !["cataloger", "administrator"].includes(profile.role)) redirect("/painel");
  const canViewQueue = await userHasPermission(supabase, "staff.queue.view", profile.role);
  if (!canViewQueue) redirect("/painel");
  const [caseAccess, assumeAccess, releaseAccess, reassignAccess, priorityAccess] = await Promise.all([
    userHasPermission(supabase, "staff.case.view", profile.role),
    userHasPermission(supabase, "staff.queue.assume", profile.role),
    userHasPermission(supabase, "staff.queue.release", profile.role),
    userHasPermission(supabase, "staff.queue.reassign", profile.role),
    userHasPermission(supabase, "staff.queue.priority", profile.role),
  ]);

  const { data: staffData } = await supabase.from("profiles").select("id, full_name").in("role", ["cataloger", "administrator"]).eq("status", "active").order("full_name");
  const data: RawQueueRequest[] = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const { data: batch, error } = await supabase.from("cataloging_requests").select(`
      id, protocol, status, title, subtitle, cancellation_reason, submitted_at, updated_at, assigned_to,
      assignee:profiles!cataloging_requests_assigned_to_fkey(full_name),
      student:student_profiles!cataloging_requests_student_profile_id_fkey(
        profile:profiles!student_profiles_profile_id_fkey(full_name)
      ),
      enrollment:academic_enrollments!cataloging_requests_academic_enrollment_id_fkey(
        registration_number, program:academic_programs!academic_enrollments_academic_program_id_fkey(id, code, name, level, work_type)
      ),
      people:request_people(role, transcribed_name),
      analysis:request_analyses(analysis_notes,review_completed_at),
      nadaConsta:nada_consta_documents(status,uploaded_at),
      homologation:cataloging_card_homologations(id),
      repositoryProgress:repository_deposit_progress(started_at),
      publication:repository_publications(verified_at),
      priority:request_priorities(request_id,reason_code,reason_detail)
    `).order("submitted_at", { ascending: true }).range(offset, offset + batchSize - 1);
    if (error) throw error;
    data.push(...((batch ?? []) as unknown as RawQueueRequest[]));
    if (!batch || batch.length < batchSize) break;
  }

  const requests: QueueRequest[] = data.map((item) => {
    const student = first(item.student);
    const enrollment = first(item.enrollment);
    const program = first(enrollment?.program);
    const assignee = first(item.assignee);
    const analysis = first(item.analysis);
    const latestNadaConsta = [...(item.nadaConsta ?? [])].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))[0];
    const progress = describeRequestProgress({ status: item.status, assignedTo: item.assigned_to, nadaConstaStatus: latestNadaConsta?.status, hasHomologation: Boolean(first(item.homologation)), hasRepositoryDeposit: Boolean(first(item.repositoryProgress)), hasPublication: Boolean(first(item.publication)) });
    return {
      id: item.id, protocol: item.protocol, status: item.status, title: item.title, subtitle: item.subtitle,
      submittedAt: item.submitted_at, updatedAt: item.updated_at, assignedTo: item.assigned_to,
      assigneeName: assignee?.full_name ?? null,
      studentName: first(student?.profile)?.full_name ?? "Estudante",
      registrationNumber: enrollment?.registration_number ?? null,
      programId: program?.id ?? "", programName: program?.name ?? "Programa não identificado",
      programLabel: programDisplayName(program),
      monographType: monographDisplayName(program),
      level: program?.level ?? "", advisorName: item.people?.find((person) => person.role === "advisor")?.transcribed_name ?? "",
      analysisNotes: analysis?.analysis_notes.trim() || null,
      nadaConstaStatus: latestNadaConsta?.status ?? null,
      hasHomologation: Boolean(first(item.homologation)),
      cancellationReason: item.cancellation_reason,
      isPriority: Boolean(first(item.priority)),
      priorityReasonCode: first(item.priority)?.reason_code ?? null,
      priorityReasonDetail: first(item.priority)?.reason_detail ?? null,
      canRevisitDeclarations: item.status === "in_review" && !analysis?.review_completed_at,
      progressLabel: progress.label, progressTone: progress.tone,
      progressStep: item.status === "completed" || Boolean(first(item.publication)) ? 4 : item.status === "approved" ? Boolean(first(item.repositoryProgress)) ? 3 : 2 : item.status === "submitted" ? 0 : 1,
    };
  });
  const staff: StaffOption[] = (staffData ?? []).map((item) => ({ id: item.id, fullName: item.full_name }));
  return <main className="dashboard-main dashboard-main--queue"><StaffQueue initialRequests={requests} staff={staff} currentUserId={user.id} canViewCase={caseAccess} canAssume={assumeAccess} canRelease={releaseAccess} canReassign={reassignAccess} canPriority={priorityAccess} /></main>;
}
