"use client";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { adminSections, adminTabHref, canOpenAdminTab, type AdminArea } from "@/lib/admin-navigation";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { KnowledgeBaseAdmin, type KnowledgeEntry } from "./knowledge-base-admin";
import { CduCatalogAdmin } from "./cdu-catalog-admin";
import { ControlledTermsAdmin } from "./controlled-terms-admin";
import { AppIcon, type AppIconName } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";
import { formatLibraryHour, isLibraryClosureAnnouncement, serviceDayKey } from "@/lib/service-announcements";
import { StaffPermissionsAdmin, type PermissionDefinition, type PermissionOverride, type InheritedRole } from "./staff-permissions-admin";
import { DailyClosingControl } from "./daily-closing-control";
import { issueTemplateFields } from "@/lib/issue-template-fields";
import { readableAuditAction, readableAuditEntity } from "@/lib/audit-labels";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  staff_profiles: StaffProfile[] | StaffProfile | null;
  student_profiles: { birth_date: string | null }[];
};
type StaffProfile = { professional_name: string; crb: string };
const adminTabScrollKey = "pronto-admin-tab-scroll";
function firstStaffProfile(value: User["staff_profiles"]): StaffProfile | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}
type StaffCandidate = { user_id: string; email: string };
type Program = {
  id: string;
  name: string;
  level: string;
  service_level_business_days: number;
  repository_deposit_enabled: boolean;
  coordination_magic_link_enabled: boolean;
  coordination_contacts: { name: string; email: string; active: boolean }[];
};
type Announcement = {
  id: string;
  type: string;
  title: string;
  message: string;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
  calendar_source?: "manual" | "federal_mgi";
  source_reference?: string | null;
};
type DailyHours = { service_date: string; closing_time: string };
type Template = {
  id: string;
  code: string;
  label: string;
  message: string;
  active: boolean;
  position: number;
  field_keys: string[];
};
function TemplateFieldChoices({ selected, disabled = false }: { selected: string[]; disabled?: boolean }) {
  return <fieldset className="admin-template__field-choices" disabled={disabled}><legend>Campos de metadados associados</legend><p className="field-help">O modelo aparecerá apenas ao pedir ajuste nestes campos.</p><div>{issueTemplateFields.map((field) => <label key={field.key}><input type="checkbox" name="field_keys" value={field.key} defaultChecked={selected.includes(field.key)} />{field.label}</label>)}</div></fieldset>;
}
type Relation<T> = T[] & Partial<T>;
type Log = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
  profiles: Relation<{ full_name: string }> | null;
};
type Purge = {
  id: string;
  request_id: string;
  object_path: string;
  purge_after: string;
  cataloging_requests: Relation<{ protocol: string }> | null;
};
type StatItem = { id?: string | null; label: string; count: number };
type Stats = {
  total: number;
  by_status: StatItem[];
  by_program: StatItem[];
  by_staff: StatItem[];
  records: Record<string, unknown>[];
};
const roleLabels: Record<string, string> = {
  student: "Estudante",
  cataloger: "Catalogador",
  administrator: "Administrador",
};
const academicLevelLabels: Record<string, string> = {
  undergraduate: "Graduação",
  specialization: "Especialização",
  master: "Mestrado",
  doctorate: "Doutorado",
};
const statusLabels: Record<string, string> = {
  active: "Ativa",
  blocked: "Bloqueada",
  inactive: "Inativa",
};
const indicatorStatusLabels: Record<string, string> = {
  submitted: "Aguardando responsável", in_review: "Em análise", changes_requested: "Correção solicitada",
  approved: "Aprovadas", completed: "Encerradas", canceled: "Canceladas",
};
const indicatorDateLabel = (day: string) => day ? day.split("-").reverse().join("/") : "";
const salvadorDateTime = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function announcementInputDate(value: string | null | undefined) {
  if (!value) return "";
  if (!value.endsWith("Z") && !/[+-]\d\d:\d\d$/.test(value)) return value.slice(0, 16);
  const parts = Object.fromEntries(salvadorDateTime.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function PeriodField({ name, label, value, optional = false }: { name: "starts" | "ends"; label: string; value?: string | null; optional?: boolean }) {
  const initial = announcementInputDate(value);
  const [allDay, setAllDay] = useState(() => name === "starts" ? initial.endsWith("T00:00") : initial.endsWith("T23:59"));
  const [date, setDate] = useState(initial.slice(0, 10));
  const [time, setTime] = useState(initial.slice(11, 16) || (name === "starts" ? "08:00" : "18:00"));
  return <div className="calendar-editor__period"><label htmlFor={`calendar-${name}`}>{label}</label><div className="calendar-editor__period-controls"><input id={`calendar-${name}`} type="date" required={!optional} value={date} onChange={(event) => setDate(event.target.value)} /><input type="hidden" name={name} value={date ? allDay ? date : `${date}T${time}` : ""} />{!allDay && <input className="calendar-editor__time" type="time" aria-label={`Horário de ${name === "starts" ? "início" : "fim"}`} required={Boolean(date)} value={time} onChange={(event) => setTime(event.target.value)} />}<label className="calendar-editor__all-day"><input type="checkbox" name={`${name}_all_day`} checked={allDay} onChange={(event) => setAllDay(event.target.checked)} /><span>Dia todo</span></label></div></div>;
}
function announcementColorCategory(item: Announcement) {
  if (item.calendar_source === "federal_mgi" && item.type === "holiday") return "holiday";
  if (item.calendar_source === "federal_mgi" && item.type === "optional_day") return "optional";
  return isLibraryClosureAnnouncement(item) ? "manual" : "notice";
}

export function AdminOperations(props: {
  area: AdminArea;
  tab: string;
  depositFollowup?: ReactNode;
  users: User[];
  staffCandidates: StaffCandidate[];
  programs: Program[];
  announcements: Announcement[];
  dailyHours: DailyHours[];
  templates: Template[];
  templateFieldsReady?: boolean;
  logs: Log[];
  purgeDocuments: Purge[];
  knowledge: KnowledgeEntry[];
  initialKnowledgeId?: string;
  initialKnowledgeLanguage?: "pt" | "en" | "es" | "de" | "fr" | "it";
  cduEntries: ComponentProps<typeof CduCatalogAdmin>["entries"];
  permissionDefinitions: PermissionDefinition[];
  permissionOverrides: PermissionOverride[];
  inheritedRoles: InheritedRole[];
  canViewCalendar: boolean;
  grantedPermissions: string[];
  delegatedCalendarOnly?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [busy, setBusy] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsPeriod, setStatsPeriod] = useState({ start: "", end: "" });
  const [appliedStatsPeriod, setAppliedStatsPeriod] = useState({ start: "", end: "" });
  const [users, setUsers] = useState(props.users);
  const [programs, setPrograms] = useState(props.programs);
  const [purge, setPurge] = useState(props.purgeDocuments);
  const [announcements, setAnnouncements] = useState(props.announcements);
  const [dailyHours, setDailyHours] = useState(props.dailyHours);
  const [closingDate, setClosingDate] = useState(() => serviceDayKey(new Date()));
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementType, setAnnouncementType] = useState("all");
  const [announcementActivity, setAnnouncementActivity] = useState("all");
  const [announcementSort, setAnnouncementSort] = useState<{ column: "date" | "title" | "type" | "origin" | "status"; direction: "asc" | "desc" }>({ column: "date", direction: "asc" });
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const calendarFormRef = useRef<HTMLFormElement>(null);
  const scrollToCalendarForm = () => window.requestAnimationFrame(() => calendarFormRef.current?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  }));
  const activeTab = props.tab;
  const adminTabsRef = useRef<HTMLDivElement>(null);
  const [tabOverflow, setTabOverflow] = useState({ start: false, end: false });
  const router = useRouter();
  const [userType, setUserType] = useState("all");
  const [userStatus, setUserStatus] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditAction, setAuditAction] = useState("all");
  const [programSearch, setProgramSearch] = useState("");
  const [programLevel, setProgramLevel] = useState("all");
  const [programGuide, setProgramGuide] = useState("all");
  const supabase = createClient();
  const runVerified = async (
    key: string,
    job: () => PromiseLike<{ error: unknown }>,
    verify: () => Promise<boolean>,
    ok: string,
  ) => {
    setBusy(key);
    setMessage("");
    const { error } = await job();
    const saved = !error && (await verify());
    setMessage(
      saved
        ? ok
        : "Não foi possível confirmar o salvamento. Confira os dados e tente novamente.",
    );
    setBusy("");
    return saved;
  };
  useEffect(() => {
    if (!message) return;
    if (message.startsWith("Não ")) showPanelChangeError("Alteração não salva", "Confira os dados e tente novamente. Se continuar, atualize a página.");
    else if (/salv|alterad|corrigid|atualizad|excluíd|registrad|criad|removid|confirmad/i.test(message)) showPanelChange(message);
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  async function saveUser(user: User, form: FormData) {
    const role = String(form.get("role"));
    const status = String(form.get("status"));
    const professionalName = user.full_name;
    const crb = String(form.get("crb") ?? "").trim();
    setBusy(`u-${user.id}`);
    setMessage("");
    const { error } = await supabase.rpc("admin_manage_account", {
      target_profile_id: user.id,
      target_role: role,
      target_status: status,
      professional_name: professionalName,
      professional_crb: crb,
    });
    const { data: saved, error: readError } = error
      ? { data: null, error: true }
      : await supabase
          .from("profiles")
          .select("role,status,staff_profiles(professional_name,crb)")
          .eq("id", user.id)
          .single();
    const staff = firstStaffProfile(saved?.staff_profiles ?? null);
    const confirmed =
      !readError &&
      saved?.role === role &&
      saved.status === status &&
      (role === "student" ||
        Boolean(
          staff &&
          staff.professional_name === professionalName &&
          staff.crb === crb,
        ));
    if (confirmed) {
      setUsers((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                role,
                status,
                staff_profiles:
                  role === "student"
                    ? []
                    : [{ professional_name: professionalName, crb }],
              }
            : item,
        ),
      );
      showPanelChange("Alterações da conta salvas", async () => {
        const previousStaff = firstStaffProfile(user.staff_profiles);
        const { error: undoError } = await supabase.rpc("admin_manage_account", {
          target_profile_id: user.id,
          target_role: user.role,
          target_status: user.status,
          professional_name: previousStaff?.professional_name ?? "",
          professional_crb: previousStaff?.crb ?? "",
        });
        if (undoError) throw undoError;
        setUsers((current) => current.map((item) => item.id === user.id ? user : item));
      });
    } else
      setMessage(
        "Não foi possível confirmar o salvamento. Confira os dados e tente novamente.",
      );
    setBusy("");
  }
  async function correctBirthDate(user: User, form: FormData) {
    const birthDate = String(form.get("birth_date") ?? "");
    if (birthDate === user.student_profiles?.[0]?.birth_date) {
      setMessage("Informe uma data diferente da atual para registrar a correção.");
      return;
    }
    setBusy(`birth-${user.id}`);
    setMessage("");
    const { error } = await supabase.rpc("admin_correct_student_birth_date", {
      target_profile_id: user.id,
      target_birth_date: birthDate,
    });
    const { data: saved, error: readError } = error
      ? { data: null, error: true }
      : await supabase.from("student_profiles").select("birth_date").eq("profile_id", user.id).single();
    if (!readError && saved?.birth_date === birthDate) {
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, student_profiles: [{ birth_date: birthDate }] } : item));
      setMessage("Data de nascimento corrigida e confirmada no banco de dados.");
    } else setMessage("Não foi possível confirmar a correção da data de nascimento.");
    setBusy("");
  }
  async function provision(form: FormData) {
    const id = String(form.get("id"));
    const fullName = String(form.get("full_name"));
    const professionalName = fullName;
    const crb = String(form.get("crb"));
    const role = String(form.get("role"));
    await runVerified(
      "provision",
      () =>
        supabase.rpc("provision_staff_account", {
          target_user_id: id,
          staff_full_name: fullName,
          staff_professional_name: professionalName,
          staff_crb: crb,
          staff_role: role,
        }),
      async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name,role,status,staff_profiles(professional_name,crb)")
          .eq("id", id)
          .single();
        const staff = firstStaffProfile(data?.staff_profiles ?? null);
        return (
          !error &&
          data?.full_name === fullName &&
          data.role === role &&
          data.status === "active" &&
          staff?.professional_name === professionalName &&
          staff.crb === crb
        );
      },
      "Conta provisionada e confirmada no banco de dados.",
    );
  }
  async function saveProgram(program: Program, form: FormData) {
    const sla = Number(form.get("sla"));
    const repository = form.get("repository") === "on";
    const coordination = form.get("coordination") === "on";
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const persisted: { value: Pick<Program, "service_level_business_days" | "repository_deposit_enabled" | "coordination_magic_link_enabled" | "coordination_contacts"> | null } = { value: null };
    const saved = await runVerified(
      `p-${program.id}`,
      () =>
        supabase.rpc("admin_configure_program", {
          target_program_id: program.id,
          sla_business_days: sla,
          repository_enabled: repository,
          coordination_enabled: coordination,
          contact_name: name,
          contact_email: email,
        }),
      async () => {
        const { data, error } = await supabase
          .from("academic_programs")
          .select(
            "service_level_business_days,repository_deposit_enabled,coordination_magic_link_enabled,coordination_contacts(name,email,active)",
          )
          .eq("id", program.id)
          .single();
        const contact = data?.coordination_contacts?.find(
          (item) => item.active,
        );
        const matches = (
          !error &&
          data?.service_level_business_days === sla &&
          data.repository_deposit_enabled === repository &&
          data.coordination_magic_link_enabled === coordination &&
          (!coordination ||
            Boolean(
              contact && contact.name === name && contact.email === email,
            ))
        );
        if (matches && data) persisted.value = data;
        return matches;
      },
      "Alterações do programa salvas e confirmadas no banco de dados.",
    );
    const savedValues = persisted.value;
    if (saved && savedValues) setPrograms((current) => current.map((item) => item.id === program.id ? { ...item, ...savedValues } : item));
  }
  async function saveAnnouncement(form: FormData) {
    const type = String(form.get("type"));
    const title = String(form.get("title"));
    const messageText = String(form.get("message"));
    const startValue = String(form.get("starts") ?? "");
    const endValue = String(form.get("ends") ?? "");
    if (!startValue) { setMessage("Informe o início da ocorrência."); return; }
    const startAllDay = form.get("starts_all_day") === "on";
    const endAllDay = form.get("ends_all_day") === "on";
    const startsAt = new Date(`${startValue}${startAllDay ? "T00:00:00.000" : ":00"}-03:00`).toISOString();
    const endsAt = endValue ? new Date(`${endValue}${endAllDay ? "T23:59:59.999" : ":00"}-03:00`).toISOString()
      : startAllDay && !["recess", "strike"].includes(type) ? new Date(`${startValue}T23:59:59.999-03:00`).toISOString() : null;
    if (endsAt && endsAt < startsAt) { setMessage("O fim do período precisa ser posterior ao início."); return; }
    const active = form.get("active") === "on";
    setBusy("announcement");
    setMessage("");
    const { data: id, error } = await supabase.rpc("admin_save_announcement", {
      announcement_id: editingAnnouncement?.id || null,
      announcement_type: type,
      announcement_title: title,
      announcement_message: messageText,
      starts_at: startsAt,
      ends_at: endsAt,
      enabled: active,
    });
    const { data: saved, error: readError } =
      error || !id
        ? { data: null, error: true }
        : await supabase
            .from("library_announcements")
            .select("id,type,title,message,starts_at,ends_at,active")
            .eq("id", String(id))
            .single();
    if (!readError && saved) {
      setAnnouncements((current) =>
        editingAnnouncement?.id
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setEditingAnnouncement(null);
      setMessage("Aviso salvo e confirmado no banco de dados.");
    } else
      setMessage(
        "Não foi possível confirmar o salvamento. Confira os dados e tente novamente.",
      );
    setBusy("");
  }
  async function deleteAnnouncement(announcement: Announcement) {
    setBusy(`a-${announcement.id}`);
    const { error } = await supabase
      .from("library_announcements")
      .delete()
      .eq("id", announcement.id);
    if (!error) {
      setAnnouncements((current) =>
        current.filter((item) => item.id !== announcement.id),
      );
      if (editingAnnouncement?.id === announcement.id)
        setEditingAnnouncement(null);
      setAnnouncementToDelete(null);
      setMessage("Aviso excluído.");
    } else setMessage("Não foi possível excluir o aviso.");
    setBusy("");
  }
  const isEditingAnnouncement = Boolean(editingAnnouncement?.id);
  function sortAnnouncements(column: typeof announcementSort.column) {
    setAnnouncementSort((current) => ({ column, direction: current.column === column && current.direction === "asc" ? "desc" : "asc" }));
  }
  const visibleAnnouncements = announcements.filter((item) =>
    (announcementType === "all" || item.type === announcementType) &&
    (announcementActivity === "all" || (announcementActivity === "active") === item.active) &&
    `${item.title} ${item.message}`.toLocaleLowerCase("pt-BR").includes(announcementSearch.toLocaleLowerCase("pt-BR")),
  ).sort((first, second) => {
    const value = (item: Announcement) => announcementSort.column === "date" ? item.starts_at : announcementSort.column === "title" ? item.title : announcementSort.column === "type" ? item.type : announcementSort.column === "origin" ? item.calendar_source === "federal_mgi" ? "federal" : "biblioteca" : item.active ? "ativo" : "inativo";
    const comparison = announcementSort.column === "date" ? value(first).localeCompare(value(second)) : value(first).localeCompare(value(second), "pt-BR", { sensitivity: "base" });
    return (comparison || first.starts_at.localeCompare(second.starts_at) || first.id.localeCompare(second.id)) * (announcementSort.direction === "asc" ? 1 : -1);
  });
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const formatNumericDate = (value: string) => {
    const [year, month, day] = serviceDayKey(value).split("-");
    return `${day}/${month}/${year}`;
  };
  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const eventsForDay = (day: number) => {
    const date = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return announcements.filter((item) => item.active && serviceDayKey(item.starts_at) <= date && (item.ends_at ? date <= serviceDayKey(item.ends_at) : ["recess", "strike"].includes(item.type) || serviceDayKey(item.starts_at) === date));
  };
  function addClosure(day: number) {
    setSelectedCalendarDay(day);
    const date = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setClosingDate(date);
    const existing = eventsForDay(day)[0];
    if (existing) { setEditingAnnouncement(existing); scrollToCalendarForm(); return; }
    const value = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00`;
    setEditingAnnouncement({ id: "" as string, type: "closure", title: "", message: "Biblioteca sem funcionamento.", starts_at: value, ends_at: null, active: true, calendar_source: "manual" });
    scrollToCalendarForm();
  }
  async function saveTemplate(template: Template, form: FormData) {
    const label = String(form.get("label"));
    const messageText = String(form.get("message"));
    const active = form.get("active") === "on";
    const position = Number(form.get("position"));
    const fieldKeys = form.getAll("field_keys").map(String);
    if (props.templateFieldsReady && !fieldKeys.length) { setMessage("Selecione ao menos um campo de metadados."); return; }
    const saved = await runVerified(
      `t-${template.id}`,
      () => props.templateFieldsReady
        ? supabase.rpc("admin_save_issue_template", {
          target_template_id: template.id,
          template_label: label,
          template_message: messageText,
          template_field_keys: fieldKeys,
          enabled: active,
          template_position: position,
        }) : supabase.rpc("admin_update_issue_template", {
          target_template_id: template.id, template_label: label,
          template_message: messageText, enabled: active, template_position: position,
        }),
      async () => {
        const { data, error } = await supabase
          .from("issue_templates")
          .select(props.templateFieldsReady ? "label,message,active,position,field_keys" : "label,message,active,position")
          .eq("id", template.id)
          .single();
        const savedTemplate = data as unknown as { label: string; message: string; active: boolean; position: number; field_keys?: string[] } | null;
        return (
          !error &&
          savedTemplate?.label === label &&
          savedTemplate.message === messageText &&
          savedTemplate.active === active &&
          savedTemplate.position === position &&
          (!props.templateFieldsReady || (fieldKeys.length === savedTemplate.field_keys?.length && fieldKeys.every((key) => savedTemplate.field_keys?.includes(key))))
        );
      },
      "Template salvo e confirmado no banco de dados.",
    );
    if (saved) router.refresh();
  }
  async function createTemplate(form: FormData) {
    const label = String(form.get("label") ?? "").trim();
    const messageText = String(form.get("message") ?? "").trim();
    const fieldKeys = form.getAll("field_keys").map(String);
    if (!fieldKeys.length) { setMessage("Selecione ao menos um campo de metadados."); return; }
    let newId = "";
    const saved = await runVerified("t-new", async () => {
      const result = await supabase.rpc("admin_save_issue_template", {
        target_template_id: null, template_label: label, template_message: messageText,
        template_field_keys: fieldKeys, enabled: true,
        template_position: Math.max(0, ...props.templates.map((item) => item.position)) + 10,
      });
      newId = String(result.data ?? "");
      return result;
    }, async () => {
      if (!newId) return false;
      const { data, error } = await supabase.from("issue_templates").select("label,message,field_keys").eq("id", newId).single();
      return !error && data?.label === label && data.message === messageText && fieldKeys.length === data.field_keys?.length && fieldKeys.every((key) => data.field_keys.includes(key));
    }, "Modelo criado e confirmado no banco de dados.");
    if (saved) { setCreatingTemplate(false); router.refresh(); }
  }
  async function loadStats(form: FormData) {
    const startDay = String(form.get("start") ?? "");
    const endDay = String(form.get("end") ?? "");
    if (startDay && endDay && startDay > endDay) { setMessage("A data inicial deve ser anterior ou igual à final."); return; }
    setBusy("stats");
    const start = startDay ? new Date(`${startDay}T00:00:00-03:00`).toISOString() : null;
    const end = endDay ? new Date(new Date(`${endDay}T00:00:00-03:00`).getTime() + 86_400_000).toISOString() : null;
    const { data, error } = await supabase.rpc("admin_statistics", {
      period_start: start,
      period_end: end,
    });
    setStats(error ? null : (data as Stats));
    if (!error) setAppliedStatsPeriod({ start: startDay, end: endDay });
    setMessage(
      error
        ? "Não foi possível calcular os indicadores."
        : "Indicadores atualizados.",
    );
    setBusy("");
  }
  function download(format: "json" | "csv") {
    if (!stats) return;
    let body: string, mime: string, name: string;
    if (format === "json") {
      body = JSON.stringify(stats.records, null, 2);
      mime = "application/json";
      name = "pronto-solicitacoes.json";
    } else {
      const keys = ["protocol", "status", "submitted_at", "program", "staff"];
      body = [
        keys.join(","),
        ...stats.records.map((r) =>
          keys
            .map((k) => `"${String(r[k] ?? "").replaceAll('"', '""')}"`)
            .join(","),
        ),
      ].join("\n");
      mime = "text/csv;charset=utf-8";
      name = "pronto-solicitacoes.csv";
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([body], { type: mime }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function purgeFile(doc: Purge) {
    setBusy(`x-${doc.id}`);
    const removed = await supabase.storage
      .from("nada-consta")
      .remove([doc.object_path]);
    if (removed.error) {
      setMessage("O arquivo não pôde ser removido do Storage.");
      setBusy("");
      return;
    }
    const { error } = await supabase.rpc("admin_confirm_nada_consta_purge", {
      target_document_id: doc.id,
    });
    const { data: saved, error: readError } = error
      ? { data: null, error: true }
      : await supabase
          .from("nada_consta_documents")
          .select("object_path,status,purged_at")
          .eq("id", doc.id)
          .single();
    if (
      readError ||
      saved?.object_path !== null ||
      saved.status !== "purged" ||
      !saved.purged_at
    )
      setMessage(
        "Arquivo removido, mas o expurgo não foi confirmado no banco de dados.",
      );
    else {
      setPurge((v) => v.filter((x) => x.id !== doc.id));
      setMessage("Expurgo salvo e confirmado no banco de dados.");
    }
    setBusy("");
  }
  const filteredUsers = users.filter(
    (user) =>
      (userType === "all" ||
        (userType === "student"
          ? user.role === "student"
          : user.role !== "student")) &&
      (userStatus === "all" || user.status === userStatus),
  ).filter((user) => `${user.full_name} ${user.email}`.toLocaleLowerCase("pt-BR").includes(userSearch.trim().toLocaleLowerCase("pt-BR")));
  const filteredPrograms = programs.filter((program) =>
    `${program.name} ${program.level} ${academicLevelLabels[program.level] ?? ""}`.toLocaleLowerCase("pt-BR").includes(programSearch.trim().toLocaleLowerCase("pt-BR")) &&
    (programLevel === "all" || program.level === programLevel) &&
    (programGuide === "all" || program.repository_deposit_enabled === (programGuide === "enabled"))
  );
  const programLevels = [...new Set(programs.map((program) => program.level))];
  const filteredLogs = props.logs.filter((log) =>
    (auditAction === "all" || log.action === auditAction) &&
    `${readableAuditAction(log.action)} ${log.action} ${log.profiles?.full_name ?? "Sistema"} ${log.entity_type} ${log.entity_id ?? ""}`.toLocaleLowerCase("pt-BR").includes(auditSearch.trim().toLocaleLowerCase("pt-BR"))
  );
  const auditActions = [...new Set(props.logs.map((log) => log.action))].sort((a, b) => readableAuditAction(a).localeCompare(readableAuditAction(b), "pt-BR"));
  const adminTabs = (adminSections.find((section) => section.area === props.area)?.tabs ?? adminSections[0].tabs).filter((tab) => canOpenAdminTab(tab.id, props.grantedPermissions));
  useLayoutEffect(() => {
    const tabs = adminTabsRef.current;
    if (!tabs) return;
    const centerSelected = (behavior: ScrollBehavior) => {
      if (!window.matchMedia("(max-width: 560px)").matches) return;
      const buttons = tabs.querySelectorAll<HTMLElement>('[role="tab"]');
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first || !last) return;
      tabs.style.setProperty("--tab-edge-start", `${Math.max(0, (tabs.clientWidth - first.offsetWidth) / 2 - 6)}px`);
      tabs.style.setProperty("--tab-edge-end", `${Math.max(0, (tabs.clientWidth - last.offsetWidth) / 2 - 6)}px`);
      const selected = tabs.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!selected) return;
      const tabsBounds = tabs.getBoundingClientRect();
      const selectedBounds = selected.getBoundingClientRect();
      const centered = tabs.scrollLeft + selectedBounds.left + selectedBounds.width / 2 - tabsBounds.left - tabsBounds.width / 2;
      const left = Math.max(0, Math.min(centered, tabs.scrollWidth - tabs.clientWidth));
      if (Math.abs(left - tabs.scrollLeft) > 2) tabs.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : behavior });
    };
    const updateOverflow = () => {
      const start = tabs.scrollLeft > 2;
      const end = tabs.scrollLeft < tabs.scrollWidth - tabs.clientWidth - 2;
      setTabOverflow((current) => current.start === start && current.end === end ? current : { start, end });
    };
    let transition: { area: AdminArea; target: string; left: number } | null = null;
    try { transition = JSON.parse(sessionStorage.getItem(adminTabScrollKey) ?? "null"); sessionStorage.removeItem(adminTabScrollKey); } catch { /* Navegação continua sem animação pendente. */ }
    const continuing = transition?.area === props.area && transition.target === activeTab;
    if (continuing && transition) tabs.scrollLeft = transition.left;
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(tabs);
    tabs.addEventListener("scroll", updateOverflow, { passive: true });
    const frame = window.requestAnimationFrame(() => {
      centerSelected(continuing ? "smooth" : "instant");
      updateOverflow();
    });
    return () => { window.cancelAnimationFrame(frame); resizeObserver.disconnect(); tabs.removeEventListener("scroll", updateOverflow); };
  }, [activeTab, props.area, adminTabs.length]);
  const navigateAdminTab = (id: string) => {
    if (id === activeTab) return;
    try { sessionStorage.setItem(adminTabScrollKey, JSON.stringify({ area: props.area, target: id, left: adminTabsRef.current?.scrollLeft ?? 0 })); } catch { /* Navegação continua sem animação pendente. */ }
    router.push(adminTabHref(props.area, id), { scroll: false });
  };
  const selectAdjacentAdminTab = (direction: -1 | 1) => {
    const index = adminTabs.findIndex((tab) => tab.id === activeTab);
    const next = adminTabs[index + direction];
    if (next) navigateAdminTab(next.id);
  };
  const managePermission: Record<string, string> = { users: "admin.accounts.manage", permissions: "admin.permissions.manage", programs: "admin.programs.manage", library: "library.calendar.manage", service: "admin.service.manage", retention: "admin.retention.manage", faq: "admin.knowledge.manage", cdu: "admin.cdu.manage", subjects: "admin.subjects.manage" };
  const readOnly = activeTab !== "users" && Boolean(managePermission[activeTab] && !props.grantedPermissions.includes(managePermission[activeTab]) && !(activeTab === "faq" && props.grantedPermissions.includes("admin.faq.manage")));
  useEffect(() => {
    const section = [...document.querySelectorAll<HTMLElement>(`.admin-operations[data-active-tab="${activeTab}"] > .admin-section`)]
      .find((item) => getComputedStyle(item).display !== "none");
    if (!section) return;
    section.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>("form input, form button, form select, form textarea").forEach((control) => {
      control.disabled = readOnly;
    });
  }, [activeTab, readOnly]);
  return (
    <div className="admin-operations" data-active-tab={activeTab} data-delegated-calendar={props.delegatedCalendarOnly ? "true" : undefined}>
      {message && !message.startsWith("Não ") && !/salv|alterad|corrigid|atualizad|excluíd|registrad|criad|removid|confirmad/i.test(message) && (
        <p className="auth-feedback admin-toast" role="status">
          {message}
        </p>
      )}
      <div className="admin-tabs-shell" data-overflow-start={tabOverflow.start} data-overflow-end={tabOverflow.end}>
        <div className="admin-tabs" ref={adminTabsRef} role="tablist" aria-label="Seções da área selecionada" onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); selectAdjacentAdminTab(event.key === "ArrowLeft" ? -1 : 1); } }}>
          {adminTabs.map(({ id, label, icon }) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={activeTab === id ? "is-active" : ""}
              onClick={() => navigateAdminTab(id)}
              key={id}
            >
              <AppIcon name={icon} />
              {label}
            </button>
          ))}
        </div>
        <button className="admin-tabs-shell__arrow admin-tabs-shell__arrow--start" type="button" aria-label="Selecionar guia anterior" title="Selecionar guia anterior" disabled={adminTabs[0]?.id === activeTab} onClick={() => selectAdjacentAdminTab(-1)}><AppIcon name="arrowRight" /></button>
        <button className="admin-tabs-shell__arrow admin-tabs-shell__arrow--end" type="button" aria-label="Selecionar próxima guia" title="Selecionar próxima guia" disabled={adminTabs[adminTabs.length - 1]?.id === activeTab} onClick={() => selectAdjacentAdminTab(1)}><AppIcon name="arrowRight" /></button>
      </div>
      {readOnly && <p className="auth-feedback" role="status">Acesso de consulta: as alterações desta área exigem permissão específica.</p>}
      <section className="panel admin-section">
        <div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="account" /></span><div><p className="eyebrow">Gestão de pessoas</p><h2>Diretório e provisionamento</h2><p>Consulte a situação das pessoas e ajuste o acesso. Bloqueio e inativação interrompem o acesso imediatamente.</p></div></div>
        <SectionStats items={[{ icon: "account", value: users.length, label: "contas cadastradas" }, { icon: "book", value: users.filter((user) => user.role === "student").length, label: "estudantes" }, { icon: "shield", value: users.filter((user) => user.role !== "student").length, label: "equipe" }, { icon: "lock", value: users.filter((user) => user.status !== "active").length, label: "sem acesso", detail: "Bloqueadas ou inativas" }]} />
        {props.grantedPermissions.includes("admin.accounts.provision") && <p className="admin-section__hint"><AppIcon name="help" />Para incluir alguém na equipe, crie e confirme primeiro a conta institucional no Supabase. Ela aparecerá na seleção abaixo.</p>}
        {props.grantedPermissions.includes("admin.accounts.provision") && <div className="admin-section__subhead"><div><p className="eyebrow">Equipe</p><h3>Provisionar conta institucional</h3></div><span>{props.staffCandidates.length} conta{props.staffCandidates.length === 1 ? "" : "s"} disponível{props.staffCandidates.length === 1 ? "" : "eis"}</span></div>}
        {props.grantedPermissions.includes("admin.accounts.provision") && <form className="admin-grid admin-provision" action={provision}>
          <label>
            Conta institucional
            <select name="id" required defaultValue="">
              <option value="" disabled>
                {props.staffCandidates.length
                  ? "Selecione uma conta confirmada"
                  : "Nenhuma conta disponível"}
              </option>
              {props.staffCandidates.map((candidate) => (
                <option key={candidate.user_id} value={candidate.user_id}>
                  {candidate.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nome completo
            <input name="full_name" required />
          </label>
          <label>
            CRB
            <input name="crb" required />
          </label>
          <label>
            Perfil
            <select name="role">
              <option value="cataloger">Catalogador</option>
              <option value="administrator">Administrador</option>
            </select>
          </label>
          <button
            className="button button--primary button--small"
            disabled={
              busy === "provision" || props.staffCandidates.length === 0
            }
          >
            Provisionar equipe
          </button>
        </form>}
        <div className="admin-section__subhead"><div><p className="eyebrow">Diretório</p><h3>Contas e situação de acesso</h3></div><span>{filteredUsers.length} de {users.length} contas</span></div>
        <div className="admin-user-filters">
          <label>Buscar conta<input type="search" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Nome ou e-mail" /></label>
          <label>
            Tipo de conta
            <select
              value={userType}
              onChange={(event) => setUserType(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="student">Estudantes</option>
              <option value="staff">Bibliotecários</option>
            </select>
          </label>
          <label>
            Situação
            <select
              value={userStatus}
              onChange={(event) => setUserStatus(event.target.value)}
            >
              <option value="all">Todas</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-list">
          {filteredUsers.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              busy={busy === `u-${user.id}`}
              onSave={saveUser}
              birthBusy={busy === `birth-${user.id}`}
              onCorrectBirthDate={correctBirthDate}
              canManage={props.grantedPermissions.includes("admin.accounts.manage")}
            />
          ))}
          {filteredUsers.length === 0 && <p className="admin-empty-state"><AppIcon name="search" />Nenhuma conta corresponde aos filtros. Ajuste a busca, o tipo ou a situação.</p>}
        </div>
      </section>
      <section className="panel admin-section admin-section--permissions">
        <StaffPermissionsAdmin users={users} definitions={props.permissionDefinitions} initialOverrides={props.permissionOverrides} initialRoles={props.inheritedRoles} />
      </section>
      <section className="panel admin-section">
        <div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="settings" /></span><div><p className="eyebrow">Gestão acadêmica</p><h2>Configurações por programa</h2><p>Defina o prazo em dias úteis, o guia de autodepósito e o contato de coordenação de cada programa.</p></div></div>
        <SectionStats items={[{ icon: "book", value: programs.length, label: "programas ativos" }, { icon: "calendar", value: programs.filter((program) => program.service_level_business_days > 0).length, label: "prazos definidos" }, { icon: "upload", value: programs.filter((program) => program.repository_deposit_enabled).length, label: "guias RI ativos" }, { icon: "message", value: programs.filter((program) => program.coordination_contacts.some((contact) => contact.active)).length, label: "coordenações com contato" }]} />
        <div className="admin-section__subhead"><div><p className="eyebrow">Configuração</p><h3>Prazo, depósito e coordenação</h3></div><span>{filteredPrograms.length} de {programs.length} programas</span></div>
        <div className="admin-programs__toolbar"><label>Buscar programa<input type="search" value={programSearch} onChange={(event) => setProgramSearch(event.target.value)} placeholder="Nome ou nível" /></label><label>Nível<select value={programLevel} onChange={(event) => setProgramLevel(event.target.value)}><option value="all">Todos os níveis</option>{programLevels.map((level) => <option value={level} key={level}>{academicLevelLabels[level] ?? "Outro nível"}</option>)}</select></label><label>Guia do RI<select value={programGuide} onChange={(event) => setProgramGuide(event.target.value)}><option value="all">Todos</option><option value="enabled">Ativo</option><option value="disabled">Desativado</option></select></label>{(programSearch || programLevel !== "all" || programGuide !== "all") && <button className="button button--secondary button--small" type="button" onClick={() => { setProgramSearch(""); setProgramLevel("all"); setProgramGuide("all"); }}>Limpar filtros</button>}</div>
        <div className="admin-list">
          {filteredPrograms.map((p) => {
            const c = p.coordination_contacts.find((x) => x.active);
            return (
              <details className="admin-program" key={p.id}>
                <summary className="admin-program__identity"><span className="admin-section__icon"><AppIcon name="book" /></span><span><strong>{p.name}</strong><small>{academicLevelLabels[p.level] ?? "Outro nível"} · Prazo atual: {p.service_level_business_days ? `${p.service_level_business_days} ${p.service_level_business_days === 1 ? "dia útil" : "dias úteis"}` : "não definido"}</small></span><AppIcon className="admin-program__chevron" name="arrowRight" /></summary>
              <form
                className="admin-row admin-row--program"
                onSubmit={(event) => { event.preventDefault(); void saveProgram(p, new FormData(event.currentTarget)); }}
              >
                <div className="admin-program__settings">
                <label>
                  SLA (dias úteis)
                  <input
                    name="sla"
                    type="number"
                    min="1"
                    max="30"
                    defaultValue={p.service_level_business_days}
                  />
                </label>
                <div className="admin-program__switches">
                <label className="admin-program__toggle">
                  <input
                    name="repository"
                    type="checkbox"
                    defaultChecked={p.repository_deposit_enabled}
                  />{" "}
                  Guia do RI ativo
                </label>
                <label className="admin-program__toggle">
                  <input
                    name="coordination"
                    type="checkbox"
                    defaultChecked={p.coordination_magic_link_enabled}
                  />{" "}
                  Enviar Magic Link automaticamente à coordenação
                </label>
                </div>
                </div>
                <div className="admin-program__contact">
                <label>
                  Nome do contato da coordenação
                  <input name="name" defaultValue={c?.name ?? ""} />
                </label>
                <label>
                  E-mail da coordenação
                  <input
                    name="email"
                    type="email"
                    defaultValue={c?.email ?? ""}
                  />
                </label>
                </div>
                <button
                  className="button button--secondary button--small"
                  disabled={busy === `p-${p.id}`}
                >
                  <AppIcon name="check" />Salvar programa
                </button>
              </form>
              </details>
            );
          })}
          {filteredPrograms.length === 0 && <p className="admin-empty-state"><AppIcon name="search" />Nenhum programa corresponde aos filtros.</p>}
        </div>
      </section>
      <section className="panel admin-section">
        <div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="calendar" /></span><div><p className="eyebrow">Rotina da biblioteca</p><h2>Funcionamento e comunicados</h2><p>Selecione um dia para preencher o formulário e publicar fechamentos ou avisos.</p></div></div>
        <SectionStats items={[{ icon: "calendar", value: announcements.filter((item) => item.active).length, label: "ocorrências ativas" }, { icon: "lock", value: announcements.filter((item) => item.active && isLibraryClosureAnnouncement(item)).length, label: "fechamentos" }, { icon: "message", value: announcements.filter((item) => item.active && !isLibraryClosureAnnouncement(item)).length, label: "avisos sem fechamento" }, { icon: "clock", value: dailyHours.length, label: "horários especiais" }]} />
        <div className="operational-calendar" aria-label="Calendário operacional">
          <div className="operational-calendar__header">
            <button type="button" aria-label="Mês anterior" title="Mês anterior" onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))}><AppIcon className="operational-calendar__previous" name="arrowRight" /></button>
            <strong><AppIcon name="calendar" />{monthNames[calendarMonth]} {calendarYear}</strong>
            <button type="button" aria-label="Próximo mês" title="Próximo mês" onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))}><AppIcon name="arrowRight" /></button>
          </div>
          <div className="operational-calendar__legend" aria-label="Legenda do calendário">
            <span><i className="is-holiday" />Feriado federal</span>
            <span><i className="is-optional" />Ponto facultativo federal</span>
            <span><i className="is-manual" />Ocorrência da biblioteca</span>
            <span><i className="is-notice" />Comunicado sem fechamento</span>
            <span><i className="is-weekend" />Fim de semana</span>
          </div>
          <div className="operational-calendar__week">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="operational-calendar__days">
            {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const events = eventsForDay(day);
              const weekend = [0, 6].includes(new Date(calendarYear, calendarMonth, day).getDay());
              const featured = events.find((item) => isLibraryClosureAnnouncement(item)) ?? events[0];
              const source = featured ? announcementColorCategory(featured) : "notice";
              const type = source === "holiday" ? "Feriado federal" : source === "optional" ? "Ponto facultativo federal" : source === "manual" ? "Fechamento da biblioteca" : "Comunicado sem fechamento";
              const shortType = source === "holiday" ? "Feriado" : source === "optional" ? "Ponto" : source === "manual" ? "Fechado" : "Aviso";
              const dayKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const specialClose = dailyHours.find((item) => item.service_date === dayKey);
              return <button type="button" key={day} aria-label={`${day} de ${monthNames[calendarMonth]} de ${calendarYear}${events.length ? `, ${events.map((item) => item.title).join(", ")}` : ""}${specialClose ? `, fechamento às ${formatLibraryHour(specialClose.closing_time)}` : ""}`} aria-pressed={selectedCalendarDay === day} className={`${weekend ? "is-weekend " : ""}${events.length ? `has-event is-${source}` : ""}${selectedCalendarDay === day ? " is-selected" : ""}`} onClick={() => addClosure(day)}><b>{day}</b>{featured && <span className="calendar-event"><em className="calendar-event__full">{type}</em><em className="calendar-event__short">{shortType}{events.length > 1 ? ` +${events.length - 1}` : ""}</em><small>{featured.title}{events.length > 1 ? ` +${events.length - 1}` : ""}</small></span>}{specialClose && <span className="calendar-event"><em>Até {formatLibraryHour(specialClose.closing_time)}</em></span>}</button>;
            })}
            {Array.from({ length: (7 - ((firstWeekday + daysInMonth) % 7)) % 7 }, (_, index) => <span key={`after-${index}`} />)}
          </div>
        </div>
        <DailyClosingControl key={closingDate} initialHours={dailyHours} selectedDate={closingDate} onSaved={setDailyHours} />
        <div className="calendar-editor__heading"><span className="admin-section__icon"><AppIcon name={isEditingAnnouncement ? "edit" : "message"} /></span><div><p className="eyebrow">{isEditingAnnouncement ? "Editando ocorrência" : "Nova ocorrência"}</p><h3>{isEditingAnnouncement ? editingAnnouncement?.title : "Informar funcionamento ou publicar aviso"}</h3><p>Use “Fechamento excepcional” para suspensões pontuais da biblioteca que não sejam feriado, recesso ou greve. “Normal” e “Outro” são avisos sem fechamento.</p></div></div>
        <form
          ref={calendarFormRef}
          className="admin-grid calendar-editor"
          style={{ scrollMarginTop: 24 }}
          key={editingAnnouncement?.id || editingAnnouncement?.starts_at || "new"}
          action={saveAnnouncement}
        >
          <label className="calendar-editor__type">
            Tipo de ocorrência
            <select
              name="type"
              defaultValue={editingAnnouncement?.type ?? "normal"}
            >
              <option value="normal">Normal</option>
              <option value="recess">Recesso</option>
              <option value="strike">Paralisação/greve</option>
              <option value="holiday">Feriado</option>
              <option value="optional_day">Ponto facultativo</option>
              <option value="closure">Fechamento excepcional</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <label className="calendar-editor__title">
            Nome da ocorrência
            <input
              name="title"
              required
              placeholder="Ex.: Feriado municipal"
              defaultValue={editingAnnouncement?.title ?? ""}
            />
          </label>
          <label className="calendar-editor__message">
            Mensagem do mural
            <textarea
              name="message"
              rows={3}
              required
              placeholder="Orientação breve para estudantes e equipe"
              defaultValue={editingAnnouncement?.message ?? ""}
            />
          </label>
          <PeriodField name="starts" label="Início do período" value={editingAnnouncement?.starts_at} />
          <PeriodField name="ends" label="Fim do período (opcional)" value={editingAnnouncement?.ends_at} optional />
          <div className="calendar-editor__footer"><label className="calendar-editor__active"><input name="active" type="checkbox" defaultChecked={editingAnnouncement?.active ?? true} /><span>Publicar esta ocorrência</span></label><div className="calendar-editor__actions"><button className="button button--primary button--small button--with-icon" disabled={busy === "announcement"}><AppIcon name="check" />{isEditingAnnouncement ? "Salvar alterações" : "Cadastrar ocorrência"}</button>{editingAnnouncement && <button type="button" className="button button--secondary button--small button--with-icon" onClick={() => { setEditingAnnouncement(null); setSelectedCalendarDay(null); }}><AppIcon name="close" />{isEditingAnnouncement ? "Cancelar edição" : "Limpar campos"}</button>}</div></div>
        </form>
        <div className="calendar-records__intro"><div><p className="eyebrow">Registros</p><h3>Ocorrências cadastradas</h3></div><span>{visibleAnnouncements.length} resultado{visibleAnnouncements.length === 1 ? "" : "s"}</span></div>
        <div className="admin-user-filters">
          <label>
            Buscar
            <input
              value={announcementSearch}
              onChange={(event) => setAnnouncementSearch(event.target.value)}
              placeholder="Título ou mensagem"
            />
          </label>
          <label>
            Tipo
            <select
              value={announcementType}
              onChange={(event) => setAnnouncementType(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="normal">Normal</option>
              <option value="recess">Recesso</option>
              <option value="strike">Paralisação</option>
              <option value="holiday">Feriado</option>
              <option value="optional_day">Ponto facultativo</option>
              <option value="closure">Fechamento excepcional</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <label>
            Situação
            <select
              value={announcementActivity}
              onChange={(event) => setAnnouncementActivity(event.target.value)}
            >
              <option value="all">Todas</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </label>
        </div>
        <div className="calendar-records" aria-label="Ocorrências cadastradas">
          <div className="calendar-records__header">{([["date", "Data"], ["title", "Ocorrência"], ["type", "Tipo"], ["origin", "Origem"], ["status", "Situação"]] as const).map(([column, label]) => <button key={column} type="button" aria-label={`Ordenar por ${label.toLowerCase()}`} aria-pressed={announcementSort.column === column} onClick={() => sortAnnouncements(column)}>{label}<span aria-hidden="true">{announcementSort.column === column ? announcementSort.direction === "asc" ? "↑" : "↓" : "↕"}</span></button>)}<span>Ações</span></div>
        {visibleAnnouncements.map((a) => {
            const typeLabel = a.type === "holiday" ? "Feriado" : a.type === "optional_day" ? "Ponto facultativo" : a.type === "recess" ? "Recesso" : a.type === "strike" ? "Paralisação/greve" : a.type === "closure" ? "Fechamento excepcional" : a.type === "normal" ? "Aviso normal" : "Ocorrência local";
            const sourceLabel = a.calendar_source === "federal_mgi" ? "Calendário federal (MGI)" : "Cadastro manual da biblioteca";
            const colorCategory = announcementColorCategory(a);
            return <article className="calendar-record" key={a.id}>
              <span className="calendar-record__date"><time dateTime={a.starts_at}>{formatNumericDate(a.starts_at)}</time>{a.ends_at && serviceDayKey(a.ends_at) !== serviceDayKey(a.starts_at) && <><span aria-hidden="true">até</span><time dateTime={a.ends_at}>{formatNumericDate(a.ends_at)}</time></>}</span>
              <div><strong>{a.title}</strong><p>{a.message}</p></div>
              <div><span className={`calendar-badge is-${colorCategory}`}>{typeLabel}</span></div>
              <span className="calendar-record__origin">{sourceLabel}</span>
              <span className={`calendar-status ${a.active ? "is-active" : ""}`}>{a.active ? "Ativo" : "Inativo"}</span>
              <div className="actions">
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={() => { setEditingAnnouncement(a); scrollToCalendarForm(); }}
                >
                  <AppIcon name="edit" />Editar
                </button>
                <button
                  type="button"
                  className="button button--secondary button--small"
                  disabled={busy === `a-${a.id}`}
                  onClick={() => setAnnouncementToDelete(a)}
                >
                  <AppIcon name="close" />Excluir
                </button>
              </div>
            </article>;
          })}
          {visibleAnnouncements.length === 0 && <p className="calendar-records__empty">Nenhuma ocorrência corresponde aos filtros.</p>}
        </div>
        {announcementToDelete && <div className="calendar-delete-confirmation pronto-modal-overlay" onKeyDown={(event) => { if (event.key === "Escape" && !busy) setAnnouncementToDelete(null); }}><section className="calendar-delete-confirmation__card pronto-modal-surface" role="alertdialog" aria-modal="true" aria-labelledby="calendar-delete-title" aria-describedby="calendar-delete-description"><ModalCloseButton onClick={() => setAnnouncementToDelete(null)} disabled={Boolean(busy)} /><p className="eyebrow">Confirmação necessária</p><h3 id="calendar-delete-title">Excluir ocorrência?</h3><p id="calendar-delete-description">“{announcementToDelete.title}” será removida do calendário e deixará de aparecer nos avisos da biblioteca.</p><div className="calendar-delete-confirmation__actions"><button type="button" className="button button--secondary" disabled={Boolean(busy)} onClick={() => setAnnouncementToDelete(null)}>Cancelar</button><button type="button" className="button button--danger button--with-icon" disabled={Boolean(busy)} onClick={() => deleteAnnouncement(announcementToDelete)}><AppIcon name="close" />{busy ? "Excluindo…" : "Excluir ocorrência"}</button></div></section></div>}
      </section>
      <section className="panel admin-section">
        <div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="inbox" /></span><div><p className="eyebrow">Conteúdo operacional</p><h2>Mensagens do atendimento</h2><p>Mensagens reutilizáveis para orientar correções e próximos passos dos estudantes durante o atendimento.</p></div></div>
        <SectionStats items={[{ icon: "inbox", value: props.templates.length, label: "modelos cadastrados" }, { icon: "check", value: props.templates.filter((item) => item.active).length, label: "disponíveis à equipe" }, { icon: "lock", value: props.templates.filter((item) => !item.active).length, label: "desativados" }]} />
        <div className="admin-section__subhead"><div><p className="eyebrow">Biblioteca de mensagens</p><h3>Textos usados no atendimento</h3></div>{props.templateFieldsReady && <button type="button" className="button button--secondary button--small button--with-icon" onClick={() => setCreatingTemplate((current) => !current)}><AppIcon name={creatingTemplate ? "close" : "edit"} />{creatingTemplate ? "Cancelar criação" : "Criar modelo"}</button>}</div>
        {!props.templateFieldsReady && <p className="admin-section__hint"><AppIcon name="help" />Os modelos existentes continuam disponíveis. A criação e a associação aos campos serão liberadas após a migração local.</p>}
        <p className="field-help">A ordem define a posição no menu de modelos durante a análise: números menores aparecem primeiro. Modelos associados só aparecem nos campos selecionados.</p>
        {creatingTemplate && <form className="admin-row admin-row--template admin-row--template-new" action={createTemplate}>
          <div className="admin-template__heading"><span className="admin-section__icon"><AppIcon name="message" /></span><div><strong>Novo modelo</strong><small>Será disponibilizado à equipe depois de salvo.</small></div></div>
          <div className="admin-template__fields"><label>Nome do modelo<input name="label" required minLength={3} placeholder="Ex.: Conferir nome do orientador" /></label><label>Mensagem para o estudante<textarea name="message" rows={4} required minLength={3} placeholder="Explique o que precisa ser corrigido." /></label></div>
          <TemplateFieldChoices selected={[]} /><div className="admin-template__settings"><p className="field-help">Entrará ao final da lista. A posição pode ser alterada depois.</p><button className="button button--secondary button--small button--with-icon" disabled={busy === "t-new"}><AppIcon name="check" />Criar modelo</button></div>
        </form>}
        {props.templates.map((t) => (
          <details className="admin-template" key={t.id}>
            <summary className="admin-template__summary"><span className="admin-section__icon"><AppIcon name="message" /></span><span className="admin-template__summary-text"><strong>{t.label}</strong><small>Posição {t.position} · {t.field_keys.length} {t.field_keys.length === 1 ? "campo associado" : "campos associados"}</small></span><span className={`admin-template__state${t.active ? " is-active" : ""}`}>{t.active ? "Ativo" : "Inativo"}</span><AppIcon className="admin-template__chevron" name="arrowRight" /></summary>
            <form className="admin-row admin-row--template" action={(f) => saveTemplate(t, f)}>
            <div className="admin-template__fields">
              <label>
                Nome do modelo
                <input name="label" defaultValue={t.label} />
              </label>
              <label>
                Mensagem para o estudante
                <textarea name="message" rows={4} defaultValue={t.message} />
              </label>
            </div>
            <TemplateFieldChoices selected={t.field_keys} disabled={!props.templateFieldsReady} />
            <div className="admin-template__settings">
              <label>
                Posição na lista
                <input name="position" type="number" min={0} defaultValue={t.position} />
              </label>
              <label className="admin-template__active">
                <input name="active" type="checkbox" defaultChecked={t.active} />
                Ativo
              </label>
              <button className="button button--secondary button--small button--with-icon" disabled={busy === `t-${t.id}`}>
                <AppIcon name="check" />Salvar modelo
              </button>
            </div>
            </form>
          </details>
        ))}
        {props.templates.length === 0 && <p className="admin-empty-state"><AppIcon name="inbox" />Nenhum modelo de resposta cadastrado.</p>}
      </section>
      <section className="panel admin-section">
        <div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="review" /></span><div><p className="eyebrow">Acompanhamento</p><h2>Indicadores do atendimento</h2><p>Explore as solicitações por situação, programa e responsável no período escolhido.</p></div></div>
        <form className="admin-stats__period" action={loadStats}>
          <div className="admin-stats__period-heading"><AppIcon name="calendar" /><div><strong>Período de envio</strong><span>As datas inicial e final estão incluídas no resultado.</span></div></div>
          <div className="admin-stats__period-fields"><label>De<input name="start" type="date" value={statsPeriod.start} onChange={(event) => setStatsPeriod((current) => ({ ...current, start: event.target.value }))} /></label><label>Até<input name="end" type="date" value={statsPeriod.end} onChange={(event) => setStatsPeriod((current) => ({ ...current, end: event.target.value }))} /></label><button className="button button--primary button--small button--with-icon" disabled={busy === "stats"}><AppIcon name="review" />{busy === "stats" ? "Consultando…" : "Consultar"}</button></div>
          <div className="admin-stats__presets" aria-label="Atalhos de período"><button type="button" className="button button--secondary button--small" onClick={() => { const today = serviceDayKey(new Date()); setStatsPeriod({ start: `${today.slice(0, 7)}-01`, end: today }); }}>Este mês</button><button type="button" className="button button--secondary button--small" onClick={() => { const today = serviceDayKey(new Date()); const start = new Date(`${today}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 29); setStatsPeriod({ start: start.toISOString().slice(0, 10), end: today }); }}>Últimos 30 dias</button><button type="button" className="button button--secondary button--small" onClick={() => setStatsPeriod({ start: "", end: "" })}>Todo o histórico</button></div>
        </form>
        {stats && (
          <>
            <div className="admin-stats__result-heading"><div><p className="eyebrow">Resultado</p><h3>Resumo do período</h3><span>{indicatorDateLabel(appliedStatsPeriod.start) || "Início do histórico"} — {indicatorDateLabel(appliedStatsPeriod.end) || "hoje"}</span></div><div className="admin-stats__exports"><button type="button" className="button button--secondary button--small button--with-icon" onClick={() => download("csv")} disabled={!stats.total}><AppIcon name="document" />Exportar CSV</button><button type="button" className="button button--secondary button--small button--with-icon" onClick={() => download("json")} disabled={!stats.total}><AppIcon name="document" />Exportar JSON</button></div></div>
            <div className="admin-stats__overview"><div className="admin-stats__total"><span className="admin-section__stat-icon"><AppIcon name="inbox" /></span><div><span className="eyebrow">Volume total</span><strong>{stats.total.toLocaleString("pt-BR")}</strong><small>{stats.total === 1 ? "solicitação enviada" : "solicitações enviadas"}</small></div></div><div className="admin-stats__status"><h4>Distribuição por situação</h4>{stats.total > 0 ? <div className="admin-stats__status-list">{[...stats.by_status].sort((a, b) => b.count - a.count).map((item) => <div className="admin-stats__status-row" key={item.label}><div><span>{indicatorStatusLabels[item.label] ?? item.label}</span><strong>{item.count.toLocaleString("pt-BR")}</strong></div><span className="admin-stats__bar" aria-hidden="true"><span style={{ width: `${item.count / stats.total * 100}%` }} /></span></div>)}</div> : <p>Nenhuma situação registrada neste período.</p>}</div></div>
            {stats.total > 0 ? <div className="admin-stats__breakdown"><Metric title="Por curso ou programa" items={stats.by_program} total={stats.total} /><Metric title="Por responsável" items={stats.by_staff} total={stats.total} /></div> : <p className="admin-empty-state"><AppIcon name="inbox" />Nenhuma solicitação encontrada para esse período.</p>}
          </>
        )}
        {!stats && <p className="admin-empty-state"><AppIcon name="calendar" />Escolha um período ou consulte todo o histórico.</p>}
      </section>
      <section className="panel admin-section">
        <div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="archive" /></span><div><p className="eyebrow">Ciclo de vida dos documentos</p><h2>Arquivos com prazo vencido</h2><p>Veja os arquivos elegíveis para expurgo após 60 dias. A remoção preserva o registro textual da validação.</p></div></div>
        <SectionStats items={[{ icon: "archive", value: purge.length, label: "arquivos com prazo vencido" }]} />
        {purge.length === 0 ? (
          <p className="admin-empty-state"><AppIcon name="archive" />Nenhum arquivo atingiu o prazo de retenção.</p>
        ) : (
          purge.map((d) => (
            <div className="admin-summary admin-retention__item" key={d.id}>
              <span className="admin-section__stat-icon"><AppIcon name="document" /></span>
              <div className="admin-retention__details"><small>Protocolo</small><strong>{d.cataloging_requests?.protocol ?? d.request_id}</strong><span>Retenção encerrada em {new Date(d.purge_after).toLocaleString("pt-BR")}</span></div>
              <button
                className="button button--danger button--small"
                disabled={busy === `x-${d.id}`}
                onClick={() => purgeFile(d)}
              >
                <AppIcon name="archive" />Expurgar arquivo
              </button>
            </div>
          ))
        )}
      </section>
      <section className="panel admin-section">
        <div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="document" /></span><div><p className="eyebrow">Rastreabilidade</p><h2>Histórico de ações</h2><p>Consulte quando uma ação ocorreu, quem a realizou e o registro associado.</p></div></div>
        <SectionStats items={[{ icon: "document", value: props.logs.length, label: "Ações carregadas" }, { icon: "account", value: new Set(props.logs.map((log) => log.profiles?.full_name).filter(Boolean)).size, label: "Pessoas identificadas" }]} />
        <div className="admin-audit-toolbar"><label className="admin-audit-search">Buscar no histórico<input type="search" value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} placeholder="Ação, pessoa ou registro" /></label><label>Tipo de ação<select value={auditAction} onChange={(event) => setAuditAction(event.target.value)}><option value="all">Todas as ações</option>{auditActions.map((action) => <option key={action} value={action}>{readableAuditAction(action)}</option>)}</select></label><span>{filteredLogs.length} de {props.logs.length} registros</span></div>
        <div className="audit-table">
          {filteredLogs.length === 0 && <p className="admin-empty-state"><AppIcon name="document" />{props.logs.length === 0 ? "Nenhuma ação registrada até agora." : "Nenhuma ação corresponde aos filtros."}</p>}
          {filteredLogs.map((l) => (
            <article key={l.id}>
              <time>{new Date(l.occurred_at).toLocaleString("pt-BR")}</time>
              <div className="admin-audit__action"><strong>{readableAuditAction(l.action)}</strong></div>
              <span>
                {l.profiles?.full_name ?? "Sistema"} · {readableAuditEntity(l.entity_type)}
                {l.entity_id ? ` · ${l.entity_id}` : ""}
              </span>
            </article>
          ))}
        </div>
      </section>
      <section className="panel admin-section">
        <div className="admin-section__lead"><span className="admin-section__icon"><AppIcon name="help" /></span><div><p className="eyebrow">Orientação ao público</p><h2>Conteúdo da Central de ajuda</h2><p>Organize perguntas frequentes, respostas rápidas e artigos por público e ordem de exibição.</p></div></div>
        <KnowledgeBaseAdmin entries={props.knowledge} initialEntryId={props.initialKnowledgeId} initialLanguage={props.initialKnowledgeLanguage} faqOnly={!props.grantedPermissions.includes("admin.knowledge.manage")} canEdit={props.grantedPermissions.includes("admin.knowledge.manage") || props.grantedPermissions.includes("admin.faq.manage")} overview={<SectionStats items={[{ icon: "help", value: props.knowledge.filter((entry) => entry.kind === "faq").length, label: "Perguntas frequentes" }, { icon: "document", value: props.knowledge.filter((entry) => entry.kind !== "faq").length, label: "Respostas e artigos" }, { icon: "review", value: props.knowledge.filter((entry) => entry.active).length, label: "Conteúdos ativos" }]} />} />
      </section>
      <CduCatalogAdmin entries={props.cduEntries} />
      <ControlledTermsAdmin />
      {props.depositFollowup && <section className="panel admin-section deposit-followup-admin">{props.depositFollowup}</section>}
    </div>
  );
}
function Metric({ title, items, total }: { title: string; items: StatItem[]; total: number }) {
  return (
    <section className="admin-stats__metric"><h4>{title}</h4><div className="admin-stats__metric-list">{[...items].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR")).map((item) => <div className="admin-stats__metric-row" key={`${item.id}-${item.label}`}><div><span>{item.label}</span><strong>{item.count.toLocaleString("pt-BR")}</strong></div><span className="admin-stats__bar" aria-hidden="true"><span style={{ width: `${total ? item.count / total * 100 : 0}%` }} /></span></div>)}</div></section>
  );
}
function SectionStats({ items }: { items: { icon: AppIconName; value: number | string; label: string; detail?: string }[] }) {
  return <div className="admin-section__stats" aria-label="Resumo da seção">{items.map((item) => <div className="admin-section__stat" key={item.label}><span className="admin-section__stat-icon"><AppIcon name={item.icon} /></span><div><strong>{item.value}</strong><span>{item.label}</span>{item.detail && <small>{item.detail}</small>}</div></div>)}</div>;
}
function UserRow({
  user,
  busy,
  onSave,
  birthBusy,
  onCorrectBirthDate,
  canManage,
}: {
  user: User;
  busy: boolean;
  onSave: (user: User, form: FormData) => Promise<void>;
  birthBusy: boolean;
  onCorrectBirthDate: (user: User, form: FormData) => Promise<void>;
  canManage: boolean;
}) {
  const [role, setRole] = useState(user.role);
  const staff = role !== "student";
  const details = firstStaffProfile(user.staff_profiles);
  const birthDate = user.student_profiles?.[0]?.birth_date;
  return (
    <div className="admin-user-entry">
    <form
      className={`admin-row ${staff ? "admin-row--staff" : "admin-row--student"}`}
      action={(form) => onSave(user, form)}
    >
      <div>
        <strong>{user.full_name}</strong>
        <small>{user.email}</small>
      </div>
      <label>
        Perfil
        <select
          name="role"
          value={role}
          disabled={!canManage}
          onChange={(event) => setRole(event.target.value)}
        >
          {Object.entries(roleLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Situação
        <select name="status" defaultValue={user.status} disabled={!canManage}>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {staff && (
        <>
          <label>
            CRB
            <input name="crb" required defaultValue={details?.crb ?? ""} disabled={!canManage} />
          </label>
        </>
      )}
      {canManage && <button
        className="button button--secondary button--small"
        disabled={busy}
      >
        Salvar
      </button>}
    </form>
    {!staff && canManage && <details className="admin-birth-date"><summary>Corrigir data de nascimento</summary>
      <form action={(form) => onCorrectBirthDate(user, form)}>
        <span>Data atual: <strong>{birthDate ? birthDate.split("-").reverse().join("/") : "não informada"}</strong></span>
        <label>Nova data de nascimento<input type="date" name="birth_date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} defaultValue={birthDate ?? ""} required /></label>
        <button className="button button--secondary button--small" type="submit" disabled={birthBusy}>{birthBusy ? "Salvando..." : "Salvar correção"}</button>
      </form>
    </details>}
    </div>
  );
}
