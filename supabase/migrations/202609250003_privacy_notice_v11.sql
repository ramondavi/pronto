-- A versão 1.1 descreve a data de nascimento. Preservar os registros de ciência da v1.0.
create or replace function public.acknowledge_privacy_notice(target_notice_version text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare acknowledged_at_value timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if btrim(coalesce(target_notice_version, '')) <> '1.1' then raise exception 'unsupported_privacy_notice_version'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and status = 'active') then raise exception 'active_profile_required'; end if;

  insert into public.privacy_notice_acknowledgements(profile_id, notice_version, source)
    values(auth.uid(), '1.1', 'authenticated_notice')
    on conflict(profile_id, notice_version) do nothing;

  select acknowledged_at into acknowledged_at_value
    from public.privacy_notice_acknowledgements
    where profile_id = auth.uid() and notice_version = '1.1';
  return acknowledged_at_value;
end;
$$;

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
  if privacy_notice_version_value <> '1.1' then raise exception 'privacy_notice_acknowledgement_required'; end if;
  if birth_date_value !~ '^\d{4}-\d{2}-\d{2}$' or birth_date_value::date not between date '1900-01-01' and current_date then raise exception 'valid_birth_date_required'; end if;

  insert into public.profiles (id, full_name, email, role, status)
    values (new.id, full_name_value, lower(new.email), 'student', 'active');
  insert into public.student_profiles (profile_id, cpf, birth_date) values (new.id, cpf_value, birth_date_value::date);
  insert into public.privacy_notice_acknowledgements(profile_id, notice_version, source)
    values (new.id, '1.1', 'signup');
  return new;
end;
$$;

revoke all on function public.acknowledge_privacy_notice(text) from public, anon;
grant execute on function public.acknowledge_privacy_notice(text) to authenticated;
revoke all on function public.handle_auth_user() from public, anon, authenticated;
