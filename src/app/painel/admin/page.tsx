import { AppIcon } from "@/components/app-icon";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminOperations } from "@/components/admin-operations";
import { AdminIndexNavigation } from "@/components/admin-index-navigation";
import { createClient } from "@/lib/supabase/server";
import { articleHtml, helpArticles, initialKnowledgeEntries, type KnowledgeEntry } from "@/lib/knowledge-base";
import { safeKnowledgeHtml } from "@/lib/knowledge-service";
import { panelMetadata } from "@/lib/panel-metadata";
import { adminAreaHref, adminSections, adminTabHref, canOpenAdminTab, resolveAdminLocation } from "@/lib/admin-navigation";
import type { PermissionOverride } from "@/components/staff-permissions-admin";
import { userAdminPermissions } from "@/lib/staff-permissions";
import { legacyIssueTemplateFields } from "@/lib/issue-template-fields";
import { supportedLanguages, type InterfaceLanguage } from "@/lib/interface-language";
type AdminSearchParams = { area?: string; aba?: string; conteudo?: string; idioma?: string };
export async function generateMetadata({ searchParams }: { searchParams: Promise<AdminSearchParams> }) { const { area, aba } = await searchParams; return panelMetadata("/painel/admin", { area, tab: aba }); }

function AdminIndex({ section, permissions }: { section?: (typeof adminSections)[number]; permissions: string[] }) {
  const title = section?.label ?? "Administração";
  const summary = section?.summary ?? "Escolha uma área para acessar as ferramentas administrativas.";
  return <main className="dashboard-main admin-index-screen admin-index-destination" key={section?.area ?? "admin-root"}><div className="page-heading"><div><Link className="admin-index__back" href={section ? "/painel/admin" : "/painel"}><AppIcon name="arrowRight" />{section ? "Voltar à Administração" : "Voltar ao painel"}</Link><p className="eyebrow">Administração</p><h1><AppIcon className="panel-heading-icon" name={section?.icon ?? "hierarchy"} /><span className="panel-heading-text"><span className="panel-heading-text__inner">{title}</span></span></h1><p>{summary}</p></div></div>
    <AdminIndexNavigation label={section ? `Áreas de ${title}` : "Áreas da administração"}>
      {section ? section.tabs.filter((tab) => canOpenAdminTab(tab.id, permissions)).map((tab) => <Link data-admin-index-destination className="admin-index__card" href={adminTabHref(section.area, tab.id)} key={tab.id}><span className="admin-index__icon"><AppIcon name={tab.icon} /></span><span className="admin-index__copy"><strong>{tab.label}</strong><span>{tab.description}</span></span><AppIcon className="admin-index__arrow" name="arrowRight" /></Link>)
        : adminSections.filter((area) => area.tabs.some((tab) => canOpenAdminTab(tab.id, permissions))).map((area) => <Link data-admin-index-destination className="admin-index__card" href={adminAreaHref(area.area)} key={area.area}><span className="admin-index__icon"><AppIcon name={area.icon} /></span><span className="admin-index__copy"><strong>{area.label}</strong><span>{area.summary}</span></span><AppIcon className="admin-index__arrow" name="arrowRight" /></Link>)}
    </AdminIndexNavigation>
  </main>;
}


