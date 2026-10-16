"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppIcon } from "@/components/app-icon";

export type PermissionDefinition = {
  code: string;
  area: string;
  screen: string;
  action: string;
  description: string;
  default_roles: string[];
  delegable: boolean;
};
export type PermissionOverride = {
  id: string;
  profile_id: string;
  permission_code: string;
  effect: "allow" | "deny";
  valid_from: string;
  valid_until: string | null;
  revoked_at: string | null;
};
export type InheritedRole = {
  id: string;
  profile_id: string;
  inherited_role: string;
  valid_from: string;
  valid_until: string | null;
  revoked_at: string | null;
};
type StaffUser = { id: string; full_name: string; email: string; role: string; status: string };

const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Bahia",
}).format(new Date(value));
const validAt = (item: { valid_from: string; valid_until: string | null; revoked_at: string | null }, now: number) =>
  !item.revoked_at && new Date(item.valid_from).getTime() <= now && (!item.valid_until || new Date(item.valid_until).getTime() > now);
const normalizePermissionSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
const toSalvadorInstant = (value: string, allDay: boolean, end: boolean) => value ? new Date(`${value}${allDay ? end ? "T23:59:59.999" : "T00:00:00.000" : ":00"}-03:00`).toISOString() : null;

function PermissionPeriodField({ name, label }: { name: "starts" | "ends"; label: string }) {
  const id = useId();
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState(name === "starts" ? "08:00" : "18:00");
  return <div className="staff-permissions__period"><label htmlFor={id}>{label}</label><div className="staff-permissions__period-controls"><input id={id} type="date" value={date} onChange={(event) => setDate(event.target.value)} /><input type="hidden" name={name} value={date ? allDay ? date : `${date}T${time}` : ""} />{!allDay && <input type="time" aria-label={`Horário de ${name === "starts" ? "início" : "fim"}`} value={time} onChange={(event) => setTime(event.target.value)} />}<label className="calendar-editor__all-day"><input type="checkbox" name={`${name}_all_day`} checked={allDay} onChange={(event) => setAllDay(event.target.checked)} />Dia todo</label></div></div>;
}

