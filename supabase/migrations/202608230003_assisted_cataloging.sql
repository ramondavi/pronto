-- Incremento 6: autoridades de pessoas, vocabulário bilíngue e assistência CDU.

create or replace function public.sanitize_cataloging_text(raw_value text)
returns text language sql immutable set search_path = '' as $$
  select nullif(btrim(regexp_replace(regexp_replace(coalesce(raw_value, ''), '[[:cntrl:]<>]', '', 'g'), '[[:space:]]+', ' ', 'g'), E' .;,:'), '')
$$;

create table public.person_authorities (
  id uuid primary key default gen_random_uuid(),
  authorized_name text not null check (char_length(authorized_name) between 3 and 300),
  normalized_name text not null unique check (char_length(normalized_name) between 3 and 300),
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.request_cataloging_people (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cataloging_requests(id) on delete cascade,
  authority_person_id uuid not null references public.person_authorities(id) on delete restrict,
  role text not null check (role in ('author', 'advisor', 'coadvisor', 'committee_member', 'related_person')),
  transcribed_name text not null check (char_length(transcribed_name) between 3 and 300),
  authorized_name_snapshot text not null check (char_length(authorized_name_snapshot) between 3 and 300),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, role, position)
);

create table public.controlled_terms (
  id uuid primary key default gen_random_uuid(),
  preferred_label_pt text not null check (char_length(preferred_label_pt) between 2 and 120),
  normalized_label_pt text not null unique check (char_length(normalized_label_pt) between 2 and 120),
  preferred_label_en text check (preferred_label_en is null or char_length(preferred_label_en) between 2 and 120),
  normalized_label_en text,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index controlled_terms_normalized_en_unique
  on public.controlled_terms (normalized_label_en) where normalized_label_en is not null;

create table public.request_controlled_terms (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.cataloging_requests(id) on delete cascade,
  controlled_term_id uuid not null references public.controlled_terms(id) on delete restrict,
  label_pt_snapshot text not null,
  label_en_snapshot text,
  is_primary boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (request_id, controlled_term_id),
  unique (request_id, position)
);
create unique index request_controlled_terms_one_primary
  on public.request_controlled_terms (request_id) where is_primary;

create table public.request_cataloging_metadata (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.cataloging_requests(id) on delete cascade,
  cdu_code text check (cdu_code is null or char_length(cdu_code) between 1 and 80),
  cutter_code text check (cutter_code is null or char_length(cutter_code) between 1 and 40),
  marc21_preparation jsonb not null default '{}'::jsonb check (jsonb_typeof(marc21_preparation) = 'object'),
  last_edited_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.person_authorities enable row level security;
alter table public.request_cataloging_people enable row level security;
alter table public.controlled_terms enable row level security;
alter table public.request_controlled_terms enable row level security;
alter table public.request_cataloging_metadata enable row level security;

create policy "person_authorities_staff_read" on public.person_authorities for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
create policy "request_cataloging_people_staff_read" on public.request_cataloging_people for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
create policy "controlled_terms_staff_read" on public.controlled_terms for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
create policy "request_controlled_terms_staff_read" on public.request_controlled_terms for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
create policy "request_cataloging_metadata_staff_read" on public.request_cataloging_metadata for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));

revoke all on table public.person_authorities, public.request_cataloging_people,
  public.controlled_terms, public.request_controlled_terms, public.request_cataloging_metadata
  from anon, authenticated;
grant select on table public.person_authorities, public.request_cataloging_people,
  public.controlled_terms, public.request_controlled_terms, public.request_cataloging_metadata
  to authenticated;

