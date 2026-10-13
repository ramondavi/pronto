-- Proveniência dos assuntos e conclusão persistente da conferência inicial.
create table public.controlled_term_sources (
  controlled_term_id uuid not null references public.controlled_terms(id) on delete cascade,
  source_code text not null check (source_code in ('bn', 'aat', 'ufba', 'pergamum')),
  created_at timestamptz not null default now(),
  primary key (controlled_term_id, source_code)
);
alter table public.controlled_term_sources enable row level security;
create policy "controlled_term_sources_staff_read" on public.controlled_term_sources for select to authenticated
  using (public.current_user_role() in ('cataloger', 'administrator'));
revoke all on table public.controlled_term_sources from anon, authenticated;
grant select on table public.controlled_term_sources to authenticated;

alter table public.request_controlled_terms add column source_code text
  check (source_code in ('bn', 'aat', 'ufba', 'pergamum'));
alter table public.request_analyses add column declarations_reviewed_at timestamptz;

create or replace function public.confirm_request_declarations(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare reviewed_at timestamptz := now();
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if not exists (select 1 from public.cataloging_requests where id = target_request_id
      and assigned_to = auth.uid() and status = 'in_review') then
    raise exception 'request_locked_by_another_staff';
  end if;
  insert into public.request_analyses (request_id, last_edited_by, declarations_reviewed_at)
  values (target_request_id, auth.uid(), reviewed_at)
  on conflict (request_id) do update set declarations_reviewed_at = reviewed_at;
  return reviewed_at;
end;
$$;
revoke all on function public.confirm_request_declarations(uuid) from public, anon, authenticated;
grant execute on function public.confirm_request_declarations(uuid) to authenticated;

-- A função principal permanece interna: apenas a entrada validada pode gravar termos.
revoke execute on function public.save_assisted_cataloging(uuid, jsonb) from authenticated;
create or replace function public.save_assisted_cataloging_v2(target_request_id uuid, payload jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  roles text[];
  author_count integer;
  advisor_index integer;
  coadvisor_index integer;
  item jsonb;
  chosen_source text;
  clean_label text;
  clean_english text;
  normalized_label text;
  seen_labels text[] := '{}'::text[];
  saved_at timestamptz;
  position_index integer := 0;
  selected_term_id uuid;
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
  for item in select value from jsonb_array_elements(coalesce(payload -> 'terms', '[]'::jsonb)) loop
    chosen_source := item ->> 'sourceCode';
    clean_label := public.sanitize_cataloging_text(item ->> 'labelPt');
    clean_english := public.sanitize_cataloging_text(item ->> 'labelEn');
    if chosen_source is null or chosen_source not in ('bn', 'aat', 'ufba', 'pergamum') then
      raise exception 'controlled_term_source_required';
    end if;
    if clean_label is null or char_length(clean_label) < 2 or char_length(clean_label) > 120
      or (clean_english is not null and char_length(clean_english) not between 2 and 120) then
      raise exception 'invalid_controlled_term';
    end if;
    normalized_label := lower(clean_label);
    if normalized_label = any(seen_labels) then raise exception 'duplicate_controlled_term'; end if;
    seen_labels := array_append(seen_labels, normalized_label);
    if exists (select 1 from public.controlled_terms where normalized_label_pt = normalized_label
      and preferred_label_en is not null and clean_english is not null
      and lower(preferred_label_en) <> lower(clean_english)) then
      raise exception 'controlled_term_english_conflict';
    end if;
    if nullif(item ->> 'termId', '') is not null and not exists (
      select 1 from public.controlled_terms where id = (item ->> 'termId')::uuid
        and active and normalized_label_pt = normalized_label
        and (clean_english is null or preferred_label_en is null or preferred_label_en = clean_english)
    ) then raise exception 'controlled_term_mismatch'; end if;
  end loop;
  saved_at := public.save_assisted_cataloging(target_request_id, payload);
  for item in select value from jsonb_array_elements(coalesce(payload -> 'terms', '[]'::jsonb)) loop
    select controlled_term_id into selected_term_id from public.request_controlled_terms
      where request_id = target_request_id and position = position_index;
    insert into public.controlled_term_sources (controlled_term_id, source_code)
      values (selected_term_id, item ->> 'sourceCode') on conflict do nothing;
    update public.request_controlled_terms set source_code = item ->> 'sourceCode'
      where request_id = target_request_id and position = position_index;
    position_index := position_index + 1;
  end loop;
  return saved_at;
end;
$$;
revoke all on function public.save_assisted_cataloging_v2(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_assisted_cataloging_v2(uuid, jsonb) to authenticated;
