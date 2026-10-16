import { createClient } from "@/lib/supabase/server";
import { userAdminPermissions, userHasPermission } from "@/lib/staff-permissions";
import { adminSections, adminTabHref, canOpenAdminTab } from "@/lib/admin-navigation";

type SearchResult = { id: string; type: string; title: string; detail: string; href: string };
const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ results: [] }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role,status,full_name,email").eq("id", user.id).maybeSingle();
  if (!profile || profile.status !== "active" || !["cataloger", "administrator"].includes(profile.role)) return Response.json({ results: [] }, { status: 403 });

  const term = new URL(request.url).searchParams.get("q")?.trim().replace(/[^\p{L}\p{N}\s.\-/]/gu, "").slice(0, 80) ?? "";
  if (term.length < 2) return Response.json({ results: [] });
  const pattern = `%${term}%`;
  const [canSeeQueue, canSeeCalendar, adminPermissions] = await Promise.all([
    userHasPermission(supabase, "staff.queue.view", profile.role),
    userHasPermission(supabase, "library.calendar.view", profile.role),
    userAdminPermissions(supabase, profile.role),
  ]);
  const canSeeAccounts = canOpenAdminTab("users", adminPermissions);
  const canSeePrograms = canOpenAdminTab("programs", adminPermissions);
  const canSeeSubjects = canOpenAdminTab("subjects", adminPermissions);
  const canSeeCdu = canOpenAdminTab("cdu", adminPermissions);
  const canSeeFaq = canOpenAdminTab("faq", adminPermissions);
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(term) ?? /^(\d{4})-(\d{2})-(\d{2})$/.exec(term);
  const date = dateMatch ? term.includes("/") ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : term : null;
  const [requests, programs, terms, cdu, notices, people, help, metadata, requestPeople, keywords, templates, coordination, sla, audit, datedNotices, hours, permissionDefinitions, staffAccount, programSettings, retention, enrollments] = await Promise.all([
    canSeeQueue ? supabase.from("cataloging_requests").select("id,protocol,title,subtitle,status,public_work_url").or(`protocol.ilike.${pattern},title.ilike.${pattern},subtitle.ilike.${pattern},equivalent_title.ilike.${pattern},public_work_url.ilike.${pattern},volume_information.ilike.${pattern},library_note.ilike.${pattern}`).limit(8) : Promise.resolve({ data: null }),
    canSeePrograms ? supabase.from("academic_programs").select("id,code,name,service_level_business_days").or(`code.ilike.${pattern},name.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeeSubjects ? supabase.from("controlled_terms").select("id,preferred_label_pt,preferred_label_en").or(`preferred_label_pt.ilike.${pattern},preferred_label_en.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeeCdu ? supabase.from("cdu_code_descriptions").select("cdu_code,description,composition_notes").or(`cdu_code.ilike.${pattern},description.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeeCalendar ? supabase.from("library_announcements").select("id,title,message,starts_at,ends_at").or(`title.ilike.${pattern},message.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeeAccounts ? supabase.from("profiles").select("id,full_name,email,role,status").or(`full_name.ilike.${pattern},email.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeeFaq ? supabase.from("knowledge_base_entries").select("id,title,summary,slug").or(`title.ilike.${pattern},summary.ilike.${pattern},body_html.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeeQueue ? supabase.from("request_cataloging_metadata").select("request_id,cdu_code,cutter_code").or(`cdu_code.ilike.${pattern},cutter_code.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeeQueue ? supabase.from("request_people").select("request_id,role,transcribed_name,authorized_name").or(`transcribed_name.ilike.${pattern},authorized_name.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeeQueue ? supabase.from("request_keywords").select("request_id,term,language").ilike("term", pattern).limit(6) : Promise.resolve({ data: null }),
    canOpenAdminTab("service", adminPermissions) ? supabase.from("issue_templates").select("id,code,label,message").or(`code.ilike.${pattern},label.ilike.${pattern},message.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeePrograms ? supabase.from("coordination_contacts").select("id,name,email,academic_program_id").or(`name.ilike.${pattern},email.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeePrograms ? supabase.from("sla_settings").select("id,academic_program_id,business_days,effective_from").eq("business_days", Number(term) || -1).limit(6) : Promise.resolve({ data: null }),
    canOpenAdminTab("audit", adminPermissions) ? supabase.from("audit_logs").select("id,action,entity_type,entity_id,occurred_at").or(`action.ilike.${pattern},entity_type.ilike.${pattern},entity_id.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    canSeeCalendar && date ? supabase.from("library_announcements").select("id,title,message,starts_at").lte("starts_at", `${date}T23:59:59-03:00`).or(`ends_at.gte.${date}T00:00:00-03:00,ends_at.is.null`).limit(6) : Promise.resolve({ data: null }),
    canSeeCalendar && date ? supabase.from("library_daily_hours").select("service_date,closing_time").eq("service_date", date).limit(1) : Promise.resolve({ data: null }),
    adminPermissions.includes("admin.permissions.manage") ? supabase.from("permission_definitions").select("code,area,screen,action,description").or(`code.ilike.${pattern},area.ilike.${pattern},screen.ilike.${pattern},action.ilike.${pattern},description.ilike.${pattern}`).limit(6) : Promise.resolve({ data: null }),
    supabase.from("staff_profiles").select("crb,professional_name,birthday_month,birthday_day").eq("profile_id", user.id).maybeSingle(),
    canSeePrograms ? supabase.from("academic_programs").select("*").limit(100) : Promise.resolve({ data: null }),
    canOpenAdminTab("retention", adminPermissions) ? supabase.from("nada_consta_documents").select("id,request_id,original_name,purge_after").ilike("original_name", pattern).limit(6) : Promise.resolve({ data: null }),
    canSeeQueue ? supabase.from("academic_enrollments").select("id,registration_number,cataloging_requests(id,protocol)").ilike("registration_number", pattern).limit(6) : Promise.resolve({ data: null }),
  ]);
  const results: SearchResult[] = [];
  for (const row of requests.data ?? []) results.push({ id: `request-${row.id}`, type: "Protocolo", title: `${row.protocol} · ${row.title}`, detail: row.subtitle || row.status, href: `/painel/atendimento/${row.id}` });
  for (const row of metadata.data ?? []) results.push({ id: `metadata-${row.request_id}`, type: "CDU / Cutter do protocolo", title: [row.cdu_code, row.cutter_code].filter(Boolean).join(" · "), detail: "Abrir dados de catalogação", href: `/painel/atendimento/${row.request_id}` });
  for (const row of requestPeople.data ?? []) results.push({ id: `request-person-${row.request_id}-${row.role}-${row.transcribed_name}`, type: "Pessoa no protocolo", title: row.transcribed_name, detail: row.authorized_name ?? row.role, href: `/painel/atendimento/${row.request_id}` });
  for (const row of keywords.data ?? []) results.push({ id: `keyword-${row.request_id}-${row.term}`, type: "Palavra-chave do protocolo", title: row.term, detail: row.language, href: `/painel/atendimento/${row.request_id}` });
  for (const row of programs.data ?? []) results.push({ id: `program-${row.id}`, type: "Programa e SLA", title: `${row.code} · ${row.name}`, detail: `Prazo: ${row.service_level_business_days} dias úteis`, href: adminTabHref("operacao", "programs") });
  for (const row of programSettings.data ?? []) if (normalizeSearch(JSON.stringify(row)).includes(normalizeSearch(term)) && !results.some((item) => item.id === `program-${row.id}`)) results.push({ id: `program-setting-${row.id}`, type: "Configuração de programa", title: row.name, detail: `Código ${row.code} · SLA ${row.service_level_business_days} dias úteis`, href: adminTabHref("operacao", "programs") });
  for (const row of terms.data ?? []) results.push({ id: `term-${row.id}`, type: "Assunto", title: row.preferred_label_pt, detail: row.preferred_label_en ?? "Vocabulário controlado", href: adminTabHref("conteudo", "subjects") });
  for (const row of cdu.data ?? []) results.push({ id: `cdu-${row.cdu_code}`, type: "Catálogo CDU", title: row.cdu_code, detail: row.description, href: adminTabHref("conteudo", "cdu") });
  for (const row of notices.data ?? []) results.push({ id: `notice-${row.id}`, type: "Calendário e mural", title: row.title, detail: row.message, href: adminTabHref("operacao", "library") });
  for (const row of datedNotices.data ?? []) results.push({ id: `dated-notice-${row.id}`, type: "Data do calendário", title: row.title, detail: `${date} · ${row.message}`, href: adminTabHref("operacao", "library") });
  for (const row of hours.data ?? []) results.push({ id: `hours-${row.service_date}`, type: "Funcionamento", title: row.service_date, detail: `Fechamento às ${row.closing_time}`, href: adminTabHref("operacao", "library") });
  for (const row of people.data ?? []) results.push({ id: `person-${row.id}`, type: "Conta", title: row.full_name, detail: `${row.email} · ${row.status}`, href: adminTabHref("operacao", "users") });
  for (const row of help.data ?? []) results.push({ id: `help-${row.id}`, type: "Ajuda e FAQ", title: row.title, detail: row.summary ?? "", href: adminTabHref("conteudo", "faq") });
  for (const row of templates.data ?? []) results.push({ id: `template-${row.id}`, type: "Modelo de resposta", title: row.label, detail: row.message, href: adminTabHref("conteudo", "service") });
  for (const row of coordination.data ?? []) results.push({ id: `coordination-${row.id}`, type: "Coordenação", title: row.name, detail: row.email, href: adminTabHref("operacao", "programs") });
  for (const row of sla.data ?? []) results.push({ id: `sla-${row.id}`, type: "SLA", title: `${row.business_days} dias úteis`, detail: "Configuração de prazo", href: adminTabHref("operacao", "programs") });
  for (const row of audit.data ?? []) results.push({ id: `audit-${row.id}`, type: "Auditoria", title: row.action, detail: `${row.entity_type} · ${row.entity_id ?? ""}`, href: adminTabHref("controle", "audit") });
  for (const row of retention.data ?? []) results.push({ id: `retention-${row.id}`, type: "Arquivos e retenção", title: row.original_name, detail: `Prazo: ${row.purge_after}`, href: adminTabHref("controle", "retention") });
  for (const row of enrollments.data ?? []) for (const request of row.cataloging_requests ?? []) results.push({ id: `registration-${row.id}-${request.id}`, type: "Matrícula do protocolo", title: row.registration_number, detail: request.protocol, href: `/painel/atendimento/${request.id}` });
  for (const row of permissionDefinitions.data ?? []) results.push({ id: `permission-${row.code}`, type: "Permissão", title: row.action, detail: `${row.code} · ${row.description}`, href: adminTabHref("operacao", "permissions") });
  if (normalizeSearch(`${profile.full_name} ${profile.email}`).includes(normalizeSearch(term))) results.push({ id: "own-account", type: "Minha conta", title: profile.full_name, detail: profile.email, href: "/painel/conta" });
  if (staffAccount.data && normalizeSearch(`${staffAccount.data.crb} ${staffAccount.data.professional_name} ${staffAccount.data.birthday_day}/${staffAccount.data.birthday_month}`).includes(normalizeSearch(term))) results.push({ id: "own-staff-account", type: "Minha conta", title: staffAccount.data.professional_name, detail: `CRB ${staffAccount.data.crb}`, href: "/painel/conta" });
  for (const section of adminSections) for (const tab of section.tabs) if (canOpenAdminTab(tab.id, adminPermissions) && normalizeSearch(`${tab.label} ${tab.description}`).includes(normalizeSearch(term))) results.push({ id: `setting-${tab.id}`, type: "Configuração", title: tab.label, detail: tab.description, href: adminTabHref(section.area, tab.id) });
  return Response.json({ results: results.slice(0, 32) }, { headers: { "Cache-Control": "private, no-store" } });
}