create or replace function public.save_assisted_cataloging(target_request_id uuid, payload jsonb)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  saved_at timestamptz := now();
  item jsonb;
  authority_uuid uuid;
  term_uuid uuid;
  clean_transcribed text;
  clean_authorized text;
  clean_pt text;
  clean_en text;
  normalized_value text;
  item_position integer := 0;
  marc_people jsonb;
  marc_subjects jsonb;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if not exists (select 1 from public.cataloging_requests where id = target_request_id
    and assigned_to = auth.uid() and status in ('in_review', 'changes_requested')) then
    raise exception 'request_locked_by_another_staff';
  end if;

  delete from public.request_cataloging_people where request_id = target_request_id;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'people', '[]'::jsonb)) loop
    if coalesce(item ->> 'role', '') not in ('author', 'advisor', 'coadvisor', 'committee_member', 'related_person') then
      raise exception 'invalid_cataloging_person_role';
    end if;
    clean_transcribed := public.sanitize_cataloging_text(item ->> 'transcribedName');
    clean_authorized := public.sanitize_cataloging_text(item ->> 'authorizedName');
    if clean_transcribed is null or clean_authorized is null or char_length(clean_transcribed) < 3 or char_length(clean_authorized) < 3 then
      raise exception 'valid_person_names_required';
    end if;
    authority_uuid := nullif(item ->> 'authorityId', '')::uuid;
    if authority_uuid is not null then
      select id, authorized_name into authority_uuid, clean_authorized from public.person_authorities
      where id = authority_uuid and active;
      if authority_uuid is null then raise exception 'active_person_authority_required'; end if;
    else
      normalized_value := lower(clean_authorized);
      insert into public.person_authorities (authorized_name, normalized_name, created_by, updated_by)
      values (clean_authorized, normalized_value, auth.uid(), auth.uid())
      on conflict (normalized_name) do update set updated_at = saved_at, updated_by = auth.uid()
      returning id, authorized_name into authority_uuid, clean_authorized;
    end if;
    insert into public.request_cataloging_people (
      request_id, authority_person_id, role, transcribed_name, authorized_name_snapshot, position
    ) values (target_request_id, authority_uuid, item ->> 'role', clean_transcribed, clean_authorized, item_position);
    item_position := item_position + 1;
  end loop;

  delete from public.request_controlled_terms where request_id = target_request_id;
  item_position := 0;
  for item in select value from jsonb_array_elements(coalesce(payload -> 'terms', '[]'::jsonb)) loop
    term_uuid := nullif(item ->> 'termId', '')::uuid;
    if term_uuid is not null then
      select id, preferred_label_pt, preferred_label_en into term_uuid, clean_pt, clean_en
      from public.controlled_terms where id = term_uuid and active;
      if term_uuid is null then raise exception 'active_controlled_term_required'; end if;
    else
      clean_pt := public.sanitize_cataloging_text(item ->> 'labelPt');
      clean_en := public.sanitize_cataloging_text(item ->> 'labelEn');
      if clean_pt is null or char_length(clean_pt) < 2 then raise exception 'portuguese_controlled_term_required'; end if;
      normalized_value := lower(clean_pt);
      insert into public.controlled_terms (
        preferred_label_pt, normalized_label_pt, preferred_label_en, normalized_label_en, created_by, updated_by
      ) values (clean_pt, normalized_value, clean_en, lower(clean_en), auth.uid(), auth.uid())
      on conflict (normalized_label_pt) do update set
        preferred_label_en = coalesce(public.controlled_terms.preferred_label_en, excluded.preferred_label_en),
        normalized_label_en = coalesce(public.controlled_terms.normalized_label_en, excluded.normalized_label_en),
        updated_at = saved_at, updated_by = auth.uid()
      returning id, preferred_label_pt, preferred_label_en into term_uuid, clean_pt, clean_en;
    end if;
    insert into public.request_controlled_terms (
      request_id, controlled_term_id, label_pt_snapshot, label_en_snapshot, is_primary, position
    ) values (target_request_id, term_uuid, clean_pt, clean_en,
      coalesce((item ->> 'isPrimary')::boolean, false), item_position);
    item_position := item_position + 1;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'role', role, 'transcribedName', transcribed_name,
    'authorizedName', authorized_name_snapshot, 'authorityId', authority_person_id
  ) order by position), '[]'::jsonb) into marc_people
  from public.request_cataloging_people where request_id = target_request_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'labelPt', label_pt_snapshot, 'labelEn', label_en_snapshot,
    'isPrimary', is_primary, 'termId', controlled_term_id
  ) order by position), '[]'::jsonb) into marc_subjects
  from public.request_controlled_terms where request_id = target_request_id;

  insert into public.request_cataloging_metadata (
    request_id, cdu_code, cutter_code, marc21_preparation, last_edited_by, updated_at
  ) values (
    target_request_id, public.sanitize_cataloging_text(payload ->> 'cduCode'),
    public.sanitize_cataloging_text(payload ->> 'cutterCode'),
    jsonb_build_object('people', marc_people, 'subjects', marc_subjects,
      'classification', jsonb_build_object('cdu', public.sanitize_cataloging_text(payload ->> 'cduCode'),
        'cutter', public.sanitize_cataloging_text(payload ->> 'cutterCode'))), auth.uid(), saved_at
  ) on conflict (request_id) do update set
    cdu_code = excluded.cdu_code, cutter_code = excluded.cutter_code,
    marc21_preparation = excluded.marc21_preparation,
    last_edited_by = excluded.last_edited_by, updated_at = saved_at;

  update public.cataloging_requests set locked_at = saved_at, updated_at = saved_at where id = target_request_id;
  return saved_at;
end;
$$;

create or replace function public.suggest_cdu(primary_term_id uuid, secondary_term_ids uuid[] default '{}'::uuid[])
returns table (cdu_code text, score bigint, primary_count bigint, secondary_count bigint, sheet_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  return query
  select metadata.cdu_code,
    2 * count(distinct requests.id) filter (where terms.controlled_term_id = primary_term_id)
      + count(distinct (requests.id, terms.controlled_term_id)) filter (where terms.controlled_term_id = any(secondary_term_ids)) as score,
    count(distinct requests.id) filter (where terms.controlled_term_id = primary_term_id) as primary_count,
    count(distinct (requests.id, terms.controlled_term_id)) filter (where terms.controlled_term_id = any(secondary_term_ids)) as secondary_count,
    count(distinct requests.id) as sheet_count
  from public.request_cataloging_metadata metadata
  join public.cataloging_requests requests on requests.id = metadata.request_id
  join public.request_controlled_terms terms on terms.request_id = requests.id
  where requests.status in ('approved', 'completed') and metadata.cdu_code is not null
    and (terms.controlled_term_id = primary_term_id or terms.controlled_term_id = any(secondary_term_ids))
  group by metadata.cdu_code
  order by score desc, sheet_count desc, metadata.cdu_code
  limit 3;
end;
$$;

revoke all on function public.sanitize_cataloging_text(text) from public, anon, authenticated;
revoke all on function public.save_assisted_cataloging(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.suggest_cdu(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.save_assisted_cataloging(uuid, jsonb) to authenticated;
grant execute on function public.suggest_cdu(uuid, uuid[]) to authenticated;
