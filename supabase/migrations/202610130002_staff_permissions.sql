-- Concessões individuais e herança temporária de visões, sempre avaliadas no banco.
create table public.permission_definitions (
  code text primary key,
  area text not null,
  screen text not null,
  action text not null,
  description text not null,
  default_roles public.user_role[] not null default '{}',
  professional_only boolean not null default false,
  delegable boolean not null default true
);

insert into public.permission_definitions(code,area,screen,action,description,default_roles,professional_only,delegable) values
 ('student.preview','Estudante','Visão de estudante','Visualizar','Abrir uma demonstração das telas de estudante, sem criar ou alterar solicitações','{student}',false,true),
 ('staff.overview.view','Operação','Visão geral','Visualizar','Acompanhar a visão geral da equipe','{cataloger,administrator}',true,true),
 ('staff.queue.view','Operação','Fila','Visualizar','Consultar a fila de solicitações','{cataloger,administrator}',true,true),
 ('staff.queue.assume','Operação','Fila','Assumir atendimento','Assumir um atendimento sem responsável','{cataloger,administrator}',true,true),
 ('staff.queue.release','Operação','Fila','Devolver à fila','Devolver um atendimento sob sua responsabilidade','{cataloger,administrator}',true,true),
 ('staff.queue.reassign','Operação','Fila','Atribuir ou reatribuir','Escolher o responsável por um atendimento','{administrator}',true,true),
 ('staff.queue.priority','Operação','Fila','Definir prioridade','Marcar ou retirar prioridade documentada de um atendimento','{cataloger,administrator}',true,true),
 ('staff.case.view','Operação','Atendimento','Visualizar','Consultar atendimentos e análise técnica','{cataloger,administrator}',true,true),
 ('staff.card.homologate','Atendimento','Ficha catalográfica','Homologar','Homologar a ficha catalográfica','{cataloger,administrator}',true,true),
 ('staff.nada_consta.validate','Atendimento','Nada Consta','Validar','Aprovar ou devolver o Nada Consta','{cataloger,administrator}',true,true),
 ('staff.request.close','Atendimento','Encerramento','Encerrar protocolo','Confirmar publicação no RI/UFBA e encerrar o atendimento','{cataloger,administrator}',true,true),
 ('library.calendar.view','Operação','Calendário e mural','Visualizar','Consultar o calendário e os avisos internos','{cataloger,administrator}',true,true),
 ('library.hours.change','Operação','Calendário e mural','Alterar fechamento','Alterar o horário de fechamento de um dia específico','{administrator}',true,true),
 ('admin.permissions.manage','Controle','Equipe e acessos','Gerenciar permissões','Conceder, bloquear e revogar acessos individuais','{administrator}',false,false);

create table public.staff_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_code text not null references public.permission_definitions(code),
  effect text not null check (effect in ('allow','deny')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  granted_by uuid not null references public.profiles(id),
  constraint staff_permission_valid_period check (valid_until is null or valid_until > valid_from)
);
create index staff_permission_active_lookup on public.staff_permission_overrides(profile_id,permission_code,valid_from desc,created_at desc)
  where revoked_at is null;

create table public.staff_inherited_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  inherited_role public.user_role not null check (inherited_role in ('student','cataloger')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  granted_by uuid not null references public.profiles(id),
  constraint staff_inherited_role_valid_period check (valid_until is null or valid_until > valid_from)
);
create index staff_inherited_roles_active_lookup on public.staff_inherited_roles(profile_id,inherited_role,valid_from desc)
  where revoked_at is null;

alter table public.permission_definitions enable row level security;
alter table public.staff_permission_overrides enable row level security;
alter table public.staff_inherited_roles enable row level security;
revoke all on public.permission_definitions,public.staff_permission_overrides,public.staff_inherited_roles from public,anon,authenticated;
grant select on public.permission_definitions,public.staff_permission_overrides,public.staff_inherited_roles to authenticated;
create policy permission_definitions_read on public.permission_definitions for select to authenticated using (public.is_active_user());
create policy staff_permission_overrides_read on public.staff_permission_overrides for select to authenticated
  using (public.is_active_user() and (profile_id = auth.uid() or public.current_user_role() = 'administrator'));
create policy staff_inherited_roles_read on public.staff_inherited_roles for select to authenticated
  using (public.is_active_user() and (profile_id = auth.uid() or public.current_user_role() = 'administrator'));

