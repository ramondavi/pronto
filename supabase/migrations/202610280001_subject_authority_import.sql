-- Imported authority data supplements the catalogue; request snapshots remain untouched.
create table public.subject_authorities (
 id uuid primary key default gen_random_uuid(),
 source_code text not null check(source_code in ('bn','aat','ufba','pergamum','loc')),
 source_identifier text not null check(octet_length(source_identifier) between 1 and 1000),
 controlled_term_id uuid not null references public.controlled_terms(id) on delete cascade,
 record jsonb not null check(jsonb_typeof(record)='object' and octet_length(record::text)<=2000000),
 imported_by uuid not null references public.profiles(id),
 imported_at timestamptz not null default now(),
 unique(source_code,source_identifier)
);
create table public.subject_authority_variants (
 id uuid primary key default gen_random_uuid(),
 authority_id uuid not null references public.subject_authorities(id) on delete cascade,
 label text not null check(char_length(label) between 1 and 4000),
 language text not null default ''
);
alter table public.subject_authorities enable row level security;
alter table public.subject_authority_variants enable row level security;
create policy subject_authorities_staff_read on public.subject_authorities for select to authenticated
 using(public.current_user_role() in ('cataloger','administrator'));
create policy subject_authority_variants_staff_read on public.subject_authority_variants for select to authenticated
 using(public.current_user_role() in ('cataloger','administrator'));
revoke all on public.subject_authorities,public.subject_authority_variants from anon,authenticated;
grant select on public.subject_authorities,public.subject_authority_variants to authenticated;

create function public.search_subject_catalogue(search_text text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q text:=lower(public.sanitize_cataloging_text(search_text)); result jsonb;
begin
 if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
 if q is null or char_length(q) not between 2 and 120 then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(to_jsonb(matched_rows)),'[]'::jsonb) into result from (
  select t.id,t.preferred_label_pt,t.preferred_label_en,
   (select v.label from public.subject_authority_variants v join public.subject_authorities a on a.id=v.authority_id
    where public.canonical_controlled_term(a.controlled_term_id)=t.id and position(q in lower(v.label))>0 order by v.label limit 1) matched_variant
  from public.controlled_terms t where t.active and t.merged_into_id is null and (
   position(q in lower(t.preferred_label_pt))>0 or position(q in lower(coalesce(t.preferred_label_en,'')))>0 or exists(
    select 1 from public.subject_authorities a join public.subject_authority_variants v on v.authority_id=a.id
    where public.canonical_controlled_term(a.controlled_term_id)=t.id and position(q in lower(v.label))>0))
  order by (lower(t.preferred_label_pt)=q) desc,t.preferred_label_pt limit 12
 ) matched_rows;
 return result;
end;
$$;

