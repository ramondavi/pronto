alter table public.request_people
  add column birth_year integer check (birth_year between 1900 and 9999),
  add column birth_year_acknowledged_at timestamptz,
  add column birth_year_validated_at timestamptz,
  add column birth_year_validated_by uuid references public.profiles(id) on delete restrict;

create or replace function public.open_student_request_v3(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  created_request_id uuid;
  created_protocol text;
  birth_year_value integer := nullif(payload #>> '{people,birthYear}', '')::integer;
begin
  if birth_year_value is not null and birth_year_value not between 1900 and extract(year from current_date)::integer then
    raise exception 'valid_birth_year_required';
  end if;
  if birth_year_value is not null and coalesce((payload #>> '{people,birthYearAcknowledged}')::boolean, false) is not true then
    raise exception 'birth_year_acknowledgement_required';
  end if;
  select opened.request_id, opened.generated_protocol into created_request_id, created_protocol from public.open_student_request_v2(payload) opened;
  if birth_year_value is not null then
    update public.request_people set birth_year = birth_year_value, birth_year_acknowledged_at = now()
    where request_id = created_request_id and role = 'author';
  end if;
  return query select created_request_id, created_protocol;
end;
$$;

create or replace function public.validate_author_birth_year(target_request_id uuid, validated_birth_year integer)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare saved_at timestamptz := now();
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if not exists (select 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status in ('in_review', 'changes_requested')) then raise exception 'request_locked_by_another_staff'; end if;
  update public.request_people set birth_year_validated_at = saved_at, birth_year_validated_by = auth.uid(), updated_at = saved_at
  where request_id = target_request_id and role = 'author' and birth_year = validated_birth_year and birth_year_acknowledged_at is not null;
  if not found then raise exception 'birth_year_not_available_for_validation'; end if;
  return saved_at;
end;
$$;

revoke all on function public.open_student_request_v3(jsonb), public.validate_author_birth_year(uuid, integer) from public;
grant execute on function public.open_student_request_v3(jsonb), public.validate_author_birth_year(uuid, integer) to authenticated;

create or replace function public.include_validated_birth_year_in_card_snapshot()
returns trigger language plpgsql security definer set search_path = '' as $$
declare validated_year integer;
begin
  select birth_year into validated_year from public.request_people
  where request_id = new.request_id and role = 'author' and birth_year_validated_at is not null;
  if validated_year is not null then
    new.snapshot := jsonb_set(new.snapshot, '{people}', (
      select jsonb_agg(case when person ->> 'role' = 'author' then jsonb_set(jsonb_set(person, '{birthYear}', to_jsonb(validated_year)), '{birthYearValidated}', 'true'::jsonb) else person end)
      from jsonb_array_elements(coalesce(new.snapshot -> 'people', '[]'::jsonb)) person
    ));
  end if;
  return new;
end;
$$;

create trigger cataloging_card_snapshot_birth_year
before insert on public.cataloging_card_homologations
for each row execute function public.include_validated_birth_year_in_card_snapshot();
