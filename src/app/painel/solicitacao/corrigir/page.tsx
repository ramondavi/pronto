import { panelMetadata } from "@/lib/panel-metadata";
export async function generateMetadata() { return panelMetadata("/painel/solicitacao/corrigir"); }
import { AppIcon } from "@/components/app-icon";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudentCorrectionForm } from "@/components/student-correction-form";
import { StudentFeedbackInvite } from "@/components/student-feedback-invite";
import { correctableFields } from "@/domain/issues/fields";
import { createClient } from "@/lib/supabase/server";
import { ProtocolCopyButton } from "@/components/protocol-copy-button";
import { RelativeDateTime } from "@/components/relative-date-time";
import { monographDisplayName, programDisplayName } from "@/domain/staff-queue/program-labels";
import { formatWorkTitle } from "@/lib/work-title";
import { getInterfaceLanguage } from "@/lib/server-language";
import { uiText } from "@/lib/ui-text";


type RawRequest = { id: string; protocol: string; title: string; subtitle: string | null; submitted_at: string; equivalent_title: string | null; other_titles: string[]; public_work_url: string; volume_information: string | null; library_note: string | null; enrollment: { registration_number: string; academic_program_id: string; program: { code: string; name: string; work_type: string } | { code: string; name: string; work_type: string }[] | null } | { registration_number: string; academic_program_id: string; program: { code: string; name: string; work_type: string } | { code: string; name: string; work_type: string }[] | null }[] | null; people: { role: string; transcribed_name: string }[]; keywords: { language: string; term: string; position: number }[] };
const first = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

export default async function CorrectStudentRequestPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("cataloging_requests").select(`id, protocol, title, subtitle, submitted_at, equivalent_title, other_titles, public_work_url, volume_information, library_note, enrollment:academic_enrollments!cataloging_requests_academic_enrollment_id_fkey(registration_number, academic_program_id, program:academic_programs(code, name, work_type)), people:request_people(role, transcribed_name), keywords:request_keywords(language, term, position)`).eq("status", "changes_requested").maybeSingle();
  if (!data) redirect("/painel/solicitacao");
  const request = data as unknown as RawRequest;
  const { data: revision } = await supabase.from("request_revision_rounds").select("id, returned_at").eq("request_id", request.id).is("responded_at", null).order("round_number", { ascending: false }).limit(1).maybeSingle();
  if (!revision) redirect("/painel/solicitacao");
  const [{ data: issues }, { data: programs }] = await Promise.all([supabase.from("request_field_issues").select("field_key, field_label, justification").eq("revision_round_id", revision.id).is("resolved_at", null).order("created_at"), supabase.from("academic_programs").select("id, name, level").eq("active", true).order("name")]);
  const enrollment = first(request.enrollment);
  const program = first(enrollment?.program ?? null);
  const currentValues: Record<string, string | string[]> = { registration_number: enrollment?.registration_number ?? "", academic_program_id: enrollment?.academic_program_id ?? "", author: request.people.find((item) => item.role === "author")?.transcribed_name ?? "", title: request.title, subtitle: request.subtitle ?? "", equivalent_title: request.equivalent_title ?? "", other_titles: request.other_titles ?? [], advisor: request.people.find((item) => item.role === "advisor")?.transcribed_name ?? "", coadvisor: request.people.find((item) => item.role === "coadvisor")?.transcribed_name ?? "", keywords_pt: request.keywords.filter((item) => item.language === "pt").sort((a, b) => a.position - b.position).map((item) => item.term), keywords_en: request.keywords.filter((item) => item.language === "en").sort((a, b) => a.position - b.position).map((item) => item.term), public_work_url: request.public_work_url, volume_information: request.volume_information ?? "", library_note: request.library_note ?? "" };
  const fields = (issues ?? []).map((issue) => ({ fieldKey: issue.field_key, fieldLabel: issue.field_label, justification: issue.justification, kind: correctableFields.find((field) => field.key === issue.field_key)?.kind ?? "text", value: currentValues[issue.field_key] ?? "" }));
  if (fields.length === 0) redirect("/painel/solicitacao");
  const language = await getInterfaceLanguage();
  const t = (source: string) => uiText(language, source);
  return <main className="dashboard-main dashboard-main--form"><Link className="back-link" href="/painel/solicitacao">← {t("Minhas solicitações")}</Link><div className="page-heading request-heading"><div><h1><AppIcon className="panel-heading-icon" name="edit" /><span className="panel-heading-text"><span className="panel-heading-text__inner">{t("Corrigir solicitação")}</span></span></h1></div></div>
    <StudentFeedbackInvite />
    <header className="analysis-case-header student-delivery-case-header student-correction-case-header queue-status-color--changes_requested" aria-labelledby="correction-request-title">
      <div className="analysis-case-header__top"><span className="queue-item__protocol analysis-case-header__protocol"><AppIcon name="document" /><ProtocolCopyButton protocol={request.protocol} showLabel={false} /></span><span className="progress-badge queue-status-color queue-status-color--changes_requested"><AppIcon name="edit" />{t("Ajustes solicitados")}</span></div>
      <div className="analysis-case-header__title"><h2 id="correction-request-title">{formatWorkTitle(request.title, request.subtitle)}</h2></div>
      <dl className="analysis-case-header__details">
        <div><dt><AppIcon name="book" />{t("Programa")}</dt><dd title={program?.name}>{t(programDisplayName(program))}</dd></div>
        <div><dt><AppIcon name="document" />{t("Tipo de monografia")}</dt><dd>{t(monographDisplayName(program))}</dd></div>
        <div><dt><AppIcon name="person" />{t("Autoria")}</dt><dd>{request.people.filter((person) => person.role === "author").map((person) => person.transcribed_name).join("; ") || t("Não informada")}</dd></div>
        <div><dt><AppIcon name="person" />{t("Orientador")}</dt><dd>{request.people.find((person) => person.role === "advisor")?.transcribed_name ?? t("Não informado")}</dd></div>
      </dl>
      <ol className="queue-item__timeline student-delivery-timeline" aria-label={t("Marcos da solicitação")}><li className="is-complete"><span className="queue-item__timeline-dot" aria-hidden="true" /><span>{t("Solicitação enviada")}</span><RelativeDateTime value={request.submitted_at} /></li><li className="is-current queue-status-color--changes_requested"><span className="queue-item__timeline-dot" aria-hidden="true" /><span>{t("Ajustes solicitados")}</span><RelativeDateTime value={revision.returned_at} /></li></ol>
    </header>
    <StudentCorrectionForm requestId={request.id} fields={fields} programs={programs ?? []} />
  </main>;
}