create function public.import_subject_authority(authority_record jsonb,label_pt text,label_en text default null,existing_term_id uuid default null,target_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare src text:=authority_record->>'source'; ident text:=btrim(authority_record->>'identifier');
 clean_pt text:=public.sanitize_cataloging_text(label_pt); clean_en text:=public.sanitize_cataloging_text(label_en);
 aid uuid; tid uuid; existing public.subject_authorities%rowtype; term public.controlled_terms%rowtype; variant jsonb;
begin
 if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
 if target_request_id is null then
  if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 else
  perform 1 from public.cataloging_requests r where r.id=target_request_id and r.assigned_to=auth.uid()
   and r.status in ('in_review','changes_requested') and not exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id) for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
 end if;
 if authority_record is null or jsonb_typeof(authority_record)<>'object' or octet_length(authority_record::text)>2000000
  or src is null or src not in ('bn','aat','ufba','pergamum','loc') or ident is null or octet_length(ident) not between 1 and 1000
  or nullif(authority_record->>'original','') is null
  or clean_pt is null or char_length(clean_pt) not between 2 and 120
  or (clean_en is not null and char_length(clean_en) not between 2 and 120)
  or jsonb_typeof(authority_record->'variants') is distinct from 'array'
  or jsonb_array_length(authority_record->'variants')>1000 then raise exception 'invalid_authority_record'; end if;
 -- Serialize imports of the same identity and same catalogue label; no automatic label-based merging.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('subject-authority:'||src||':'||ident,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('subject-label:'||lower(clean_pt),0));
 select * into existing from public.subject_authorities where source_code=src and source_identifier=ident;
 if found then
  if existing.record<>authority_record then raise exception 'authority_version_conflict'; end if;
  tid:=public.canonical_controlled_term(existing.controlled_term_id);
 else
  select * into term from public.controlled_terms where normalized_label_pt=lower(clean_pt) for update;
  if found then
   if existing_term_id is distinct from term.id then raise exception 'authority_label_conflict'; end if;
   if not term.active or term.merged_into_id is not null then raise exception 'active_merge_target_required'; end if;
   if clean_en is not null and term.preferred_label_en is not null and lower(clean_en)<>lower(term.preferred_label_en) then raise exception 'controlled_term_english_conflict'; end if;
   tid:=term.id;
  else
   if existing_term_id is not null then raise exception 'controlled_term_mismatch'; end if;
   insert into public.controlled_terms(preferred_label_pt,normalized_label_pt,preferred_label_en,normalized_label_en,created_by,updated_by)
    values(clean_pt,lower(clean_pt),clean_en,lower(clean_en),auth.uid(),auth.uid()) returning id into tid;
  end if;
  insert into public.subject_authorities(source_code,source_identifier,controlled_term_id,record,imported_by)
   values(src,ident,tid,authority_record,auth.uid()) returning id into aid;
  for variant in select value from jsonb_array_elements(authority_record->'variants') loop
   if jsonb_typeof(variant)<>'object' or nullif(variant->>'value','') is null or char_length(variant->>'value')>4000 or char_length(coalesce(variant->>'language',''))>100 then raise exception 'invalid_authority_variant'; end if;
   insert into public.subject_authority_variants(authority_id,label,language) select aid,variant->>'value',coalesce(variant->>'language','') where not exists(select 1 from public.subject_authority_variants where authority_id=aid and label=variant->>'value' and language=coalesce(variant->>'language',''));
  end loop;
  insert into public.controlled_term_sources(controlled_term_id,source_code) values(tid,src) on conflict do nothing;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
   values(auth.uid(),'subject_authority_imported','controlled_term',tid::text,jsonb_build_object('source',src,'authority_id',aid));
 end if;
 select * into term from public.controlled_terms where id=tid;
 if term.id is null or not term.active or term.merged_into_id is not null then raise exception 'active_merge_target_required'; end if;
 return jsonb_build_object('id',term.id,'preferred_label_pt',term.preferred_label_pt,'preferred_label_en',term.preferred_label_en,'source_code',src,'reused',existing.id is not null);
end;
$$;
revoke all on function public.search_subject_catalogue(text),public.import_subject_authority(jsonb,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.search_subject_catalogue(text),public.import_subject_authority(jsonb,text,text,uuid,uuid) to authenticated;

-- Qualify the JSON row alias to avoid PL/pgSQL variable ambiguity.
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
  if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id=target_request_id and assigned_to=auth.uid() and status in ('in_review','changes_requested') for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  select coalesce(array_agg(entries.item ->> 'role' order by entries.position), '{}') into roles
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
    if nullif(item ->> 'termId', '') is null and exists (
      select 1 from public.subject_authority_variants v join public.subject_authorities a on a.id=v.authority_id
      join public.controlled_terms t on t.id=public.canonical_controlled_term(a.controlled_term_id)
      where t.active and t.merged_into_id is null and lower(public.sanitize_cataloging_text(v.label))=normalized_label
        and t.normalized_label_pt<>normalized_label
    ) then raise exception 'subject_variant_requires_selection'; end if;
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

