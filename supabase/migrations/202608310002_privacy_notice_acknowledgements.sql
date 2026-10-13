-- Registro de ciência da Política de Privacidade v1.0.

create table public.privacy_notice_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  notice_version text not null check (char_length(btrim(notice_version)) between 1 and 32),
  source text not null check (source in ('signup', 'authenticated_notice')),
  acknowledged_at timestamptz not null default now(),
  unique (profile_id, notice_version)
);

alter table public.privacy_notice_acknowledgements enable row level security;

create policy "privacy_acknowledgements_read_own" on public.privacy_notice_acknowledgements
  for select to authenticated using (profile_id = auth.uid());

create or replace function public.acknowledge_privacy_notice(target_notice_version text)
returns timestamptz
language plpgsql security definer set search_path='' as $$
declare acknowledged_at_value timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if btrim(coalesce(target_notice_version, '')) <> '1.0' then raise exception 'unsupported_privacy_notice_version'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and status = 'active') then raise exception 'active_profile_required'; end if;

  insert into public.privacy_notice_acknowledgements(profile_id, notice_version, source)
    values(auth.uid(), '1.0', 'authenticated_notice')
    on conflict(profile_id, notice_version) do nothing;

  select acknowledged_at into acknowledged_at_value
    from public.privacy_notice_acknowledgements
    where profile_id = auth.uid() and notice_version = '1.0';
  return acknowledged_at_value;
end;
$$;

revoke all on function public.acknowledge_privacy_notice(text) from public, anon;
grant execute on function public.acknowledge_privacy_notice(text) to authenticated;

create or replace function public.handle_auth_user()
returns trigger
language plpgsql security definer set search_path='' as $$
declare
  full_name_value text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  cpf_value text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'cpf', ''), '\D', '', 'g');
  privacy_notice_version_value text := btrim(coalesce(new.raw_user_meta_data ->> 'privacy_notice_version', ''));
begin
  if lower(new.email) !~ '^[^@]+@ufba\.br$' then raise exception 'institutional_email_required'; end if;
  if coalesce(new.raw_user_meta_data ->> 'registration_source', '') <> 'student' then return new; end if;
  if char_length(full_name_value) < 3 then raise exception 'full_name_required'; end if;
  if not public.is_valid_cpf(cpf_value) then raise exception 'valid_cpf_required'; end if;
  if privacy_notice_version_value <> '1.0' then raise exception 'privacy_notice_acknowledgement_required'; end if;

  insert into public.profiles (id, full_name, email, role, status)
    values (new.id, full_name_value, lower(new.email), 'student', 'active');
  insert into public.student_profiles (profile_id, cpf) values (new.id, cpf_value);
  insert into public.privacy_notice_acknowledgements(profile_id, notice_version, source)
    values (new.id, '1.0', 'signup');
  return new;
end;
$$;

revoke all on function public.handle_auth_user() from public, anon, authenticated;
