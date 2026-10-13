-- Alternância de papéis para ensaios no banco local. O sinal é ativado somente no seed local.
create table public.local_test_personas (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.local_test_personas enable row level security;
revoke all on public.local_test_personas from public, anon, authenticated;

create function public.local_test_persona_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare enabled boolean; active_role public.user_role;
begin
  if current_setting('pronto.local_test_personas', true) is distinct from 'on' then
    return jsonb_build_object('available', false, 'enabled', false);
  end if;
  select role into active_role from public.profiles where id = auth.uid() and status = 'active';
  if active_role is null then return jsonb_build_object('available', false, 'enabled', false); end if;
  select exists(select 1 from public.local_test_personas where profile_id = auth.uid()) into enabled;
  return jsonb_build_object('available', enabled or active_role = 'administrator', 'enabled', enabled, 'role', active_role);
end $$;

create function public.enable_local_test_persona()
returns void language plpgsql security definer set search_path = '' as $$
declare candidate text; prefix text; first_digit integer; second_digit integer; attempt integer;
begin
  if current_setting('pronto.local_test_personas', true) is distinct from 'on' then raise exception 'local_test_only'; end if;
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if not exists(select 1 from public.staff_profiles where profile_id = auth.uid()) then raise exception 'staff_profile_required'; end if;
  if not exists(select 1 from public.student_profiles where profile_id = auth.uid()) then
    for attempt in 1..100 loop
      prefix := lpad(floor(random() * 1000000000)::bigint::text, 9, '0');
      for first_digit in 0..9 loop
        for second_digit in 0..9 loop
          candidate := prefix || first_digit::text || second_digit::text;
          if public.is_valid_cpf(candidate) and not exists(select 1 from public.student_profiles where cpf = candidate) then
            insert into public.student_profiles(profile_id, cpf, birth_date)
            values(auth.uid(), candidate, date '2000-01-01');
            exit;
          end if;
        end loop;
        exit when exists(select 1 from public.student_profiles where profile_id = auth.uid());
      end loop;
      exit when exists(select 1 from public.student_profiles where profile_id = auth.uid());
    end loop;
    if not exists(select 1 from public.student_profiles where profile_id = auth.uid()) then raise exception 'test_profile_creation_failed'; end if;
  end if;
  insert into public.local_test_personas(profile_id) values(auth.uid()) on conflict do nothing;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'local_test_persona_enabled', 'profile', auth.uid()::text, '{}'::jsonb);
end $$;

create function public.switch_local_test_persona(target_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
declare previous_role public.user_role;
begin
  if current_setting('pronto.local_test_personas', true) is distinct from 'on' then raise exception 'local_test_only'; end if;
  if target_role is null or target_role not in ('student', 'cataloger', 'administrator') then raise exception 'invalid_test_role'; end if;
  if not exists(select 1 from public.local_test_personas where profile_id = auth.uid()) then raise exception 'test_persona_not_enabled'; end if;
  select role into previous_role from public.profiles where id = auth.uid() and status = 'active' for update;
  if previous_role is null then raise exception 'active_account_required'; end if;
  if target_role = 'student' and not exists(select 1 from public.student_profiles where profile_id = auth.uid()) then raise exception 'student_profile_required'; end if;
  if target_role <> 'student' and not exists(select 1 from public.staff_profiles where profile_id = auth.uid()) then raise exception 'staff_profile_required'; end if;
  if previous_role = target_role then return; end if;
  update public.profiles set role = target_role, updated_at = now() where id = auth.uid();
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values(auth.uid(), 'local_test_persona_switched', 'profile', auth.uid()::text,
    jsonb_build_object('previous_role', previous_role, 'role', target_role));
end $$;

revoke all on function public.local_test_persona_status(), public.enable_local_test_persona(), public.switch_local_test_persona(public.user_role) from public, anon, authenticated;
grant execute on function public.local_test_persona_status(), public.enable_local_test_persona(), public.switch_local_test_persona(public.user_role) to authenticated;
