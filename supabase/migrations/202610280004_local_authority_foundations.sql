-- Local provenance and restricted creation evidence; no existing records are rewritten.
alter table public.controlled_term_sources drop constraint controlled_term_sources_source_code_check;
alter table public.controlled_term_sources add constraint controlled_term_sources_source_code_check check(source_code in ('bn','aat','ufba','pergamum','loc','pronto'));
alter table public.request_controlled_terms drop constraint request_controlled_terms_source_code_check;
alter table public.request_controlled_terms add constraint request_controlled_terms_source_code_check check(source_code in ('bn','aat','ufba','pergamum','loc','pronto'));
alter table public.subject_authorities drop constraint subject_authorities_source_code_check;
alter table public.subject_authorities add constraint subject_authorities_source_code_check check(source_code in ('bn','aat','ufba','pergamum','loc','pronto'));
alter table public.subject_authorities add constraint subject_authorities_local_origin check(source_code<>'pronto' or origin='manual');
create table public.subject_authority_foundations (
 authority_id uuid primary key references public.subject_authorities(id) on delete cascade,
 rationale text not null check(char_length(rationale) between 10 and 4000),
 references_data jsonb not null check(jsonb_typeof(references_data)='array' and jsonb_array_length(references_data) between 1 and 10 and octet_length(references_data::text)<=45000),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
alter table public.subject_authority_foundations enable row level security;
revoke all on public.subject_authority_foundations from public,anon,authenticated;
grant select on public.subject_authority_foundations to authenticated;
create policy subject_authority_foundations_restricted_read on public.subject_authority_foundations for select to authenticated
 using(public.current_user_role() in ('cataloger','administrator') and (created_by=auth.uid() or public.has_permission('admin.subjects.manage')));
create or replace function public.create_manual_subject_authority(manual_record jsonb, existing_term_id uuid default null, target_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 basis jsonb; ref jsonb; references_value jsonb; cleaned_references jsonb:='[]'::jsonb; rationale text; reference_id uuid;
 src text; external_id text; source_url text; status_value text; heading_type text;
 manual_id uuid; tid uuid; clean_pt text; clean_en text; note_value text;
 component jsonb; variant jsonb; position_index bigint; value_text text; kind_text text;
 clean_components jsonb:='[]'::jsonb; clean_variants jsonb:='[]'::jsonb; record_data jsonb;
 term public.controlled_terms%rowtype; prior public.subject_authorities%rowtype;
begin
 if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
 if manual_record->>'status'='local_validated' and coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if target_request_id is null then
  if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 else
  if coalesce(public.has_permission('staff.case.view'),false) is not true then raise exception 'permission_denied'; end if;
  if coalesce(manual_record->>'status','') not in ('local_proposal','local_validated') then raise exception 'request_local_proposal_required'; end if;
  perform 1 from public.cataloging_requests r where r.id=target_request_id and r.assigned_to=auth.uid()
   and r.status in ('in_review','changes_requested') and not exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id) for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
 end if;
 if manual_record is null or jsonb_typeof(manual_record)<>'object' or octet_length(manual_record::text)>50000 then raise exception 'invalid_manual_authority'; end if;
 src:=manual_record->>'source'; external_id:=nullif(btrim(manual_record->>'external_identifier'),'');
 source_url:=nullif(btrim(manual_record->>'source_url'),''); status_value:=manual_record->>'status';
 heading_type:=manual_record->>'heading_type'; clean_en:=public.sanitize_cataloging_text(manual_record->>'label_en');
 note_value:=nullif(btrim(manual_record->>'note'),'');
 if src is null or src not in ('bn','aat','ufba','pergamum','loc','pronto')
  or status_value is null or status_value not in ('existing','local_proposal','local_validated')
  or heading_type is null or heading_type not in ('topic','geographic','personal','corporate','title')
  or (external_id is not null and (char_length(external_id)>1000 or status_value in ('local_proposal','local_validated')))
  or (source_url is not null and (char_length(source_url)>2000 or source_url !~* '^https://[^[:space:]]+$'))
  or (clean_en is not null and char_length(clean_en) not between 2 and 120)
  or (note_value is not null and char_length(note_value)>4000)
  or jsonb_typeof(manual_record->'components') is distinct from 'array'
  or jsonb_typeof(manual_record->'variants') is distinct from 'array'
  then raise exception 'invalid_manual_authority'; end if;
 if jsonb_array_length(manual_record->'components') not between 1 and 17
  or jsonb_array_length(manual_record->'variants')>30 then raise exception 'invalid_manual_authority'; end if;

 if (src='pronto' and source_url is not null) or (status_value='existing' and src='pronto') or (status_value<>'existing' and src<>'pronto') then raise exception 'manual_authority_origin_mismatch'; end if;
 if status_value<>'existing' then
  basis:=manual_record->'foundation'; rationale:=nullif(btrim(basis->>'rationale'),''); references_value:=basis->'references';
  if jsonb_typeof(basis) is distinct from 'object' or rationale is null or char_length(rationale) not between 10 and 4000
   or jsonb_typeof(references_value) is distinct from 'array' then raise exception 'local_authority_foundation_required'; end if;
  if jsonb_array_length(references_value) not between 1 and 10 then raise exception 'invalid_authority_references'; end if;
  for ref in select value from jsonb_array_elements(references_value) loop
   if jsonb_typeof(ref) is distinct from 'object' or ref->>'kind' is null or ref->>'kind' not in ('bibliographic','request')
    or nullif(btrim(ref->>'evidence'),'') is null or char_length(ref->>'evidence') not between 3 and 1000
    or char_length(coalesce(ref->>'citation',''))>1000 or char_length(coalesce(ref->>'location',''))>240
    or (nullif(btrim(ref->>'url'),'') is not null and (char_length(ref->>'url')>2000 or ref->>'url' !~* '^https://[^[:space:]]+$'))
    then raise exception 'invalid_authority_references'; end if;
   reference_id:=null;
   if ref->>'kind'='bibliographic' then
    if char_length(coalesce(btrim(ref->>'citation'),''))<3 or nullif(ref->>'request_id','') is not null or nullif(ref->>'protocol','') is not null then raise exception 'invalid_authority_references'; end if;
   else
    if not coalesce(public.has_permission('staff.case.view'),false) then raise exception 'authority_reference_not_accessible'; end if;
    select r.id into reference_id from public.cataloging_requests r
     where ((nullif(ref->>'request_id','') is not null and r.id::text=ref->>'request_id')
       or (nullif(ref->>'request_id','') is null and upper(r.protocol)=upper(btrim(ref->>'protocol'))))
      and (r.assigned_to=auth.uid() or coalesce(public.has_permission('admin.subjects.manage'),false)) limit 1;
    if reference_id is null then raise exception 'authority_reference_not_accessible'; end if;
   end if;
   cleaned_references:=cleaned_references||jsonb_build_array(jsonb_build_object('kind',ref->>'kind','request_id',reference_id,
    'citation',nullif(btrim(ref->>'citation'),''),'url',nullif(btrim(ref->>'url'),''),'location',nullif(btrim(ref->>'location'),''),'evidence',btrim(ref->>'evidence')));
  end loop;
 elsif manual_record ? 'foundation' and manual_record->'foundation'<>'null'::jsonb then raise exception 'manual_authority_origin_mismatch';
 end if;
 manual_id:=nullif(manual_record->>'draft_id','')::uuid;
 if manual_id is null then raise exception 'invalid_manual_authority'; end if;
 for component,position_index in select value,ordinality from jsonb_array_elements(manual_record->'components') with ordinality loop
  value_text:=public.sanitize_cataloging_text(component->>'value'); kind_text:=component->>'kind';
  if jsonb_typeof(component)<>'object' or value_text is null or char_length(value_text) not between 1 and 120
   or kind_text is null or (position_index=1 and (kind_text<>'Assunto-base' or char_length(value_text)<2))
   or (position_index>1 and kind_text not in ('Subdivisão temática','Subdivisão geográfica','Subdivisão cronológica','Subdivisão de forma'))
   then raise exception 'invalid_manual_components'; end if;
  clean_components:=clean_components||jsonb_build_array(jsonb_build_object('kind',kind_text,'value',value_text));
 end loop;
 select public.sanitize_cataloging_text(string_agg(value->>'value',' - ' order by ordinality)) into clean_pt
  from jsonb_array_elements(clean_components) with ordinality;
 if clean_pt is null or char_length(clean_pt) not between 2 and 120 then raise exception 'invalid_manual_heading'; end if;
 for variant in select value from jsonb_array_elements(manual_record->'variants') loop
  value_text:=public.sanitize_cataloging_text(variant->>'value');
  if jsonb_typeof(variant)<>'object' or value_text is null or char_length(value_text) not between 2 and 120
   or lower(value_text)=lower(clean_pt) or exists(select 1 from jsonb_array_elements(clean_variants) v where lower(v->>'value')=lower(value_text))
   then raise exception 'invalid_manual_variant'; end if;
  clean_variants:=clean_variants||jsonb_build_array(jsonb_build_object('kind','Variante conferida manualmente','value',value_text,'language','pt'));
 end loop;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('manual-authority:'||manual_id::text,0));
 select * into prior from public.subject_authorities where id=manual_id;
 if found then
  if prior.origin<>'manual' or prior.imported_by<>auth.uid() or prior.record->'manual_input' is distinct from manual_record or prior.record->>'proposal_request_id' is distinct from target_request_id::text
   then raise exception 'authority_version_conflict'; end if;
  tid:=public.canonical_controlled_term(prior.controlled_term_id);
  select * into term from public.controlled_terms where id=tid;
  return jsonb_build_object('id',term.id,'preferred_label_pt',term.preferred_label_pt,'active',term.active,'preferred_label_en',term.preferred_label_en,'source_code',src,'authority_id',manual_id,'reused',true);
 end if;
 if external_id is not null then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('subject-authority:'||src||':'||external_id,0));
  if exists(select 1 from public.subject_authorities where source_code=src and source_identifier=external_id) then raise exception 'authority_identity_exists'; end if;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('subject-label:'||lower(clean_pt),0));
 if exists(select 1 from public.subject_authority_variants v join public.subject_authorities a on a.id=v.authority_id
  join public.controlled_terms t on t.id=public.canonical_controlled_term(a.controlled_term_id)
  where t.active and lower(public.sanitize_cataloging_text(v.label))=lower(clean_pt) and lower(t.preferred_label_pt)<>lower(clean_pt))
  then raise exception 'variant_as_new_subject'; end if;
 select * into term from public.controlled_terms where normalized_label_pt=lower(clean_pt) for update;
 if found then
  if status_value='local_proposal' then raise exception 'local_proposal_existing_term'; end if;
  if existing_term_id is distinct from term.id then raise exception 'authority_label_conflict'; end if;
  if not term.active or term.merged_into_id is not null then raise exception 'active_merge_target_required'; end if;
  if clean_en is not null and term.preferred_label_en is not null and lower(clean_en)<>lower(term.preferred_label_en) then raise exception 'controlled_term_english_conflict'; end if;
  tid:=term.id;
 else
  if existing_term_id is not null then raise exception 'controlled_term_mismatch'; end if;
  insert into public.controlled_terms(preferred_label_pt,normalized_label_pt,preferred_label_en,normalized_label_en,active,created_by,updated_by)
   values(clean_pt,lower(clean_pt),clean_en,lower(clean_en),status_value<>'local_proposal',auth.uid(),auth.uid()) returning id into tid;
 end if;
 record_data:=jsonb_build_object('origin','manual','format','Cadastro manual estruturado','source',src,'identifier',external_id,
  'source_url',source_url,'status',status_value,'heading_type',heading_type,'title',clean_pt,'components',clean_components,
  'labels',jsonb_build_array(jsonb_build_object('kind','Cabeçalho conferido manualmente','language','pt','value',clean_pt)),
  'variants',clean_variants,'notes',case when note_value is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('kind','Nota de uso manual','value',note_value)) end,
  'foundation_recorded',status_value<>'existing','manual_input',manual_record-'foundation','proposal_request_id',target_request_id,
  'locally_validated_by',case when status_value='local_validated' then auth.uid() else null end,
  'locally_validated_at',case when status_value='local_validated' then now() else null end);
 insert into public.subject_authorities(id,source_code,source_identifier,controlled_term_id,record,imported_by,origin)
  values(manual_id,src,external_id,tid,record_data,auth.uid(),'manual');
 if status_value<>'existing' then
  insert into public.subject_authority_foundations(authority_id,rationale,references_data,created_by) values(manual_id,rationale,cleaned_references,auth.uid());
 end if;
 if target_request_id is not null then
  insert into public.request_subject_proposals(request_id,controlled_term_id,authority_id,proposed_by)
   values(target_request_id,tid,manual_id,auth.uid());
 end if;
 for variant in select value from jsonb_array_elements(clean_variants) loop
  insert into public.subject_authority_variants(authority_id,label,language) values(manual_id,variant->>'value','pt');
 end loop;
 insert into public.controlled_term_sources(controlled_term_id,source_code) values(tid,src) on conflict do nothing;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),case when status_value='local_validated' then 'subject_authority_validated_locally' else 'subject_authority_created_manually' end,'controlled_term',tid::text,jsonb_build_object('authority_id',manual_id,'source',src,'status',status_value));
 select * into term from public.controlled_terms where id=tid;
 return jsonb_build_object('id',term.id,'preferred_label_pt',term.preferred_label_pt,'active',term.active,'preferred_label_en',term.preferred_label_en,'source_code',src,'authority_id',manual_id,'reused',false);