export default async function AdminPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const params = await searchParams;
  const { area, tab } = resolveAdminLocation(params.area, params.aba);
  const section = adminSections.find((item) => item.area === area) ?? adminSections[0];
  const currentTab = section.tabs.find((item) => item.id === tab);
  const pageTitle = currentTab?.label ?? "Administração";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  if (!profile || !["administrator", "cataloger"].includes(profile.role)) redirect("/painel");
  const permissions = await userAdminPermissions(supabase, profile.role);
  if (!adminSections.some((item) => item.tabs.some((entry) => canOpenAdminTab(entry.id, permissions)))) redirect("/painel");
  if (!params.aba) {
    if (params.area && !section.tabs.some((entry) => canOpenAdminTab(entry.id, permissions))) redirect("/painel/admin");
    return <AdminIndex section={params.area ? section : undefined} permissions={permissions} />;
  }
  if (!canOpenAdminTab(tab, permissions)) redirect("/painel/admin");
  const canViewCalendar = permissions.includes("library.calendar.view") || permissions.includes("library.calendar.manage");
  const [users, candidates, programs, announcements, templates, logs, purge, faqs, cduDescriptions, knowledge, dailyHours, permissionDefinitions, permissionOverrides, inheritedRoles] = await Promise.all([
    tab === "users" || tab === "permissions" ? supabase.from("profiles").select("id,full_name,email,role,status,created_at,staff_profiles(professional_name,crb),student_profiles(birth_date)").order("full_name") : Promise.resolve({ data: null }),
    tab === "users" && permissions.includes("admin.accounts.provision") ? supabase.rpc("list_confirmed_staff_candidates") : Promise.resolve({ data: null }),
    tab === "programs" ? supabase.from("academic_programs").select("id,name,level,service_level_business_days,repository_deposit_enabled,coordination_magic_link_enabled,coordination_contacts(name,email,active)").eq("active", true).order("name") : Promise.resolve({ data: null }),
    tab === "library" ? supabase.from("library_announcements").select("id,type,title,message,starts_at,ends_at,active,calendar_source,source_reference").order("starts_at", { ascending: false }) : Promise.resolve({ data: null }),
    tab === "service" ? (async () => {
      const current = await supabase.from("issue_templates").select("id,code,label,message,active,position,field_keys").order("position").order("label");
      if (!current.error) return { ...current, schemaReady: true };
      const legacy = await supabase.from("issue_templates").select("id,code,label,message,active,position").order("position").order("label");
      return { ...legacy, data: legacy.data?.map((item) => ({ ...item, field_keys: legacyIssueTemplateFields(item.code) })) ?? null, schemaReady: false };
    })() : Promise.resolve({ data: null, schemaReady: false }),
    tab === "audit" ? supabase.from("audit_logs").select("id,action,entity_type,entity_id,metadata,occurred_at,profiles:actor_id(full_name)").order("occurred_at", { ascending: false }).limit(200) : Promise.resolve({ data: null }),
    tab === "retention" ? supabase.from("nada_consta_documents").select("id,request_id,object_path,purge_after,cataloging_requests(protocol)").lte("purge_after", new Date().toISOString()).not("object_path", "is", null).order("purge_after") : Promise.resolve({ data: null }),
    tab === "faq" ? supabase.from("frequently_asked_questions").select("id,question,answer,position,active,featured_position,created_at,updated_at").order("position") : Promise.resolve({ data: null }),
    tab === "cdu" ? supabase.from("cdu_code_descriptions").select("cdu_code,description,composition_notes,auxiliary_codes,related_codes,source_reference,validated").order("cdu_code") : Promise.resolve({ data: null }),
    tab === "faq" ? supabase.from("knowledge_base_entries").select("id,slug,kind,title,summary,body_html,translations,category,audiences,active,position,featured_position,created_at,updated_at,published_at").order("position") : Promise.resolve({ data: null }),
    tab === "library" ? supabase.from("library_daily_hours").select("service_date,closing_time").order("service_date") : Promise.resolve({ data: null }),
    tab === "permissions" ? supabase.from("permission_definitions").select("code,area,screen,action,description,default_roles,delegable").order("area").order("screen").order("action") : Promise.resolve({ data: null }),
    tab === "permissions" ? supabase.from("staff_permission_overrides").select("id,profile_id,permission_code,effect,valid_from,valid_until,revoked_at").order("created_at", { ascending: false }) : Promise.resolve({ data: null }),
    tab === "permissions" ? supabase.from("staff_inherited_roles").select("id,profile_id,inherited_role,valid_from,valid_until,revoked_at").order("created_at", { ascending: false }) : Promise.resolve({ data: null }),
  ]);
  const knowledgeEntries: KnowledgeEntry[] = (knowledge.data ? knowledge.data as KnowledgeEntry[] : initialKnowledgeEntries(faqs.data ?? []))
    .map((entry) => ({ ...entry, body_html: safeKnowledgeHtml(entry.body_html) }));
  const nadaConstaGuide = helpArticles.find((item) => item.slug === "emitir-nada-consta");
  if (tab === "faq" && knowledge.data && nadaConstaGuide && !knowledgeEntries.some((entry) => entry.slug === nadaConstaGuide.slug)) {
    knowledgeEntries.push({ id: `initial-${nadaConstaGuide.id}`, slug: nadaConstaGuide.slug ?? null, kind: "article", title: nadaConstaGuide.title, summary: nadaConstaGuide.summary, body_html: safeKnowledgeHtml(articleHtml(nadaConstaGuide)), category: nadaConstaGuide.category, audiences: ["public", "student", "panel"], active: true, position: 1070, featured_position: null, created_at: null, updated_at: null, published_at: null });
  }
  return <main className="dashboard-main admin-tab-page" key={`${area}-${tab}`}><div className="page-heading"><div><p className="eyebrow">Administração · {section.label}</p><h1><AppIcon className="panel-heading-icon" name={currentTab?.icon ?? section.icon} /><span className="panel-heading-text"><span className="panel-heading-text__inner">{pageTitle}</span></span></h1><p>{currentTab?.description ?? section.summary}</p></div></div><AdminOperations area={area} tab={tab} users={users.data ?? []} staffCandidates={candidates.data ?? []} programs={programs.data ?? []} announcements={announcements.data ?? []} dailyHours={dailyHours.data ?? []} templates={templates.data ?? []} templateFieldsReady={templates.schemaReady} logs={logs.data ?? []} purgeDocuments={purge.data ?? []} knowledge={knowledgeEntries} initialKnowledgeId={tab === "faq" ? params.conteudo : undefined} initialKnowledgeLanguage={tab === "faq" && supportedLanguages.includes(params.idioma as InterfaceLanguage) ? params.idioma as InterfaceLanguage : "pt"} cduEntries={cduDescriptions.data ?? []} permissionDefinitions={permissionDefinitions.data ?? []} permissionOverrides={(permissionOverrides.data ?? []) as PermissionOverride[]} inheritedRoles={inheritedRoles.data ?? []} canViewCalendar={canViewCalendar} grantedPermissions={permissions} /></main>;
}
