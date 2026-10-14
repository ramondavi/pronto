alter table public.staff_permission_overrides
  add column grant_order bigint generated always as identity;

drop index public.staff_permission_active_lookup;
create index staff_permission_active_lookup
  on public.staff_permission_overrides(profile_id,permission_code,valid_from desc,grant_order desc)
  where revoked_at is null;

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
  if 'student'::public.user_role = any(definition.default_roles) and actor_role in ('cataloger','administrator')
    and exists (select 1 from public.staff_inherited_roles where profile_id = actor_id and inherited_role = 'student'
      and revoked_at is null and valid_from <= now() and (valid_until is null or valid_until > now())) then return true; end if;
  return false;
end $$;