end;
$$;

create or replace function public.search_subject_catalogue(search_text text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q text:=lower(public.sanitize_cataloging_text(search_text)); result jsonb;
begin
 if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
 if q is null or char_length(q) not between 2 and 120 then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(to_jsonb(matched_rows)),'[]'::jsonb) into result from (
  select t.id,t.preferred_label_pt,t.preferred_label_en,
   case when exists(select 1 from public.subject_authorities local_a where public.canonical_controlled_term(local_a.controlled_term_id)=t.id and local_a.origin='manual' and local_a.record->>'status' in ('local_proposal','local_validated')) then 'pronto' else null end as source_code,
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
    if chosen_source is null or chosen_source not in ('bn', 'aat', 'ufba', 'pergamum', 'loc', 'pronto') then
      raise exception 'controlled_term_source_required';
    end if;
    if clean_label is null or char_length(clean_label) < 2 or char_length(clean_label) > 120
      or (clean_english is not null and char_length(clean_english) not between 2 and 120) then
      raise exception 'invalid_controlled_term';
    end if;
    normalized_label := lower(clean_label);
    if chosen_source='pronto' and not exists(select 1 from public.controlled_terms t join public.subject_authorities a on public.canonical_controlled_term(a.controlled_term_id)=t.id where t.active and t.merged_into_id is null and t.normalized_label_pt=normalized_label and a.origin='manual' and a.record->>'status' in ('local_proposal','local_validated')) then raise exception 'local_subject_requires_registration'; end if;
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


create function public.can_document_local_subject() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.current_user_role() in ('cataloger','administrator'),false);
$$;
revoke all on function public.can_document_local_subject() from public,anon,authenticated;
grant execute on function public.can_document_local_subject() to authenticated;
