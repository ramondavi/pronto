-- Catalogadores podem herdar o conjunto administrativo sem receber o papel de administrador.
-- A gestão de permissões e a promoção de contas a administrador continuam exclusivas do papel real.

alter table public.staff_inherited_roles
  drop constraint staff_inherited_roles_inherited_role_check;
alter table public.staff_inherited_roles
  add constraint staff_inherited_roles_inherited_role_check
  check (inherited_role in ('student', 'cataloger', 'administrator'));

create or replace function public.has_permission(requested_code text)
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
    order by valid_from desc,grant_order desc limit 1;
  if override_effect is not null then return override_effect = 'allow'; end if;
  if actor_role = any(definition.default_roles) then return true; end if;
  if actor_role = 'administrator' and 'cataloger'::public.user_role = any(definition.default_roles) then return true; end if;
  if actor_role = 'cataloger' and 'administrator'::public.user_role = any(definition.default_roles)
    and exists (select 1 from public.staff_inherited_roles where profile_id = actor_id and inherited_role = 'administrator'
      and revoked_at is null and valid_from <= now() and (valid_until is null or valid_until > now())) then return true; end if;
  if 'student'::public.user_role = any(definition.default_roles) and actor_role in ('cataloger','administrator')
    and exists (select 1 from public.staff_inherited_roles where profile_id = actor_id and inherited_role = 'student'
      and revoked_at is null and valid_from <= now() and (valid_until is null or valid_until > now())) then return true; end if;
  return false;
end $$;

create or replace function public.admin_set_staff_inherited_role(target_profile_id uuid,target_role public.user_role,
  starts_at timestamptz default now(),ends_at timestamptz default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid; target_actual_role public.user_role;
begin
  if not public.has_permission('admin.permissions.manage') then raise exception 'active_administrator_required'; end if;
  select role into target_actual_role from public.profiles where id = target_profile_id and status = 'active';
  if target_actual_role not in ('cataloger','administrator') then raise exception 'active_staff_required'; end if;
  if target_role not in ('student','administrator') or
    (target_role = 'administrator' and target_actual_role <> 'cataloger') or
    starts_at is null or (ends_at is not null and ends_at <= starts_at) then
    raise exception 'invalid_inherited_role_period';
  end if;
  insert into public.staff_inherited_roles(profile_id,inherited_role,valid_from,valid_until,granted_by)
    values(target_profile_id,target_role,starts_at,ends_at,auth.uid()) returning id into new_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'staff_inherited_role_changed','staff_inherited_roles',new_id::text,
      jsonb_build_object('target_profile_id',target_profile_id,'inherited_role',target_role,'valid_from',starts_at,'valid_until',ends_at));
  return new_id;
end $$;