export function StaffPermissionsAdmin({ users, definitions, initialOverrides, initialRoles }: {
  users: StaffUser[];
  definitions: PermissionDefinition[];
  initialOverrides: PermissionOverride[];
  initialRoles: InheritedRole[];
}) {
  const staff = users.filter((item) => item.role === "cataloger" || item.role === "administrator");
  const [selectedId, setSelectedId] = useState(staff[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [onlyIndividual, setOnlyIndividual] = useState(false);
  const [overrides, setOverrides] = useState(initialOverrides);
  const [roles, setRoles] = useState(initialRoles);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const selected = staff.find((item) => item.id === selectedId);
  const activeStudentRole = roles.some((item) => item.profile_id === selectedId && item.inherited_role === "student" && validAt(item, clock));
  const activeAdminRole = roles.some((item) => item.profile_id === selectedId && item.inherited_role === "administrator" && validAt(item, clock));
  const grouped = useMemo(() => {
    const groups = new Map<string, PermissionDefinition[]>();
    for (const definition of definitions) {
      const heading = `${definition.area} · ${definition.screen}`;
      groups.set(heading, [...(groups.get(heading) ?? []), definition]);
    }
    return [...groups.entries()];
  }, [definitions]);
  const activeOverrides = overrides.filter((item) => item.profile_id === selectedId && validAt(item, clock));
  const normalizedSearch = normalizePermissionSearch(search.trim());
  const visibleGroups = grouped.map(([heading, items]) => [heading, items.filter((item) =>
    normalizePermissionSearch(`${heading} ${item.action} ${item.description} ${item.code === "student.preview" ? "herdar visão de estudante demonstração" : ""}`).includes(normalizedSearch) &&
    (!onlyIndividual || activeOverrides.some((override) => override.permission_code === item.code) || (item.code === "student.preview" && activeStudentRole)),
  )] as const).filter(([, items]) => items.length > 0);
  const adminRoleMatches = selected?.role === "cataloger" && normalizePermissionSearch("Administração delegada Herdar permissões padrão de administrador catalogador sem gerenciar permissões").includes(normalizedSearch) &&
    (!onlyIndividual || activeAdminRole);

  async function savePermission(form: FormData) {
    if (!selected) return;
    const code = String(form.get("code") ?? "");
    const effect = String(form.get("effect") ?? "");
    const start = toSalvadorInstant(String(form.get("starts") ?? ""), form.get("starts_all_day") === "on", false) ?? new Date().toISOString();
    const end = toSalvadorInstant(String(form.get("ends") ?? ""), form.get("ends_all_day") === "on", true);
    if (end && end <= start) { setFeedback("O fim deve ser posterior ao início."); return; }
    setBusy(code);
    setFeedback("");
    const supabase = createClient();
    const { data: id, error } = await supabase.rpc("admin_set_staff_permission", {
      target_profile_id: selected.id, target_permission_code: code, target_effect: effect,
      starts_at: start, ends_at: end,
    });
    const { data: saved, error: readError } = id && !error
      ? await supabase.from("staff_permission_overrides").select("id,profile_id,permission_code,effect,valid_from,valid_until,revoked_at").eq("id", id).single()
      : { data: null, error: null };
    if (error || readError || !saved || saved.profile_id !== selected.id || saved.permission_code !== code || saved.effect !== effect) {
      setFeedback("Não foi possível confirmar a permissão no banco.");
    } else {
      setOverrides((current) => [...current, saved as PermissionOverride]);
      setClock(Date.now());
      setFeedback("Permissão salva e confirmada no banco.");
      if (code === "student.preview") window.dispatchEvent(new Event("pronto:staff-permissions-updated"));
    }
    setBusy("");
  }

  async function inheritRole(form: FormData, inheritedRole: "student" | "administrator") {
    if (!selected) return;
    const start = toSalvadorInstant(String(form.get("starts") ?? ""), form.get("starts_all_day") === "on", false) ?? new Date().toISOString();
    const end = toSalvadorInstant(String(form.get("ends") ?? ""), form.get("ends_all_day") === "on", true);
    if (end && end <= start) { setFeedback("O fim deve ser posterior ao início."); return; }
    setBusy(`${inheritedRole}-role`);
    setFeedback("");
    const supabase = createClient();
    const { data: id, error } = await supabase.rpc("admin_set_staff_inherited_role", {
      target_profile_id: selected.id, target_role: inheritedRole, starts_at: start, ends_at: end,
    });
    const { data: saved, error: readError } = id && !error
      ? await supabase.from("staff_inherited_roles").select("id,profile_id,inherited_role,valid_from,valid_until,revoked_at").eq("id", id).single()
      : { data: null, error: null };
    if (error || readError || !saved || saved.profile_id !== selected.id || saved.inherited_role !== inheritedRole) {
      setFeedback("Não foi possível confirmar a herança no banco.");
    } else {
      setRoles((current) => [...current, saved as InheritedRole]);
      setClock(Date.now());
      setFeedback(inheritedRole === "student" ? "Visão de estudante liberada e confirmada no banco." : "Administração delegada liberada e confirmada no banco.");
      window.dispatchEvent(new Event("pronto:staff-permissions-updated"));
    }
    setBusy("");
  }

  async function revoke(id: string, kind: "permission" | "role") {
    setBusy(id);
    setFeedback("");
    const supabase = createClient();
    const { error } = await supabase.rpc("admin_revoke_staff_access", { target_access_id: id, access_kind: kind });
    const table = kind === "permission" ? "staff_permission_overrides" : "staff_inherited_roles";
    const { data: saved, error: readError } = !error
      ? await supabase.from(table).select("revoked_at").eq("id", id).single()
      : { data: null, error: null };
    if (error || readError || !saved?.revoked_at) {
      setFeedback("Não foi possível confirmar a revogação no banco.");
    } else {
      if (kind === "permission") setOverrides((current) => current.map((item) => item.id === id ? { ...item, revoked_at: saved.revoked_at } : item));
      else setRoles((current) => current.map((item) => item.id === id ? { ...item, revoked_at: saved.revoked_at } : item));
      setClock(Date.now());
      setFeedback("Acesso revogado e confirmado no banco.");
      window.dispatchEvent(new Event("pronto:staff-permissions-updated"));
    }
    setBusy("");
  }

  return <div className="staff-permissions">
    <div className="admin-section__lead staff-permissions__intro"><span className="admin-section__icon"><AppIcon name="shield" /></span><div><p className="eyebrow">Controle de acesso</p><h2>Acesso por pessoa</h2><p>Consulte o acesso efetivo de cada pessoa e registre exceções ao perfil. Cada alteração é auditada e confirmada no banco.</p></div></div>
    <div className="staff-permissions__overview" aria-label="Resumo das permissões"><div><span className="staff-permissions__metric-icon"><AppIcon name="work" /></span><strong>{staff.length}</strong><span>Pessoas da equipe</span></div><div><span className="staff-permissions__metric-icon"><AppIcon name="check" /></span><strong>{activeOverrides.filter((item) => item.effect === "allow").length}</strong><span>Permissões individuais</span></div><div><span className="staff-permissions__metric-icon"><AppIcon name="lock" /></span><strong>{activeOverrides.filter((item) => item.effect === "deny").length}</strong><span>Bloqueios individuais</span></div></div>
    <div className="staff-permissions__toolbar"><label className="staff-permissions__person">Pessoa da equipe
      <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setFeedback(""); setClock(Date.now()); }}>
        {staff.map((item) => <option value={item.id} key={item.id}>{item.full_name} · {item.email}</option>)}
      </select>
    </label><label className="staff-permissions__search">Buscar ação ou área<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: calendário, ficha" /></label><label className="staff-permissions__only-individual"><input type="checkbox" checked={onlyIndividual} onChange={(event) => setOnlyIndividual(event.target.checked)} />Só decisões individuais</label></div>
    {selected && <div className="staff-permissions__person-summary"><AppIcon name="account" /><div><strong>{selected.full_name}</strong><span>{selected.email}</span></div><span className="staff-permissions__person-role">{selected.role === "administrator" ? "Administrador" : "Catalogador"} · {selected.status === "active" ? "Ativa" : selected.status === "blocked" ? "Bloqueada" : "Inativa"}</span></div>}
    <p className="staff-permissions__guidance"><AppIcon name="help" />O horário é o de Salvador. Sem fim definido, a decisão vale até ser revogada. Quando há decisões simultâneas, prevalece a mais recente ainda válida.</p>
    {feedback && <p className="auth-feedback" role="status">{feedback}</p>}
    {selected && <>
      {adminRoleMatches && <details className="staff-permissions__group" key={`${selectedId}:delegated-admin`}>
        <summary className="staff-permissions__group-summary"><AppIcon name="shield" /><strong>Administração delegada</strong><span>1 ação</span><AppIcon className="staff-permissions__group-chevron" name="arrowRight" /></summary>
        <div className="staff-permissions__group-grid">
          <details className="staff-permissions__item">
            <summary className="staff-permissions__item-summary"><span><strong>Herdar permissões de administrador</strong><small>Perfil da conta: catalogador</small></span><small className={`staff-permissions__effective${activeAdminRole ? " is-allowed" : " is-denied"}`}><AppIcon name={activeAdminRole ? "check" : "lock"} />{activeAdminRole ? "Permitido" : "Bloqueado"}</small><AppIcon className="staff-permissions__item-chevron" name="arrowRight" /></summary>
            <div className="staff-permissions__item-body">
              <div className="staff-permissions__activity-info"><p>Concede as atividades padrão de administrador a este catalogador, exceto gerenciar permissões. Bloqueios individuais continuam prevalecendo. O perfil da conta não muda.</p></div>
              <details className="staff-permissions__edit"><summary><AppIcon name="edit" />Alterar permissão</summary><form action={(form) => inheritRole(form, "administrator")} className="staff-permissions__form staff-permissions__activity-form">
                <fieldset className="staff-permissions__schedule"><legend>Período da decisão</legend><p>Sem início, vale agora. Sem fim, vale até ser revogada.</p><div className="staff-permissions__schedule-fields"><PermissionPeriodField name="starts" label="Início (opcional)" /><PermissionPeriodField name="ends" label="Fim (opcional)" /></div></fieldset>
                <div className="staff-permissions__activity-actions"><button className="button button--secondary button--small" disabled={Boolean(busy)}><AppIcon name="check" />Conceder administração delegada</button></div>
              </form></details>
              {roles.filter((item) => item.profile_id === selectedId && item.inherited_role === "administrator" && !item.revoked_at).map((item) => <div className="staff-permissions__grant" key={item.id}>
                <span>{new Date(item.valid_from).getTime() > clock ? "Agendada" : validAt(item, clock) ? "Ativa" : "Encerrada"} · {formatDate(item.valid_from)}{item.valid_until ? ` até ${formatDate(item.valid_until)}` : " · sem prazo final"}</span>
                {(!item.valid_until || new Date(item.valid_until).getTime() > clock) && <button type="button" className="button button--secondary button--small" disabled={Boolean(busy)} onClick={() => revoke(item.id, "role")}>Revogar</button>}
              </div>)}
            </div>
          </details>
        </div>
      </details>}
      {visibleGroups.map(([heading, items]) => <details className="staff-permissions__group" key={`${selectedId}:${heading}`}>
        <summary className="staff-permissions__group-summary"><AppIcon name="shield" /><strong>{heading}</strong><span>{items.length} {items.length === 1 ? "ação" : "ações"}</span><AppIcon className="staff-permissions__group-chevron" name="arrowRight" /></summary>
        <div className="staff-permissions__group-grid">
        {items.map((item) => {
          const current = overrides.filter((override) => override.profile_id === selectedId && override.permission_code === item.code && validAt(override, clock))
            .sort((a, b) => b.valid_from.localeCompare(a.valid_from) || b.id.localeCompare(a.id))[0];
          const inherited = item.default_roles.includes("student") && activeStudentRole;
          const basic = item.default_roles.includes(selected.role) || (selected.role === "administrator" && item.default_roles.includes("cataloger")) || (activeAdminRole && item.default_roles.includes("administrator")) || inherited;
          const effective = item.code === "admin.permissions.manage" ? selected.role === "administrator" : current ? current.effect === "allow" : basic;
          return <details className="staff-permissions__item" key={`${selectedId}:${item.code}`}>
            <summary className="staff-permissions__item-summary"><span><strong>{item.action}</strong><small>{current ? "Decisão individual" : inherited ? "Visão de estudante" : activeAdminRole && item.default_roles.includes("administrator") && selected.role === "cataloger" && item.code !== "admin.permissions.manage" ? "Administração delegada" : "Perfil padrão"}</small></span><small className={`staff-permissions__effective${effective ? " is-allowed" : " is-denied"}`}><AppIcon name={effective ? "check" : "lock"} />{effective ? "Permitido" : "Bloqueado"}</small><AppIcon className="staff-permissions__item-chevron" name="arrowRight" /></summary>
            <div className="staff-permissions__item-body"><div className="staff-permissions__activity-info"><p>{item.description}</p>{item.code === "student.preview" && <small>Liberação individual e herança da visão dão acesso à mesma demonstração. Uma decisão individual vigente prevalece.</small>}{current && <small>Decisão individual vigente até {current.valid_until ? formatDate(current.valid_until) : "revogação"}</small>}</div>
            {item.delegable && <details className="staff-permissions__edit"><summary><AppIcon name="edit" />Alterar permissão</summary><form action={savePermission} className="staff-permissions__form staff-permissions__activity-form">
              <input type="hidden" name="code" value={item.code} />
              <div className="staff-permissions__decision"><label>Decisão para esta atividade<select name="effect" defaultValue="allow"><option value="allow">Permitir</option><option value="deny">Bloquear</option></select></label></div>
              <fieldset className="staff-permissions__schedule"><legend>Período da decisão</legend><p>Sem início, vale agora. Sem fim, vale até ser revogada.</p><div className="staff-permissions__schedule-fields"><PermissionPeriodField name="starts" label="Início (opcional)" /><PermissionPeriodField name="ends" label="Fim (opcional)" /></div></fieldset>
              <div className="staff-permissions__activity-actions"><button className="button button--secondary button--small" disabled={Boolean(busy)}><AppIcon name="check" />Salvar decisão</button></div>
            </form></details>}
            {item.code === "student.preview" && <details className="staff-permissions__edit"><summary><AppIcon name="eye" />Liberar por herança da visão</summary><form action={(form) => inheritRole(form, "student")} className="staff-permissions__form staff-permissions__activity-form">
              <fieldset className="staff-permissions__schedule"><legend>Período da herança</legend><p>Sem início, vale agora. Sem fim, vale até ser revogada.</p><div className="staff-permissions__schedule-fields"><PermissionPeriodField name="starts" label="Início (opcional)" /><PermissionPeriodField name="ends" label="Fim (opcional)" /></div></fieldset>
              <div className="staff-permissions__activity-actions"><button className="button button--secondary button--small" disabled={Boolean(busy)}><AppIcon name="check" />Liberar visão</button></div>
            </form></details>}
            {item.code === "student.preview" && roles.filter((role) => role.profile_id === selectedId && role.inherited_role === "student" && !role.revoked_at).map((role) => <div className="staff-permissions__grant" key={role.id}>
              <span>Herança · {new Date(role.valid_from).getTime() > clock ? "Agendada" : validAt(role, clock) ? "Ativa" : "Encerrada"} · {formatDate(role.valid_from)}{role.valid_until ? ` até ${formatDate(role.valid_until)}` : " · sem prazo final"}</span>
              {(!role.valid_until || new Date(role.valid_until).getTime() > clock) && <button type="button" className="button button--secondary button--small" disabled={Boolean(busy)} onClick={() => revoke(role.id, "role")}>Revogar</button>}
            </div>)}
            {overrides.filter((override) => override.profile_id === selectedId && override.permission_code === item.code && !override.revoked_at && (!override.valid_until || new Date(override.valid_until).getTime() > clock)).map((override) => <div className="staff-permissions__grant" key={override.id}>
              <span>{override.effect === "allow" ? "Permitir" : "Bloquear"} · {formatDate(override.valid_from)}{override.valid_until ? ` até ${formatDate(override.valid_until)}` : " · sem prazo final"}</span>
              <button type="button" className="button button--secondary button--small" disabled={Boolean(busy)} onClick={() => revoke(override.id, "permission")}>Revogar</button>
            </div>)}
            </div>
          </details>;
        })}
        </div>
      </details>)}
      {!adminRoleMatches && visibleGroups.length === 0 && <p className="staff-permissions__empty">Nenhuma ação corresponde aos filtros.</p>}
    </>}
  </div>;
}
