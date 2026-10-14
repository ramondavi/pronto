"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
const toSalvadorInstant = (value: string) => value ? new Date(`${value}:00-03:00`).toISOString() : null;

export function StaffPermissionsAdmin({ users, definitions, initialOverrides, initialRoles }: {
  users: StaffUser[];
  definitions: PermissionDefinition[];
  initialOverrides: PermissionOverride[];
  initialRoles: InheritedRole[];
}) {
  const staff = users.filter((item) => item.role === "cataloger" || item.role === "administrator");
  const [selectedId, setSelectedId] = useState(staff[0]?.id ?? "");
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
  const grouped = useMemo(() => {
    const groups = new Map<string, PermissionDefinition[]>();
    for (const definition of definitions) {
      const heading = `${definition.area} · ${definition.screen}`;
      groups.set(heading, [...(groups.get(heading) ?? []), definition]);
    }
    return [...groups.entries()];
  }, [definitions]);

  async function savePermission(form: FormData) {
    if (!selected) return;
    const code = String(form.get("code") ?? "");
    const effect = String(form.get("effect") ?? "");
    const start = toSalvadorInstant(String(form.get("starts") ?? "")) ?? new Date().toISOString();
    const end = toSalvadorInstant(String(form.get("ends") ?? ""));
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
    }
    setBusy("");
  }

  async function inheritStudent(form: FormData) {
    if (!selected) return;
    const start = toSalvadorInstant(String(form.get("starts") ?? "")) ?? new Date().toISOString();
    const end = toSalvadorInstant(String(form.get("ends") ?? ""));
    if (end && end <= start) { setFeedback("O fim deve ser posterior ao início."); return; }
    setBusy("student-role");
    setFeedback("");
    const supabase = createClient();
    const { data: id, error } = await supabase.rpc("admin_set_staff_inherited_role", {
      target_profile_id: selected.id, target_role: "student", starts_at: start, ends_at: end,
    });
    const { data: saved, error: readError } = id && !error
      ? await supabase.from("staff_inherited_roles").select("id,profile_id,inherited_role,valid_from,valid_until,revoked_at").eq("id", id).single()
      : { data: null, error: null };
    if (error || readError || !saved || saved.profile_id !== selected.id || saved.inherited_role !== "student") {
      setFeedback("Não foi possível confirmar a herança no banco.");
    } else {
      setRoles((current) => [...current, saved as InheritedRole]);
      setClock(Date.now());
      setFeedback("Visão de estudante liberada e confirmada no banco.");
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
    }
    setBusy("");
  }

  return <div className="staff-permissions">
    <p className="eyebrow">Controle de acesso</p>
    <h2>Permissões da equipe</h2>
    <p>Conceda ou bloqueie ações por pessoa. O prazo usa o horário de Salvador. Sem data final, a decisão continua até ser revogada. Entre decisões individuais simultâneas, vale a mais recente; quando ela termina, uma decisão anterior ainda válida volta a valer. A gestão de permissões permanece exclusiva de administradores ativos.</p>
    <label className="staff-permissions__person">Pessoa da equipe
      <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setFeedback(""); setClock(Date.now()); }}>
        {staff.map((item) => <option value={item.id} key={item.id}>{item.full_name} · {item.email}</option>)}
      </select>
    </label>
    {feedback && <p className="auth-feedback" role="status">{feedback}</p>}
    {selected && <>
      <div className="staff-permissions__role">
        <div><h3>Herdar visão de estudante</h3><p>A pessoa poderá navegar por uma demonstração sem enviar solicitações ou alterar dados estudantis.</p><strong>{activeStudentRole ? "Ativa" : "Não ativa"}</strong></div>
        <form action={inheritStudent} className="staff-permissions__form">
          <label>Início (opcional)<input type="datetime-local" name="starts" /></label>
          <label>Fim (opcional)<input type="datetime-local" name="ends" /></label>
          <button className="button button--secondary button--small" disabled={Boolean(busy)}>Liberar visão</button>
        </form>
        {roles.filter((item) => item.profile_id === selectedId && !item.revoked_at).map((item) => <div className="staff-permissions__grant" key={item.id}>
          <span>{new Date(item.valid_from).getTime() > clock ? "Agendada" : validAt(item, clock) ? "Ativa" : "Encerrada"} · {formatDate(item.valid_from)}{item.valid_until ? ` até ${formatDate(item.valid_until)}` : " · sem prazo final"}</span>
          {(!item.valid_until || new Date(item.valid_until).getTime() > clock) && <button type="button" className="button button--secondary button--small" disabled={Boolean(busy)} onClick={() => revoke(item.id, "role")}>Revogar</button>}
        </div>)}
      </div>
      {grouped.map(([heading, items]) => <div className="staff-permissions__group" key={heading}>
        <h3>{heading}</h3>
        {items.map((item) => {
          const current = overrides.filter((override) => override.profile_id === selectedId && override.permission_code === item.code && validAt(override, clock))
            .sort((a, b) => b.valid_from.localeCompare(a.valid_from) || b.id.localeCompare(a.id))[0];
          const inherited = item.default_roles.includes("student") && activeStudentRole;
          const basic = item.default_roles.includes(selected.role) || (selected.role === "administrator" && item.default_roles.includes("cataloger")) || inherited;
          const effective = item.code === "admin.permissions.manage" ? selected.role === "administrator" : current ? current.effect === "allow" : basic;
          return <div className="staff-permissions__item" key={item.code}>
            <div><strong>{item.action}</strong><p>{item.description}</p><small>{effective ? "Permitido" : "Bloqueado"}{current ? ` · decisão individual até ${current.valid_until ? formatDate(current.valid_until) : "revogação"}` : " · perfil/herança"}</small></div>
            {item.delegable && <form action={savePermission} className="staff-permissions__form">
              <input type="hidden" name="code" value={item.code} />
              <label>Decisão<select name="effect" defaultValue="allow"><option value="allow">Permitir</option><option value="deny">Bloquear</option></select></label>
              <label>Início<input type="datetime-local" name="starts" /></label>
              <label>Fim<input type="datetime-local" name="ends" /></label>
              <button className="button button--secondary button--small" disabled={Boolean(busy)}>Salvar</button>
            </form>}
            {overrides.filter((override) => override.profile_id === selectedId && override.permission_code === item.code && !override.revoked_at && (!override.valid_until || new Date(override.valid_until).getTime() > clock)).map((override) => <div className="staff-permissions__grant" key={override.id}>
              <span>{override.effect === "allow" ? "Permitir" : "Bloquear"} · {formatDate(override.valid_from)}{override.valid_until ? ` até ${formatDate(override.valid_until)}` : " · sem prazo final"}</span>
              <button type="button" className="button button--secondary button--small" disabled={Boolean(busy)} onClick={() => revoke(override.id, "permission")}>Revogar</button>
            </div>)}
          </div>;
        })}
      </div>)}
    </>}
  </div>;
}
