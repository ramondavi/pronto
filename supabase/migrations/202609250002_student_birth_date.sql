-- A data completa fica na conta; cada solicitação guarda somente o ano autorizado.
alter table public.student_profiles add column birth_date date
  check (birth_date between date '1900-01-01' and current_date);

create or replace function public.handle_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  full_name_value text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  cpf_value text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'cpf', ''), '\D', '', 'g');
  privacy_notice_version_value text := btrim(coalesce(new.raw_user_meta_data ->> 'privacy_notice_version', ''));
  birth_date_value text := coalesce(new.raw_user_meta_data ->> 'birth_date', '');
begin
  if lower(new.email) !~ '^[^@]+@ufba\.br$' then raise exception 'institutional_email_required'; end if;
  if coalesce(new.raw_user_meta_data ->> 'registration_source', '') <> 'student' then return new; end if;
  if char_length(full_name_value) < 3 then raise exception 'full_name_required'; end if;
  if not public.is_valid_cpf(cpf_value) then raise exception 'valid_cpf_required'; end if;
  if privacy_notice_version_value <> '1.0' then raise exception 'privacy_notice_acknowledgement_required'; end if;
  if birth_date_value !~ '^\d{4}-\d{2}-\d{2}$' or birth_date_value::date not between date '1900-01-01' and current_date then raise exception 'valid_birth_date_required'; end if;

  insert into public.profiles (id, full_name, email, role, status)
    values (new.id, full_name_value, lower(new.email), 'student', 'active');
  insert into public.student_profiles (profile_id, cpf, birth_date) values (new.id, cpf_value, birth_date_value::date);
  insert into public.privacy_notice_acknowledgements(profile_id, notice_version, source)
    values (new.id, '1.0', 'signup');
  return new;
end;
$$;

create function public.set_student_birth_date(target_birth_date date)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if target_birth_date not between date '1900-01-01' and current_date then raise exception 'valid_birth_date_required'; end if;
  update public.student_profiles sp set birth_date = target_birth_date, updated_at = now()
    where sp.profile_id = auth.uid() and exists (
      select 1 from public.profiles p where p.id = sp.profile_id and p.role = 'student' and p.status = 'active');
  if not found then raise exception 'active_student_required'; end if;
end;
$$;

create or replace function public.open_student_request_v3(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  created_request_id uuid;
  created_protocol text;
  saved_birth_date date;
  use_birth_year boolean := coalesce((payload #>> '{people,birthYearAcknowledged}')::boolean, false);
  safe_payload jsonb := jsonb_set(jsonb_set(payload, '{people,birthYear}', 'null'::jsonb, true), '{people,birthYearAcknowledged}', 'false'::jsonb, true);
begin
  select sp.birth_date into saved_birth_date from public.student_profiles sp
    join public.profiles p on p.id = sp.profile_id
    where sp.profile_id = auth.uid() and p.role = 'student' and p.status = 'active';
  if saved_birth_date is null then raise exception 'student_birth_date_required'; end if;
  select opened.request_id, opened.generated_protocol into created_request_id, created_protocol from public.open_student_request_v2(safe_payload) opened;
  if use_birth_year then
    update public.request_people set birth_year = extract(year from saved_birth_date)::integer, birth_year_acknowledged_at = now()
      where request_id = created_request_id and role = 'author';
  end if;
  return query select created_request_id, created_protocol;
end;
$$;

revoke all on function public.set_student_birth_date(date) from public, anon;
grant execute on function public.set_student_birth_date(date) to authenticated;
-- Somente a versão atual pode ser chamada diretamente pelo navegador.
revoke execute on function public.open_student_request(jsonb), public.open_student_request_v2(jsonb),
  public.open_student_request_v3(jsonb), public.open_student_request_v4(jsonb),
  public.open_student_request_v5(jsonb), public.open_student_request_v6(jsonb) from public, anon, authenticated;
