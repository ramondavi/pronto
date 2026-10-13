-- Qualifica colunas que conflitam com o parâmetro de saída request_id.
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
    update public.request_people rp set birth_year = extract(year from saved_birth_date)::integer, birth_year_acknowledged_at = now()
      where rp.request_id = created_request_id and role = 'author';
  end if;
  return query select created_request_id, created_protocol;
end;
$$;

create or replace function public.open_student_request_v7(payload jsonb)
returns table (request_id uuid, generated_protocol text) language plpgsql security definer set search_path = '' as $$
declare
  created_id uuid; created_protocol text; author_name text; committee_member text;
  author_position integer := 0; committee_position integer; author_count integer;
  author_birth_year integer; author_birth_acknowledged_at timestamptz; author_birth_validated_at timestamptz; author_birth_validated_by uuid;
begin
  if exists (select 1 from jsonb_array_elements_text(coalesce(payload #> '{people,committeeMembers}', '[]'::jsonb)) value where char_length(btrim(value)) not between 3 and 300) then
    raise exception 'valid_committee_members_required';
  end if;
  select opened.request_id, opened.generated_protocol into created_id, created_protocol from public.open_student_request_v6(payload) opened;

  select birth_year, birth_year_acknowledged_at, birth_year_validated_at, birth_year_validated_by
    into author_birth_year, author_birth_acknowledged_at, author_birth_validated_at, author_birth_validated_by
  from public.request_people rp where rp.request_id = created_id and role = 'author' order by created_at, id limit 1;
  delete from public.request_people rp where rp.request_id = created_id and role = 'author';

  for author_name in select btrim(payload #>> '{people,author}') union all select btrim(value) from jsonb_array_elements_text(coalesce(payload #> '{people,additionalAuthors}', '[]'::jsonb)) value loop
    insert into public.request_people (request_id, role, transcribed_name, position, birth_year, birth_year_acknowledged_at, birth_year_validated_at, birth_year_validated_by)
    values (created_id, 'author', author_name, author_position,
      case when author_position = 0 then author_birth_year else null end,
      case when author_position = 0 then author_birth_acknowledged_at else null end,
      case when author_position = 0 then author_birth_validated_at else null end,
      case when author_position = 0 then author_birth_validated_by else null end);
    author_position := author_position + 1;
  end loop;
  author_count := author_position;
  update public.request_people rp set position = author_count where rp.request_id = created_id and role = 'advisor';
  update public.request_people rp set position = author_count + 1 where rp.request_id = created_id and role = 'coadvisor';
  committee_position := author_count + 1 + case when exists (select 1 from public.request_people rp where rp.request_id = created_id and role = 'coadvisor') then 1 else 0 end;
  for committee_member in select btrim(value) from jsonb_array_elements_text(coalesce(payload #> '{people,committeeMembers}', '[]'::jsonb)) value loop
    insert into public.request_people (request_id, role, transcribed_name, position) values (created_id, 'committee_member', committee_member, committee_position);
    committee_position := committee_position + 1;
  end loop;
  return query select created_id, created_protocol;
end;
$$;