create function public.has_permission(requested_code text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.user_role;
  definition public.permission_definitions%rowtype;
  override_effect text;
begin
  if actor_id is null then return false; end if;
  select role into actor_role from public.profiles where id = actor_id and status = 'active';
  if actor_role is null then return false; end if;
  select * into definition from public.permission_definitions where code = requested_code;
  if not found then return false; end if;
  if requested_code = 'admin.permissions.manage' then return actor_role = 'administrator'; end if;
  if definition.professional_only and actor_role not in ('cataloger','administrator') then return false; end if;
  select effect into override_effect from public.staff_permission_overrides
    where profile_id = actor_id and permission_code = requested_code and revoked_at is null
      and valid_from <= now() and (valid_until is null or valid_until > now())
    order by valid_from desc,created_at desc,id desc limit 1;
  if override_effect is not null then return override_effect = 'allow'; end if;
  if actor_role = any(definition.default_roles) then return true; end if;
  if actor_role = 'administrator' and 'cataloger'::public.user_role = any(definition.default_roles) then return true; end if;
  if 'student'::public.user_role = any(definition.default_roles) and actor_role in ('cataloger','administrator')
    and exists (select 1 from public.staff_inherited_roles where profile_id = actor_id and inherited_role = 'student'
      and revoked_at is null and valid_from <= now() and (valid_until is null or valid_until > now())) then return true; end if;
  return false;
end $$;

create function public.admin_set_staff_permission(target_profile_id uuid, target_permission_code text, target_effect text,
  starts_at timestamptz default now(), ends_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not public.has_permission('admin.permissions.manage') then raise exception 'active_administrator_required'; end if;
  if not exists (select 1 from public.profiles where id = target_profile_id and role in ('cataloger','administrator')) then
    raise exception 'staff_profile_required'; end if;
  if not exists (select 1 from public.permission_definitions where code = target_permission_code and delegable) then
    raise exception 'permission_not_delegable'; end if;
  if target_effect not in ('allow','deny') or starts_at is null or (ends_at is not null and ends_at <= starts_at) then
    raise exception 'invalid_permission_period'; end if;
  insert into public.staff_permission_overrides(profile_id,permission_code,effect,valid_from,valid_until,granted_by)
    values(target_profile_id,target_permission_code,target_effect,starts_at,ends_at,auth.uid()) returning id into new_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_permission_changed','staff_permission_overrides',new_id::text,
      jsonb_build_object('target_profile_id',target_profile_id,'permission_code',target_permission_code,'effect',target_effect,'valid_from',starts_at,'valid_until',ends_at));
  return new_id;
end $$;

create function public.admin_set_staff_inherited_role(target_profile_id uuid,target_role public.user_role,
  starts_at timestamptz default now(),ends_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not public.has_permission('admin.permissions.manage') then raise exception 'active_administrator_required'; end if;
  if not exists (select 1 from public.profiles where id = target_profile_id and role in ('cataloger','administrator')) then
    raise exception 'staff_profile_required'; end if;
  if target_role <> 'student' or starts_at is null or (ends_at is not null and ends_at <= starts_at) then
    raise exception 'invalid_inherited_role_period'; end if;
  insert into public.staff_inherited_roles(profile_id,inherited_role,valid_from,valid_until,granted_by)
    values(target_profile_id,target_role,starts_at,ends_at,auth.uid()) returning id into new_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_inherited_role_changed','staff_inherited_roles',new_id::text,
      jsonb_build_object('target_profile_id',target_profile_id,'inherited_role',target_role,'valid_from',starts_at,'valid_until',ends_at));
  return new_id;
end $$;

create function public.admin_revoke_staff_access(target_access_id uuid,access_kind text)
returns void language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  if not public.has_permission('admin.permissions.manage') then raise exception 'active_administrator_required'; end if;
  if access_kind = 'permission' then
    update public.staff_permission_overrides set revoked_at = now() where id = target_access_id and revoked_at is null;
  elsif access_kind = 'role' then
    update public.staff_inherited_roles set revoked_at = now() where id = target_access_id and revoked_at is null;
  else raise exception 'invalid_access_kind'; end if;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'access_not_found'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_access_revoked',access_kind,target_access_id::text,'{}'::jsonb);
end $$;

revoke all on function public.has_permission(text) from public,anon,authenticated;
revoke all on function public.admin_set_staff_permission(uuid,text,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_set_staff_inherited_role(uuid,public.user_role,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.admin_revoke_staff_access(uuid,text) from public,anon,authenticated;
grant execute on function public.has_permission(text),public.admin_set_staff_permission(uuid,text,text,timestamptz,timestamptz),
  public.admin_set_staff_inherited_role(uuid,public.user_role,timestamptz,timestamptz),public.admin_revoke_staff_access(uuid,text) to authenticated;

create or replace function public.admin_set_daily_closing(target_date date,target_closing_time time without time zone)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_permission('library.hours.change') then raise exception 'permission_denied'; end if;
  if target_date is null or (target_closing_time is not null and
    (extract(isodow from target_date) > 5 or target_closing_time <= time '08:00' or target_closing_time > time '23:59')) then
    raise exception 'invalid_daily_closing';
  end if;
  if target_closing_time is null then
    delete from public.library_daily_hours where service_date = target_date;
  else
    insert into public.library_daily_hours(service_date,closing_time,updated_by)
      values(target_date,target_closing_time,auth.uid())
      on conflict(service_date) do update set closing_time=excluded.closing_time,updated_by=excluded.updated_by,updated_at=now();
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id)
    values(auth.uid(),'library_daily_closing_changed','library_daily_hours',target_date::text);
end $$;

drop policy if exists cataloging_requests_read_own_or_staff on public.cataloging_requests;
create policy cataloging_requests_read_own_or_staff on public.cataloging_requests for select to authenticated
  using (public.is_active_user() and (
    student_profile_id = (select id from public.student_profiles where profile_id = auth.uid())
    or public.has_permission('staff.queue.view') or public.has_permission('staff.case.view')
  ));

create or replace function public.list_staff_activity_feed(
  page_size integer default 10,
  before_occurred_at timestamptz default null,
  before_event_id uuid default null
) returns table (
  event_id uuid, occurred_at timestamptz, action text,
  request_id uuid, protocol text, request_title text,
  actor_id uuid, actor_name text, actor_role text, avatar_choice integer,
  is_priority boolean, cancellation_reason text
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_permission('staff.overview.view') then raise exception 'permission_denied'; end if;
  if page_size not between 1 and 20 then raise exception 'invalid_page_size'; end if;
  if (before_occurred_at is null) <> (before_event_id is null) then raise exception 'invalid_feed_cursor'; end if;
  return query
  select l.id, l.occurred_at, l.action, r.id, r.protocol,
    r.title || case when nullif(btrim(r.subtitle), '') is not null then ': ' || btrim(r.subtitle) else '' end,
    p.id, coalesce(p.full_name, 'Equipe Pronto!'), coalesce(p.role::text, 'system'), p.avatar_choice,
    (priority.request_id is not null),
    case when l.action = 'request_canceled_failed_declaration' then r.cancellation_reason else null end
  from public.audit_logs l
  join public.cataloging_requests r on r.id::text = l.entity_id
  left join public.profiles p on p.id = l.actor_id
  left join public.request_priorities priority on priority.request_id = r.id
  where l.entity_type = 'cataloging_request'
    and l.action in (
      'cataloging_request_assumed', 'cataloging_request_reassigned', 'cataloging_request_released',
      'request_changes_requested', 'request_corrections_submitted', 'request_analysis_completed',
      'request_citation_validated', 'cataloging_card_homologated', 'nada_consta_approved',
      'nada_consta_rejected', 'cataloging_request_completed', 'request_priority_set',
      'request_priority_removed', 'request_canceled_failed_declaration'
    )
    and (before_occurred_at is null or (l.occurred_at,l.id) < (before_occurred_at,before_event_id))
  order by l.occurred_at desc,l.id desc limit page_size;
end $$;

create or replace function public.assume_cataloging_request(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare changed_count integer;
begin
  if not public.has_permission('staff.queue.assume') then raise exception 'permission_denied'; end if;
  update public.cataloging_requests
    set assigned_to = auth.uid(), assigned_at = now(), locked_at = now(), status = 'in_review', updated_at = now()
    where id = target_request_id and assigned_to is null and status in ('submitted','in_review','changes_requested');
  get diagnostics changed_count = row_count;
  if changed_count = 0 then
    if exists (select 1 from public.cataloging_requests where id = target_request_id and assigned_to is not null) then
      raise exception 'request_already_assigned';
    end if;
    raise exception 'request_not_available';
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id)
    values(auth.uid(),'cataloging_request_assumed','cataloging_request',target_request_id::text);
end $$;

create or replace function public.release_cataloging_request(target_request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous_assignee uuid;
begin
  if not public.has_permission('staff.queue.release') then raise exception 'permission_denied'; end if;
  select assigned_to into previous_assignee from public.cataloging_requests where id = target_request_id for update;
  if previous_assignee is null then raise exception 'request_not_assigned'; end if;
  if previous_assignee <> auth.uid() and not public.has_permission('staff.queue.reassign') then
    raise exception 'request_owned_by_another_staff';
  end if;
  update public.cataloging_requests
    set assigned_to = null, assigned_at = null, locked_at = null, status = 'submitted', updated_at = now()
    where id = target_request_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'cataloging_request_released','cataloging_request',target_request_id::text,
      jsonb_build_object('previous_assignee',previous_assignee));
end $$;

create or replace function public.reassign_cataloging_request(target_request_id uuid,target_staff_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous_assignee uuid;
begin
  if not public.has_permission('staff.queue.reassign') then raise exception 'permission_denied'; end if;
  if not exists (select 1 from public.profiles where id = target_staff_id and status = 'active' and role in ('cataloger','administrator')) then
    raise exception 'active_staff_target_required';
  end if;
  select assigned_to into previous_assignee from public.cataloging_requests where id = target_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  update public.cataloging_requests
    set assigned_to = target_staff_id, assigned_at = now(), locked_at = now(), status = 'in_review', updated_at = now()
    where id = target_request_id and status not in ('completed','canceled');
  if not found then raise exception 'request_not_available'; end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'cataloging_request_reassigned','cataloging_request',target_request_id::text,
      jsonb_build_object('previous_assignee',previous_assignee,'new_assignee',target_staff_id));
end $$;

create or replace function public.set_request_priority(
  target_request_id uuid,selected_reason_code text,selected_reason_detail text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare request_status public.request_status; previous_code text; previous_detail text;
begin
  if not public.has_permission('staff.queue.priority') then raise exception 'permission_denied'; end if;
  select status into request_status from public.cataloging_requests where id = target_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if request_status in ('completed','canceled') then raise exception 'request_not_open'; end if;
  select reason_code,reason_detail into previous_code,previous_detail from public.request_priorities where request_id = target_request_id;
  if selected_reason_code is null then
    if previous_code is null then return; end if;
    delete from public.request_priorities where request_id = target_request_id;
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
      values(auth.uid(),'request_priority_removed','cataloging_request',target_request_id::text,
        jsonb_build_object('previous_reason_code',previous_code));
    return;
  end if;
  if selected_reason_code not in ('institutional_deadline','urgent_correction','coordination_request','other_documented') then
    raise exception 'invalid_priority_reason';
  end if;
  if selected_reason_code = 'other_documented' then
    if char_length(btrim(coalesce(selected_reason_detail,''))) not between 10 and 500 then
      raise exception 'priority_detail_required';
    end if;
    selected_reason_detail := btrim(selected_reason_detail);
  else selected_reason_detail := null; end if;
  if previous_code is not distinct from selected_reason_code and previous_detail is not distinct from selected_reason_detail then return; end if;
  insert into public.request_priorities(request_id,reason_code,reason_detail,marked_by,marked_at)
    values(target_request_id,selected_reason_code,selected_reason_detail,auth.uid(),now())
    on conflict(request_id) do update set reason_code=excluded.reason_code,reason_detail=excluded.reason_detail,
      marked_by=excluded.marked_by,marked_at=excluded.marked_at;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'request_priority_set','cataloging_request',target_request_id::text,
      jsonb_build_object('reason_code',selected_reason_code,'reason_detail',selected_reason_detail));
end $$;

create function public.enforce_staff_action_permission()
returns trigger language plpgsql security definer set search_path = '' as $$
declare requested_code text;
begin
  if auth.uid() is null then return new; end if;
  if tg_table_name = 'cataloging_card_homologations' then
    requested_code := 'staff.card.homologate';
  elsif tg_table_name = 'nada_consta_documents' and new.status in ('approved','rejected')
    and new.status is distinct from old.status then
    requested_code := 'staff.nada_consta.validate';
  elsif tg_table_name = 'cataloging_requests' and new.status = 'completed'
    and new.status is distinct from old.status then
    requested_code := 'staff.request.close';
  end if;
  if requested_code is not null and not public.has_permission(requested_code) then
    raise exception 'permission_denied';
  end if;
  return new;
end $$;
create trigger staff_permission_card_homologation before insert or update on public.cataloging_card_homologations
  for each row execute function public.enforce_staff_action_permission();
create trigger staff_permission_nada_validation before update of status on public.nada_consta_documents
  for each row execute function public.enforce_staff_action_permission();
create trigger staff_permission_protocol_closure before update of status on public.cataloging_requests
  for each row execute function public.enforce_staff_action_permission();
