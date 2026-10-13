alter table public.controlled_term_sources drop constraint if exists controlled_term_sources_source_code_check;
alter table public.controlled_term_sources add constraint controlled_term_sources_source_code_check check (source_code in ('bn', 'aat', 'ufba', 'pergamum', 'loc'));
alter table public.request_controlled_terms drop constraint if exists request_controlled_terms_source_code_check;
alter table public.request_controlled_terms add constraint request_controlled_terms_source_code_check check (source_code in ('bn', 'aat', 'ufba', 'pergamum', 'loc'));

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
    if chosen_source is null or chosen_source not in ('bn', 'aat', 'ufba', 'pergamum', 'loc') then
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
