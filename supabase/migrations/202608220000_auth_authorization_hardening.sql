-- Consolidação do Incremento 2: autorização somente para contas ativas,
-- RLS explícito nas tabelas fundacionais e provisionamento de equipe.

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  )
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = auth.uid() and status = 'active'
$$;

alter table public.profiles enable row level security;
alter table public.student_profiles enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.academic_programs enable row level security;
alter table public.coordination_contacts enable row level security;
alter table public.library_announcements enable row level security;
alter table public.sla_settings enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_read_own_or_staff" on public.profiles;
drop policy if exists "student_profiles_read_own_or_staff" on public.student_profiles;

create policy "profiles_read_own_or_staff" on public.profiles for select to authenticated
  using (
    public.is_active_user()
    and (id = auth.uid() or public.current_user_role() in ('cataloger', 'administrator'))
  );
create policy "profiles_update_by_administrator" on public.profiles for update to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

create policy "student_profiles_read_own_or_staff" on public.student_profiles for select to authenticated
  using (
    public.is_active_user()
    and (profile_id = auth.uid() or public.current_user_role() in ('cataloger', 'administrator'))
  );

create policy "staff_profiles_read_own_or_administrator" on public.staff_profiles for select to authenticated
  using (
    public.is_active_user()
    and (profile_id = auth.uid() or public.current_user_role() = 'administrator')
  );

create policy "academic_programs_read_by_active_users" on public.academic_programs for select to authenticated
  using (public.is_active_user());
create policy "academic_programs_manage_by_administrator" on public.academic_programs for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

create policy "coordination_contacts_read_by_staff" on public.coordination_contacts for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
create policy "coordination_contacts_manage_by_administrator" on public.coordination_contacts for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

create policy "library_announcements_read_by_active_users" on public.library_announcements for select to authenticated
  using (public.is_active_user());
create policy "library_announcements_manage_by_administrator" on public.library_announcements for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

create policy "sla_settings_read_by_active_users" on public.sla_settings for select to authenticated
  using (public.is_active_user());
create policy "sla_settings_manage_by_administrator" on public.sla_settings for all to authenticated
  using (public.current_user_role() = 'administrator')
  with check (public.current_user_role() = 'administrator');

create policy "audit_logs_read_by_administrator" on public.audit_logs for select to authenticated
  using (public.current_user_role() = 'administrator');

revoke all on table public.profiles, public.student_profiles, public.staff_profiles,
  public.academic_programs, public.coordination_contacts, public.library_announcements,
  public.sla_settings, public.audit_logs from anon, authenticated;

grant select on table public.profiles, public.student_profiles, public.staff_profiles,
  public.academic_programs, public.coordination_contacts, public.library_announcements,
  public.sla_settings, public.audit_logs to authenticated;
grant update (full_name, role, status) on table public.profiles to authenticated;
grant insert, update, delete on table public.academic_programs, public.coordination_contacts,
  public.library_announcements, public.sla_settings to authenticated;

create or replace function public.provision_staff_account(
  target_user_id uuid,
  staff_full_name text,
  staff_professional_name text,
  staff_crb text,
  staff_role public.user_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_email text;
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;
  if staff_role is null or staff_role not in ('cataloger', 'administrator') then
    raise exception 'staff_role_required';
  end if;
  if char_length(btrim(staff_full_name)) < 3
    or char_length(btrim(staff_professional_name)) < 3
    or char_length(btrim(staff_crb)) < 3 then
    raise exception 'staff_data_required';
  end if;

  select lower(email) into target_email
  from auth.users
  where id = target_user_id and email_confirmed_at is not null;

  if target_email is null or target_email !~ '^[^@]+@ufba\.br$' then
    raise exception 'confirmed_institutional_user_required';
  end if;

  insert into public.profiles (id, full_name, email, role, status)
  values (target_user_id, btrim(staff_full_name), target_email, staff_role, 'active');

  insert into public.staff_profiles (profile_id, professional_name, crb)
  values (target_user_id, btrim(staff_professional_name), btrim(staff_crb));

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'staff_account_provisioned',
    'profile',
    target_user_id::text,
    jsonb_build_object('role', staff_role)
  );
end;
$$;

revoke all on function public.is_active_user() from public, anon, authenticated;
revoke all on function public.current_user_role() from public, anon, authenticated;
revoke all on function public.provision_staff_account(uuid, text, text, text, public.user_role)
  from public, anon, authenticated;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.provision_staff_account(uuid, text, text, text, public.user_role)
  to authenticated;
