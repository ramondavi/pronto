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
  from public.request_people where request_id = created_id and role = 'author' order by created_at, id limit 1;
  delete from public.request_people where request_id = created_id and role = 'author';

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
  update public.request_people set position = author_count where request_id = created_id and role = 'advisor';
  update public.request_people set position = author_count + 1 where request_id = created_id and role = 'coadvisor';
  committee_position := author_count + 1 + case when exists (select 1 from public.request_people where request_id = created_id and role = 'coadvisor') then 1 else 0 end;
  for committee_member in select btrim(value) from jsonb_array_elements_text(coalesce(payload #> '{people,committeeMembers}', '[]'::jsonb)) value loop
    insert into public.request_people (request_id, role, transcribed_name, position) values (created_id, 'committee_member', committee_member, committee_position);
    committee_position := committee_position + 1;
  end loop;
  return query select created_id, created_protocol;
end;
$$;
revoke all on function public.open_student_request_v7(jsonb) from public;
grant execute on function public.open_student_request_v7(jsonb) to authenticated;

create or replace function public.save_assisted_cataloging_v2(target_request_id uuid, payload jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  roles text[];
  author_count integer;
  advisor_index integer;
  coadvisor_index integer;
begin
  select coalesce(array_agg(item ->> 'role' order by position), '{}') into roles
  from jsonb_array_elements(coalesce(payload -> 'people', '[]'::jsonb)) with ordinality as entries(item, position);
  select count(*) into author_count from unnest(roles) as listed(role) where role = 'author';
  advisor_index := array_position(roles, 'advisor');
  coadvisor_index := array_position(roles, 'coadvisor');
  if author_count < 1 or advisor_index is null or advisor_index <> author_count + 1
    or (coadvisor_index is not null and coadvisor_index <> author_count + 2)
    or exists (select 1 from unnest(roles) with ordinality as listed(role, position) where position <= author_count and role <> 'author')
    or exists (select 1 from unnest(roles) with ordinality as listed(role, position) where position > author_count + 1 + case when coadvisor_index is null then 0 else 1 end and role not in ('committee_member', 'related_person')) then
    raise exception 'invalid_related_people_order';
  end if;
  return public.save_assisted_cataloging(target_request_id, payload);
end;
$$;
revoke all on function public.save_assisted_cataloging_v2(uuid, jsonb) from public;
grant execute on function public.save_assisted_cataloging_v2(uuid, jsonb) to authenticated;
