import { AppIcon } from "@/components/app-icon";
import { redirect } from "next/navigation";
import { AdminOperations } from "@/components/admin-operations";
import { createClient } from "@/lib/supabase/server";
import { initialKnowledgeEntries, type KnowledgeEntry } from "@/lib/knowledge-base";
import { safeKnowledgeHtml } from "@/lib/knowledge-service";
import { panelMetadata } from "@/lib/panel-metadata";
import { adminSections, resolveAdminLocation } from "@/lib/admin-navigation";
import type { PermissionOverride } from "@/components/staff-permissions-admin";
import { userHasPermission } from "@/lib/staff-permissions";
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ area?: string; aba?: string }> }) { const { area, aba } = await searchParams; return panelMetadata("/painel/admin", { area, tab: aba }); }


export default async function AdminPage({ searchParams }: { searchParams: Promise<{ area?: string; aba?: string }> }) {
  const params = await searchParams;
  const { area, tab } = resolveAdminLocation(params.area, params.aba);
  const section = adminSections.find((item) => item.area === area) ?? adminSections[0];
  const pageTitle = section.tabs.find((item) => item.id === tab)?.label ?? "Administração";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  if (!profile || !["administrator", "cataloger"].includes(profile.role)) redirect("/painel");
  const canViewCalendar = await userHasPermission(supabase, "library.calendar.view", profile.role);
  const canManageCalendar = await userHasPermission(supabase, "library.calendar.manage", profile.role);
  if (profile.role !== "administrator") {
    if (tab !== "library" || !canViewCalendar || !canManageCalendar) redirect("/painel");
    const { data: announcements } = await supabase.from("library_announcements").select("id,type,title,message,starts_at,ends_at,active,calendar_source,source_reference").order("starts_at", { ascending: false });
    return <main className="dashboard-main"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name={section.icon} />{pageTitle}</h1></div></div><AdminOperations area={area} tab={tab} users={[]} staffCandidates={[]} programs={[]} announcements={announcements ?? []} dailyHours={[]} templates={[]} logs={[]} purgeDocuments={[]} knowledge={[]} cduEntries={[]} permissionDefinitions={[]} permissionOverrides={[]} inheritedRoles={[]} canViewCalendar delegatedCalendarOnly /></main>;
  }
  if (tab === "library" && !canViewCalendar) redirect("/painel/admin?area=operacao&aba=users");
  const [users, candidates, programs, announcements, templates, logs, purge, faqs, cduDescriptions, knowledge, dailyHours, permissionDefinitions, permissionOverrides, inheritedRoles] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,role,status,created_at,staff_profiles(professional_name,crb),student_profiles(birth_date)").order("full_name"),
    supabase.rpc("list_confirmed_staff_candidates"),
    supabase.from("academic_programs").select("id,name,level,service_level_business_days,repository_deposit_enabled,coordination_magic_link_enabled,coordination_contacts(name,email,active)").eq("active", true).order("name"),
    supabase.from("library_announcements").select("id,type,title,message,starts_at,ends_at,active,calendar_source,source_reference").order("starts_at", { ascending: false }),
    supabase.from("issue_templates").select("id,code,label,message,active,position").order("position"),
    supabase.from("audit_logs").select("id,action,entity_type,entity_id,metadata,occurred_at,profiles:actor_id(full_name)").order("occurred_at", { ascending: false }).limit(200),
    supabase.from("nada_consta_documents").select("id,request_id,object_path,purge_after,cataloging_requests(protocol)").lte("purge_after", new Date().toISOString()).not("object_path", "is", null).order("purge_after"),
    supabase.from("frequently_asked_questions").select("id,question,answer,position,active,featured_position,created_at,updated_at").order("position"),
    supabase.from("cdu_code_descriptions").select("cdu_code,description,composition_notes,auxiliary_codes,related_codes,source_reference,validated").order("cdu_code"),
    supabase.from("knowledge_base_entries").select("id,slug,kind,title,summary,body_html,translations,category,audiences,active,position,featured_position,created_at,updated_at,published_at").order("position"),
    supabase.from("library_daily_hours").select("service_date,closing_time").order("service_date"),
    supabase.from("permission_definitions").select("code,area,screen,action,description,default_roles,delegable").order("area").order("screen").order("action"),
    supabase.from("staff_permission_overrides").select("id,profile_id,permission_code,effect,valid_from,valid_until,revoked_at").order("created_at", { ascending: false }),
    supabase.from("staff_inherited_roles").select("id,profile_id,inherited_role,valid_from,valid_until,revoked_at").order("created_at", { ascending: false }),
  ]);
  const knowledgeEntries: KnowledgeEntry[] = (knowledge.data ? knowledge.data as KnowledgeEntry[] : initialKnowledgeEntries(faqs.data ?? []))
    .map((entry) => ({ ...entry, body_html: safeKnowledgeHtml(entry.body_html) }));
  return <main className="dashboard-main"><div className="page-heading"><div><h1><AppIcon className="panel-heading-icon" name={section.icon} />{pageTitle}</h1></div></div><AdminOperations area={area} tab={tab} users={users.data ?? []} staffCandidates={candidates.data ?? []} programs={programs.data ?? []} announcements={announcements.data ?? []} dailyHours={dailyHours.data ?? []} templates={templates.data ?? []} logs={logs.data ?? []} purgeDocuments={purge.data ?? []} knowledge={knowledgeEntries} cduEntries={cduDescriptions.data ?? []} permissionDefinitions={permissionDefinitions.data ?? []} permissionOverrides={(permissionOverrides.data ?? []) as PermissionOverride[]} inheritedRoles={inheritedRoles.data ?? []} canViewCalendar={canViewCalendar} /></main>;
}
