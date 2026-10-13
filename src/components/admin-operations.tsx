"use client";
import { useEffect, useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { adminSections, adminTabHref, type AdminArea } from "@/lib/admin-navigation";
import { showPanelChange, showPanelChangeError } from "@/components/panel-change-toast";
import { KnowledgeBaseAdmin, type KnowledgeEntry } from "./knowledge-base-admin";
import { CduCatalogAdmin } from "./cdu-catalog-admin";
import { ControlledTermsAdmin } from "./controlled-terms-admin";
import { AppIcon } from "./app-icon";
import { ModalCloseButton } from "./modal-close-button";
import { isLibraryClosureAnnouncement, serviceDayKey } from "@/lib/service-announcements";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  staff_profiles: { professional_name: string; crb: string }[];
  student_profiles: { birth_date: string | null }[];
};
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
type Template = {
  id: string;
  code: string;
  label: string;
  message: string;
  active: boolean;
  position: number;
};
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
const statusLabels: Record<string, string> = {
  active: "Ativa",
  blocked: "Bloqueada",
  inactive: "Inativa",
};
const actionLabels: Record<string, string> = {
  account_administration_changed: "Conta alterada",
  program_operation_configuration_changed: "Programa configurado",
  library_announcement_saved: "Mural atualizado",
  issue_template_changed: "Template alterado",
  frequently_asked_question_saved: "Pergunta frequente alterada",
  nada_consta_purged: "Nada Consta expurgado",
};

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
  users: User[];
  staffCandidates: StaffCandidate[];
  programs: Program[];
  announcements: Announcement[];
  templates: Template[];
  logs: Log[];
  purgeDocuments: Purge[];
  knowledge: KnowledgeEntry[];
  cduEntries: ComponentProps<typeof CduCatalogAdmin>["entries"];
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState(props.users);
  const [purge, setPurge] = useState(props.purgeDocuments);
  const [announcements, setAnnouncements] = useState(props.announcements);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementType, setAnnouncementType] = useState("all");
  const [announcementActivity, setAnnouncementActivity] = useState("all");
  const [announcementSort, setAnnouncementSort] = useState<{ column: "date" | "title" | "type" | "origin" | "status"; direction: "asc" | "desc" }>({ column: "date", direction: "asc" });
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(props.tab);
  const router = useRouter();
  const [userType, setUserType] = useState("all");
  const [userStatus, setUserStatus] = useState("all");
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
    const crb = String(form.get("crb") ?? "");
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
    const staff = saved?.staff_profiles?.[0];
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
        const previousStaff = user.staff_profiles?.[0];
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
        const staff = data?.staff_profiles?.[0];
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
    await runVerified(
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
        return (
          !error &&
          data?.service_level_business_days === sla &&
          data.repository_deposit_enabled === repository &&
          data.coordination_magic_link_enabled === coordination &&
          (!coordination ||
            Boolean(
              contact && contact.name === name && contact.email === email,
            ))
        );
      },
      "Alterações do programa salvas e confirmadas no banco de dados.",
    );
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
    const existing = eventsForDay(day)[0];
    if (existing) { setEditingAnnouncement(existing); return; }
    const value = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00`;
    setEditingAnnouncement({ id: "" as string, type: "other", title: "", message: "Biblioteca sem funcionamento.", starts_at: value, ends_at: null, active: true, calendar_source: "manual" });
  }
  async function saveTemplate(template: Template, form: FormData) {
    const label = String(form.get("label"));
    const messageText = String(form.get("message"));
    const active = form.get("active") === "on";
    const position = Number(form.get("position"));
    await runVerified(
      `t-${template.id}`,
      () =>
        supabase.rpc("admin_update_issue_template", {
          target_template_id: template.id,
          template_label: label,
          template_message: messageText,
          enabled: active,
          template_position: position,
        }),
      async () => {
        const { data, error } = await supabase
          .from("issue_templates")
          .select("label,message,active,position")
          .eq("id", template.id)
          .single();
        return (
          !error &&
          data?.label === label &&
          data.message === messageText &&
          data.active === active &&
          data.position === position
        );
      },
      "Template salvo e confirmado no banco de dados.",
    );
  }
  async function loadStats(form: FormData) {
    setBusy("stats");
    const start = form.get("start")
      ? new Date(String(form.get("start"))).toISOString()
      : null;
    const end = form.get("end")
      ? new Date(`${String(form.get("end"))}T23:59:59`).toISOString()
      : null;
    const { data, error } = await supabase.rpc("admin_statistics", {
      period_start: start,
      period_end: end,
    });
    setStats(error ? null : (data as Stats));
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
  );
  const adminTabs = adminSections.find((section) => section.area === props.area)?.tabs ?? adminSections[0].tabs;
  useEffect(() => {
    setActiveTab(props.tab);
  }, [props.tab]);
  return (
    <div className="admin-operations" data-active-tab={activeTab}>
      {message && (message.startsWith("Não ") || !/salv|alterad|corrigid|atualizad|excluíd|registrad|criad|removid|confirmad/i.test(message)) && (
        <p className="auth-feedback admin-toast" role="status">
          {message}
        </p>
      )}
      <div className="admin-tabs" role="tablist" aria-label="Seções da área selecionada">
          {adminTabs.map(({ id, label }) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={activeTab === id ? "is-active" : ""}
            onClick={() => { setActiveTab(id); router.push(adminTabHref(props.area, id), { scroll: false }); }}
            key={id}
          >
            {label}
          </button>
          ))}
      </div>
      <section className="panel admin-section">
        <p className="eyebrow">Usuários</p>
        <h2>Equipe e acessos</h2>
        <p>
          Bloqueio e inativação interrompem a autorização imediatamente. Para
          incluir alguém na equipe, crie e confirme primeiro a conta
          institucional no Supabase; ela aparecerá na seleção abaixo.
        </p>
        <form className="admin-grid admin-provision" action={provision}>
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
        </form>
        <div className="admin-user-filters">
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
          <span>
            {filteredUsers.length} conta{filteredUsers.length === 1 ? "" : "s"}
          </span>
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
            />
          ))}
        </div>
      </section>
      <section className="panel admin-section">
        <p className="eyebrow">Programas</p>
        <h2>Programas, coordenações e SLA</h2>
        <div className="admin-list">
          {props.programs.map((p) => {
            const c = p.coordination_contacts.find((x) => x.active);
            return (
              <form
                className="admin-row admin-row--program"
                action={(f) => saveProgram(p, f)}
                key={p.id}
              >
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.level}</small>
                </div>
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
                <label>
                  <input
                    name="repository"
                    type="checkbox"
                    defaultChecked={p.repository_deposit_enabled}
                  />{" "}
                  Guia RI ativo
                </label>
                <label>
                  <input
                    name="coordination"
                    type="checkbox"
                    defaultChecked={p.coordination_magic_link_enabled}
                  />{" "}
                  Enviar Magic Link automaticamente à coordenação
                </label>
                <label>
                  Contato
                  <input name="name" defaultValue={c?.name ?? ""} />
                </label>
                <label>
                  E-mail
                  <input
                    name="email"
                    type="email"
                    defaultValue={c?.email ?? ""}
                  />
                </label>
                <button
                  className="button button--secondary button--small"
                  disabled={busy === `p-${p.id}`}
                >
                  Salvar
                </button>
              </form>
            );
          })}
        </div>
      </section>
      <section className="panel admin-section">
        <p className="eyebrow">Biblioteca</p>
        <h2>Calendário e comunicados da biblioteca</h2>
        <p>Selecione um dia no calendário para preencher a data. Cadastre fechamentos e comunicados no formulário abaixo.</p>
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
              return <button type="button" key={day} aria-label={`${day} de ${monthNames[calendarMonth]} de ${calendarYear}${events.length ? `, ${events.length} ocorrência${events.length === 1 ? "" : "s"}` : ""}`} aria-pressed={selectedCalendarDay === day} className={`${weekend ? "is-weekend " : ""}${events.length ? `has-event is-${source}` : ""}${selectedCalendarDay === day ? " is-selected" : ""}`} onClick={() => addClosure(day)}><b>{day}</b>{featured && <span className="calendar-event"><em>{type}</em><small>{featured.title}{events.length > 1 ? ` +${events.length - 1}` : ""}</small></span>}</button>;
            })}
            {Array.from({ length: (7 - ((firstWeekday + daysInMonth) % 7)) % 7 }, (_, index) => <span key={`after-${index}`} />)}
          </div>
        </div>
        <div className="calendar-editor__heading"><div><p className="eyebrow">{isEditingAnnouncement ? "Editando ocorrência" : "Nova ocorrência"}</p><h3>{isEditingAnnouncement ? editingAnnouncement?.title : "Informar funcionamento ou publicar aviso"}</h3><p>Use “Normal” para comunicados sem fechamento. As ocorrências de fechamento entram no cálculo dos dias úteis.</p></div></div>
        <form
          className="admin-grid calendar-editor"
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
            const typeLabel = a.type === "holiday" ? "Feriado" : a.type === "optional_day" ? "Ponto facultativo" : a.type === "recess" ? "Recesso" : a.type === "strike" ? "Paralisação/greve" : a.type === "normal" ? "Aviso normal" : "Ocorrência local";
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
                  onClick={() => setEditingAnnouncement(a)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="button button--secondary button--small"
                  disabled={busy === `a-${a.id}`}
                  onClick={() => setAnnouncementToDelete(a)}
                >
                  Excluir
                </button>
              </div>
            </article>;
          })}
          {visibleAnnouncements.length === 0 && <p className="calendar-records__empty">Nenhuma ocorrência corresponde aos filtros.</p>}
        </div>
        {announcementToDelete && <div className="calendar-delete-confirmation pronto-modal-overlay" onKeyDown={(event) => { if (event.key === "Escape" && !busy) setAnnouncementToDelete(null); }}><section className="calendar-delete-confirmation__card pronto-modal-surface" role="alertdialog" aria-modal="true" aria-labelledby="calendar-delete-title" aria-describedby="calendar-delete-description"><ModalCloseButton onClick={() => setAnnouncementToDelete(null)} disabled={Boolean(busy)} /><p className="eyebrow">Confirmação necessária</p><h3 id="calendar-delete-title">Excluir ocorrência?</h3><p id="calendar-delete-description">“{announcementToDelete.title}” será removida do calendário e deixará de aparecer nos avisos da biblioteca.</p><div className="calendar-delete-confirmation__actions"><button type="button" className="button button--secondary" disabled={Boolean(busy)} onClick={() => setAnnouncementToDelete(null)}>Cancelar</button><button type="button" className="button button--danger button--with-icon" disabled={Boolean(busy)} onClick={() => deleteAnnouncement(announcementToDelete)}><AppIcon name="close" />{busy ? "Excluindo…" : "Excluir ocorrência"}</button></div></section></div>}
      </section>
      <section className="panel admin-section">
        <p className="eyebrow">Atendimento</p>
        <h2>Pendências e respostas padrão</h2>
        {props.templates.map((t) => (
          <form
            className="admin-row admin-row--template"
            action={(f) => saveTemplate(t, f)}
            key={t.id}
          >
            <code className="admin-template__code">{t.code}</code>
            <div className="admin-template__fields">
              <label>
                Rótulo
                <input name="label" defaultValue={t.label} />
              </label>
              <label>
                Texto
                <textarea name="message" rows={4} defaultValue={t.message} />
              </label>
            </div>
            <div className="admin-template__settings">
              <label>
                Ordem
                <input name="position" type="number" defaultValue={t.position} />
              </label>
              <label className="admin-template__active">
                <input name="active" type="checkbox" defaultChecked={t.active} />
                Ativo
              </label>
              <button className="button button--secondary button--small">
                Salvar
              </button>
            </div>
          </form>
        ))}
      </section>
      <section className="panel admin-section">
        <p className="eyebrow">Indicadores</p>
        <h2>Indicadores e exportação</h2>
        <form className="admin-grid" action={loadStats}>
          <label>
            De
            <input name="start" type="date" />
          </label>
          <label>
            Até
            <input name="end" type="date" />
          </label>
          <button
            className="button button--primary button--small"
            disabled={busy === "stats"}
          >
            Calcular
          </button>
        </form>
        {stats && (
          <>
            <div className="stat-grid">
              <article>
                <strong>{stats.total}</strong>
                <span>solicitações</span>
              </article>
              {stats.by_status.map((x) => (
                <article key={x.label}>
                  <strong>{x.count}</strong>
                  <span>{x.label}</span>
                </article>
              ))}
            </div>
            <div className="admin-columns">
              <Metric title="Por curso/programa" items={stats.by_program} />
              <Metric title="Por bibliotecário" items={stats.by_staff} />
            </div>
            <div className="button-row">
              <button
                className="button button--secondary button--small"
                onClick={() => download("csv")}
              >
                Exportar CSV
              </button>
              <button
                className="button button--secondary button--small"
                onClick={() => download("json")}
              >
                Exportar JSON
              </button>
            </div>
          </>
        )}
      </section>
      <section className="panel admin-section">
        <p className="eyebrow">Retenção</p>
        <h2>Arquivos e retenção</h2>
        <p>
          Somente documentos cujo prazo de 60 dias venceu aparecem aqui. A
          remoção apaga o arquivo e preserva o registro textual da validação.
        </p>
        {purge.length === 0 ? (
          <p>Nenhum documento aguardando expurgo.</p>
        ) : (
          purge.map((d) => (
            <div className="admin-summary" key={d.id}>
              <strong>{d.cataloging_requests?.protocol ?? d.request_id}</strong>
              <span>
                Prazo: {new Date(d.purge_after).toLocaleString("pt-BR")}
              </span>
              <button
                className="button button--danger button--small"
                disabled={busy === `x-${d.id}`}
                onClick={() => purgeFile(d)}
              >
                Expurgar arquivo
              </button>
            </div>
          ))
        )}
      </section>
      <section className="panel admin-section">
        <p className="eyebrow">Auditoria</p>
        <h2>Auditoria operacional</h2>
        <div className="audit-table">
          {props.logs.map((l) => (
            <article key={l.id}>
              <time>{new Date(l.occurred_at).toLocaleString("pt-BR")}</time>
              <strong>{actionLabels[l.action] ?? l.action}</strong>
              <span>
                {l.profiles?.full_name ?? "Sistema"} · {l.entity_type}
                {l.entity_id ? ` · ${l.entity_id}` : ""}
              </span>
            </article>
          ))}
        </div>
      </section>
      <section className="panel admin-section">
        <p className="eyebrow">Conteúdo público</p>
        <h2>Ajuda e perguntas frequentes</h2>
        <p>Edite o conteúdo publicado, seus públicos e a forma como aparece na Central.</p>
        <KnowledgeBaseAdmin entries={props.knowledge} />
      </section>
      <CduCatalogAdmin entries={props.cduEntries} />
      <ControlledTermsAdmin />
    </div>
  );
}
function Metric({ title, items }: { title: string; items: StatItem[] }) {
  return (
    <div>
      <h3>{title}</h3>
      {items.map((x) => (
        <div className="metric-row" key={`${x.id}-${x.label}`}>
          <span>{x.label}</span>
          <strong>{x.count}</strong>
        </div>
      ))}
    </div>
  );
}
function UserRow({
  user,
  busy,
  onSave,
  birthBusy,
  onCorrectBirthDate,
}: {
  user: User;
  busy: boolean;
  onSave: (user: User, form: FormData) => Promise<void>;
  birthBusy: boolean;
  onCorrectBirthDate: (user: User, form: FormData) => Promise<void>;
}) {
  const [role, setRole] = useState(user.role);
  const staff = role !== "student";
  const details = user.staff_profiles?.[0];
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
        <select name="status" defaultValue={user.status}>
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
            <input name="crb" required defaultValue={details?.crb ?? ""} />
          </label>
        </>
      )}
      <button
        className="button button--secondary button--small"
        disabled={busy}
      >
        Salvar
      </button>
    </form>
    {!staff && <details className="admin-birth-date"><summary>Corrigir data de nascimento</summary>
      <form action={(form) => onCorrectBirthDate(user, form)}>
        <span>Data atual: <strong>{birthDate ? birthDate.split("-").reverse().join("/") : "não informada"}</strong></span>
        <label>Nova data de nascimento<input type="date" name="birth_date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} defaultValue={birthDate ?? ""} required /></label>
        <button className="button button--secondary button--small" type="submit" disabled={birthBusy}>{birthBusy ? "Salvando..." : "Salvar correção"}</button>
      </form>
    </details>}
    </div>
  );
}
