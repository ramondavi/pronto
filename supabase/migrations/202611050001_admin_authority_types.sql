-- O catálogo administrativo mostra publicação e códigos de entrada sem expor registros ao público.
create function public.admin_subject_catalog_v2(search_query text,status_filter text,review_filter text,type_filter text,page_offset integer)
returns table(id uuid,preferred_label_pt text,preferred_label_en text,active boolean,usage_count bigint,sources text[],total_count bigint,merged_into_id uuid,merged_into_label text,published boolean,heading_tags text[])
language plpgsql stable security definer set search_path = '' as $$
begin
 if not (public.has_permission('admin.subjects.view') or public.has_permission('admin.subjects.manage')) then raise exception 'permission_denied'; end if;
 if type_filter <> 'all' and type_filter not in ('100','110','111','130','147','148','150','151','155','162','180','181','182','185') then raise exception 'invalid_heading_type'; end if;
 if status_filter not in ('all','active','inactive','merged','published','unpublished') then raise exception 'invalid_status_filter'; end if;
 return query with catalog as (
  select t.*, target.preferred_label_pt target_label,
   (select count(distinct u.request_id) from public.request_controlled_terms u
    where u.controlled_term_id=t.id or public.canonical_controlled_term(u.controlled_term_id)=t.id) usage,
   array(select distinct s.source_code from public.controlled_term_sources s
    where s.controlled_term_id=t.id or public.canonical_controlled_term(s.controlled_term_id)=t.id
    union select u.source_code from public.request_controlled_terms u where u.source_code is not null
    and (u.controlled_term_id=t.id or public.canonical_controlled_term(u.controlled_term_id)=t.id) order by 1) source_list,
   exists(select 1 from public.subject_authorities a join public.subject_authority_publications p on p.authority_id=a.id where a.controlled_term_id=t.id) is_published,
   array(select distinct coalesce(case a.record->>'heading_type' when 'personal' then '100' when 'corporate' then '110' when 'meeting' then '111' when 'title' then '130' when 'named_event' then '147' when 'chronological' then '148' when 'topic' then '150' when 'geographic' then '151' when 'genre_form' then '155' when 'medium' then '162' when 'topical_subdivision' then '180' when 'geographic_subdivision' then '181' when 'chronological_subdivision' then '182' when 'form_subdivision' then '185' end,
    (select f->>'tag' from jsonb_array_elements(case when jsonb_typeof(a.record->'fields')='array' then a.record->'fields' else '[]'::jsonb end) f where f->>'tag' in ('100','110','111','130','147','148','150','151','155','162','180','181','182','185') limit 1))
    from public.subject_authorities a where a.controlled_term_id=t.id order by 1) tags
  from public.controlled_terms t left join public.controlled_terms target on target.id=t.merged_into_id
 ) select t.id,t.preferred_label_pt,t.preferred_label_en,t.active,t.usage,t.source_list,count(*) over(),t.merged_into_id,t.target_label,t.is_published,t.tags
 from catalog t where (t.preferred_label_pt ilike '%'||left(btrim(search_query),120)||'%' or coalesce(t.preferred_label_en,'') ilike '%'||left(btrim(search_query),120)||'%')
 and ((status_filter='merged' and t.merged_into_id is not null) or (t.merged_into_id is null and
  (status_filter='all' or (status_filter='active' and t.active) or (status_filter='inactive' and not t.active)
   or (status_filter='published' and t.is_published) or (status_filter='unpublished' and not t.is_published))))
 and (type_filter='all' or type_filter=any(t.tags))
 and (review_filter='all' or (review_filter='unused' and t.usage=0) or (review_filter='used' and t.usage>0) or (review_filter='without_source' and cardinality(t.source_list)=0))
 order by t.preferred_label_pt,t.id limit 40 offset greatest(page_offset,0);
end $$;
revoke all on function public.admin_subject_catalog_v2(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_subject_catalog_v2(text,text,text,text,integer) to authenticated;

-- Relações entre registros preservam seus usos MARC distintos.
create function public.admin_update_subject_authority_type(target_authority_id uuid,heading_tag_value text,edit_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare new_kind text; old_record jsonb;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if char_length(btrim(edit_reason)) not between 10 and 1000 then raise exception 'edit_reason_required'; end if;
 new_kind:=case heading_tag_value
  when '100' then 'personal' when '110' then 'corporate' when '111' then 'meeting'
  when '130' then 'title' when '147' then 'named_event' when '148' then 'chronological'
  when '150' then 'topic' when '151' then 'geographic' when '155' then 'genre_form'
  when '162' then 'medium' when '180' then 'topical_subdivision'
  when '181' then 'geographic_subdivision' when '182' then 'chronological_subdivision'
  when '185' then 'form_subdivision' end;
 if new_kind is null then raise exception 'invalid_heading_type'; end if;
 select record into old_record from public.subject_authorities where id=target_authority_id for update;
 if not found then raise exception 'authority_not_found'; end if;
 if old_record->>'heading_type' is distinct from new_kind then
  update public.subject_authorities set record=jsonb_set(old_record,'{heading_type}',to_jsonb(new_kind),true)
   where id=target_authority_id;
  delete from public.subject_authority_map_points where authority_id=target_authority_id
   and public.subject_authority_geographic_part(jsonb_set(old_record,'{heading_type}',to_jsonb(new_kind),true),component_position) is null;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
   values(auth.uid(),'subject_authority_type_changed','subject_authority',target_authority_id::text,
    jsonb_build_object('old_type',old_record->>'heading_type','new_type',new_kind,'reason',btrim(edit_reason)));
 end if;
end $$;
revoke all on function public.admin_update_subject_authority_type(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_update_subject_authority_type(uuid,text,text) to authenticated;

create table public.subject_authority_place_links (
 first_authority_id uuid not null references public.subject_authorities(id) on delete cascade,
 second_authority_id uuid not null references public.subject_authorities(id) on delete cascade,
 relationship text not null check (relationship in ('same_place','associated_place')),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 primary key (first_authority_id,second_authority_id),
 check (first_authority_id < second_authority_id)
);
alter table public.subject_authority_place_links enable row level security;
revoke all on public.subject_authority_place_links from public,anon,authenticated;

create function public.admin_search_authority_places(search_value text)
returns table(authority_id uuid,place_label text,heading_tag text,latitude double precision,longitude double precision,in_brazil boolean,location_source text)
language plpgsql stable security definer set search_path = '' as $$
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 return query select p.authority_id,p.place_label,
  coalesce((select f->>'tag' from jsonb_array_elements(case when jsonb_typeof(a.record->'fields')='array' then a.record->'fields' else '[]'::jsonb end) f where f->>'tag' in ('151','181') limit 1),
   case a.record->>'heading_type' when 'geographic' then '151' when 'geographic_subdivision' then '181' else '110' end),
  p.latitude,p.longitude,p.in_brazil,p.location_source
 from public.subject_authority_map_points p join public.subject_authorities a on a.id=p.authority_id
 where p.place_label ilike '%'||left(btrim(search_value),100)||'%' and char_length(btrim(search_value))>=2
  and (a.record->>'heading_type' in ('geographic','geographic_subdivision')
   or exists(select 1 from jsonb_array_elements(coalesce(a.record->'fields','[]'::jsonb)) f where f->>'tag' in ('151','181')))
 order by p.place_label,p.reviewed_at desc limit 20;
end $$;
revoke all on function public.admin_search_authority_places(text) from public,anon,authenticated;
grant execute on function public.admin_search_authority_places(text) to authenticated;

create function public.admin_link_authority_place(source_authority_id uuid,target_authority_id uuid,relationship_value text,edit_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare source_record jsonb; target_record jsonb; source_place text; target_place text;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if source_authority_id=target_authority_id or relationship_value not in ('same_place','associated_place')
  or char_length(btrim(edit_reason)) not between 10 and 1000 then raise exception 'invalid_place_link'; end if;
 select a.record into source_record from public.subject_authorities a where a.id=source_authority_id;
 select a.record into target_record from public.subject_authorities a where a.id=target_authority_id;
 if source_record is null or target_record is null then raise exception 'authority_not_found'; end if;
 if not exists(select 1 from public.subject_authority_map_points p where p.authority_id=target_authority_id) then raise exception 'target_place_not_reviewed'; end if;
 if not exists(select 1 from public.subject_authority_map_points source_point
  join public.subject_authority_map_points target_point on target_point.authority_id=target_authority_id
   and source_point.place_label=target_point.place_label
   and source_point.latitude=target_point.latitude and source_point.longitude=target_point.longitude
  where source_point.authority_id=source_authority_id)
 then raise exception 'place_points_do_not_match'; end if;
 if relationship_value='same_place' and not (
   coalesce(source_record->>'heading_type','') in ('geographic','geographic_subdivision')
   or exists(select 1 from jsonb_array_elements(coalesce(source_record->'fields','[]'::jsonb)) f where f->>'tag' in ('151','181')))
  then raise exception 'geographic_authority_required'; end if;
 if relationship_value='associated_place' and not (
   source_record->>'heading_type'='corporate'
   or exists(select 1 from jsonb_array_elements(coalesce(source_record->'fields','[]'::jsonb)) f where f->>'tag'='110'))
  then raise exception 'corporate_authority_required'; end if;
 insert into public.subject_authority_place_links(first_authority_id,second_authority_id,relationship,created_by)
 values(least(source_authority_id,target_authority_id),greatest(source_authority_id,target_authority_id),relationship_value,auth.uid())
 on conflict(first_authority_id,second_authority_id) do update set relationship=excluded.relationship,created_by=excluded.created_by,created_at=now();
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'subject_authority_place_linked','subject_authority',source_authority_id::text,
  jsonb_build_object('target_authority_id',target_authority_id,'relationship',relationship_value,'reason',btrim(edit_reason)));
end $$;
revoke all on function public.admin_link_authority_place(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_link_authority_place(uuid,uuid,text,text) to authenticated;

-- Instituições usam o lugar associado (370 $e) sem se tornarem autoridades geográficas.
create function public.admin_set_authority_associated_place(target_authority_id uuid,place_value text,edit_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare old_record jsonb; place text:=nullif(btrim(place_value),'');
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if place is null or char_length(place) not between 2 and 250 or char_length(btrim(edit_reason)) not between 10 and 1000 then raise exception 'invalid_associated_place'; end if;
 select record into old_record from public.subject_authorities where id=target_authority_id for update;
 if not found then raise exception 'authority_not_found'; end if;
 if coalesce(old_record->>'heading_type','') <> 'corporate'
  and not exists(select 1 from jsonb_array_elements(coalesce(old_record->'fields','[]'::jsonb)) f where f->>'tag'='110')
 then raise exception 'corporate_authority_required'; end if;
 update public.subject_authorities set record=jsonb_set(old_record,'{associated_place}',to_jsonb(place),true)
  where id=target_authority_id;
 delete from public.subject_authority_map_points where authority_id=target_authority_id and component_position=-1;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'subject_authority_place_changed','subject_authority',target_authority_id::text,
  jsonb_build_object('place',place,'reason',btrim(edit_reason)));
end $$;
revoke all on function public.admin_set_authority_associated_place(uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_set_authority_associated_place(uuid,text,text) to authenticated;

alter table public.subject_authority_map_points drop constraint if exists subject_authority_map_points_component_position_check;
alter table public.subject_authority_map_points add constraint subject_authority_map_points_component_position_check check (component_position between -1 and 16);

create or replace function public.subject_authority_geographic_part(authority_record jsonb,part_position integer)
returns text language plpgsql immutable set search_path = '' as $$
declare part jsonb; heading_tag text; place text;
begin
 if part_position=-1 then
  heading_tag:=coalesce(authority_record->>'heading_type',
   (select f->>'tag' from jsonb_array_elements(coalesce(authority_record->'fields','[]'::jsonb)) f where f->>'tag'='110' limit 1));
  if heading_tag not in ('corporate','110') then return null; end if;
  place:=nullif(btrim(authority_record->>'associated_place'),'');
  if place is null then
   select nullif(btrim(s->>'value'),'') into place
   from jsonb_array_elements(coalesce(authority_record->'fields','[]'::jsonb)) f,
    jsonb_array_elements(coalesce(f->'subfields','[]'::jsonb)) s
   where f->>'tag'='370' and s->>'code'='e' limit 1;
  end if;
  return place;
 end if;
 if part_position not between 0 and 16 or jsonb_typeof(authority_record->'components') is distinct from 'array'
  or part_position >= jsonb_array_length(authority_record->'components') then return null; end if;
 part:=authority_record->'components'->part_position;
 heading_tag:=coalesce(authority_record->>'heading_type',
  (select f->>'tag' from jsonb_array_elements(coalesce(authority_record->'fields','[]'::jsonb)) f where f->>'tag' in ('151','181') limit 1));
 if (part_position=0 and heading_tag in ('geographic','151','geographic_subdivision','181'))
  or (part_position>0 and part->>'kind' in ('z','geographic','Subdivisão geográfica'))
 then return nullif(btrim(part->>'value'),''); end if;
 return null;
end $$;

-- Os novos tipos de entrada usam a mesma validação de origem, motivo e fundamentação.
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
  or heading_type is null or heading_type not in ('personal','corporate','meeting','title','named_event','chronological','topic','geographic','genre_form','medium','topical_subdivision','geographic_subdivision','chronological_subdivision','form_subdivision')
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
   or kind_text is null or (position_index=1 and (kind_text<>case heading_type when 'topical_subdivision' then 'Subdivisão temática' when 'geographic_subdivision' then 'Subdivisão geográfica' when 'chronological_subdivision' then 'Subdivisão cronológica' when 'form_subdivision' then 'Subdivisão de forma' else 'Assunto-base' end or char_length(value_text)<2))
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
  'source_url',source_url,'status',status_value,'heading_type',heading_type,'associated_place',nullif(btrim(manual_record->>'associated_place'),''),'title',clean_pt,'components',clean_components,
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

-- A importação preserva o campo MARC de origem e devolve o ID para a revisão do lugar.
create or replace function public.import_subject_authority(authority_record jsonb,label_pt text,label_en text default null,existing_term_id uuid default null,target_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare src text:=authority_record->>'source'; ident text:=btrim(authority_record->>'identifier');
 clean_pt text:=public.sanitize_cataloging_text(label_pt); clean_en text:=public.sanitize_cataloging_text(label_en);
 aid uuid; tid uuid; existing public.subject_authorities%rowtype; term public.controlled_terms%rowtype; variant jsonb; source_tag text; selected_tag text;
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
 source_tag:=(select f->>'tag' from jsonb_array_elements(case when jsonb_typeof(authority_record->'fields')='array' then authority_record->'fields' else '[]'::jsonb end) f
  where f->>'tag' in ('100','110','111','130','147','148','150','151','155','162','180','181','182','185') limit 1);
 selected_tag:=case authority_record->>'heading_type'
  when 'personal' then '100' when 'corporate' then '110' when 'meeting' then '111' when 'title' then '130'
  when 'named_event' then '147' when 'chronological' then '148' when 'topic' then '150'
  when 'geographic' then '151' when 'genre_form' then '155' when 'medium' then '162'
  when 'topical_subdivision' then '180' when 'geographic_subdivision' then '181'
  when 'chronological_subdivision' then '182' when 'form_subdivision' then '185' end;
 if selected_tag is null or (jsonb_typeof(authority_record->'fields')='array' and source_tag is null) then raise exception 'invalid_heading_type'; end if;
 if source_tag is not null and source_tag<>selected_tag and char_length(btrim(coalesce(authority_record->>'type_reason',''))) not between 10 and 1000
 then raise exception 'edit_reason_required'; end if;
 -- Serialize imports of the same identity and same catalogue label; no automatic label-based merging.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('subject-authority:'||src||':'||ident,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('subject-label:'||lower(clean_pt),0));
 select * into existing from public.subject_authorities where source_code=src and source_identifier=ident;
 if found then
  if existing.record-'heading_type'-'type_reason'-'associated_place'<>authority_record-'heading_type'-'type_reason'-'associated_place' then raise exception 'authority_version_conflict'; end if;
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
 return jsonb_build_object('id',term.id,'preferred_label_pt',term.preferred_label_pt,'preferred_label_en',term.preferred_label_en,'source_code',src,'authority_id',coalesce(aid,existing.id),'reused',existing.id is not null);
end;
$$;

-- A revisão pública considera todos os códigos de entrada aceitos e os seus indicadores.
create or replace function public.admin_set_subject_publication(target_authority_id uuid, publish_value boolean, rights_value text default null, mapping_value jsonb default null)
returns void language plpgsql security definer set search_path='' as $$
declare authority_row public.subject_authorities%rowtype; term_row public.controlled_terms%rowtype; clean_rights text:=nullif(btrim(rights_value),'');
 heading_tag text; allowed text[]; indicator text; item jsonb;
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 select * into authority_row from public.subject_authorities where id=target_authority_id for update;
 if not found then raise exception 'authority_not_found'; end if;
 if publish_value then
  select * into term_row from public.controlled_terms where id=authority_row.controlled_term_id;
  if not term_row.active or term_row.merged_into_id is not null or authority_row.record->>'status'='local_proposal' then raise exception 'authority_not_publishable'; end if;
  if clean_rights is null or char_length(clean_rights) not between 10 and 1000 then raise exception 'publication_rights_required'; end if;
  heading_tag:=case authority_row.record->>'heading_type' when 'topic' then '150' when 'geographic' then '151'
   when 'personal' then '100' when 'corporate' then '110' when 'meeting' then '111' when 'title' then '130' when 'named_event' then '147' when 'chronological' then '148' when 'genre_form' then '155' when 'medium' then '162' when 'topical_subdivision' then '180' when 'geographic_subdivision' then '181' when 'chronological_subdivision' then '182' when 'form_subdivision' then '185' end;
  if heading_tag is null then
   select f->>'tag' into heading_tag from jsonb_array_elements(coalesce(authority_row.record->'fields','[]'::jsonb)) f
    where f->>'tag' in ('100','110','111','130','147','148','150','151','155','162','180','181','182','185') limit 1;
  end if;
  if heading_tag is null then raise exception 'heading_type_required'; end if;
  allowed:=case heading_tag when '100' then array['0','1','3'] when '110' then array['0','1','2']
   when '111' then array['0','1','2'] when '130' then array['0','1','2','3','4','5','6','7','8','9'] else array[' '] end;
  if mapping_value is null or jsonb_typeof(mapping_value)<>'object'
   or mapping_value->>'heading_ind1' is null or mapping_value->>'heading_ind1'<>all(allowed)
   or jsonb_typeof(mapping_value->'variant_ind1') is distinct from 'array'
   or jsonb_typeof(mapping_value->'relation_ind1') is distinct from 'array'
   then raise exception 'invalid_marc_mapping'; end if;
  if jsonb_array_length(mapping_value->'variant_ind1')<>(select count(*) from public.subject_authority_variants where authority_id=target_authority_id)
   or jsonb_array_length(mapping_value->'relation_ind1')<>jsonb_array_length(coalesce(authority_row.record->'relations','[]'::jsonb))
   then raise exception 'incomplete_marc_mapping'; end if;
  for item in select value from jsonb_array_elements(mapping_value->'variant_ind1') loop
   indicator:=item#>>'{}'; if indicator is null or indicator<>all(allowed) then raise exception 'invalid_marc_mapping'; end if;
  end loop;
  for item in select value from jsonb_array_elements(mapping_value->'relation_ind1') loop
   indicator:=item#>>'{}'; if indicator is null or indicator<>all(allowed) then raise exception 'invalid_marc_mapping'; end if;
  end loop;
  insert into public.subject_authority_publications(authority_id,rights_statement,marc_mapping,approved_by)
   values(target_authority_id,clean_rights,mapping_value,auth.uid())
   on conflict(authority_id) do update set rights_statement=excluded.rights_statement,marc_mapping=excluded.marc_mapping,approved_by=excluded.approved_by,approved_at=now();
 else
  delete from public.subject_authority_publications where authority_id=target_authority_id;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),case when publish_value then 'subject_authority_published' else 'subject_authority_unpublished' end,
   'subject_authority',target_authority_id::text,jsonb_build_object('rights_statement',case when publish_value then clean_rights else null end));
end;
$$;

-- O mapa inclui o lugar associado a instituições após revisão.
create or replace function public.list_public_authority_map_points()
returns jsonb language sql stable security definer set search_path = '' as $$
 select coalesce(jsonb_agg(jsonb_build_object('authority_id',listed.authority_id,'term_label',listed.term_label,
  'place_label',listed.place_label,'latitude',listed.latitude,'longitude',listed.longitude,
  'in_brazil',listed.in_brazil,'kind',listed.kind) order by listed.place_label,listed.term_label),'[]'::jsonb)
 from (
  select p.authority_id,t.preferred_label_pt term_label,p.place_label,p.latitude,p.longitude,p.in_brazil,
   case when p.component_position=-1 then 'associated' when p.component_position=0 then 'heading' else 'subdivision' end kind
  from public.subject_authority_map_points p
  join public.subject_authorities a on a.id=p.authority_id
  join public.subject_authority_publications publication on publication.authority_id=a.id
  join public.controlled_terms t on t.id=a.controlled_term_id
  where t.active and t.merged_into_id is null and a.record->>'status' is distinct from 'local_proposal'
   and public.subject_authority_has_work(a.id)
   and public.subject_authority_geographic_part(a.record,p.component_position)=p.place_label
  order by p.place_label,t.preferred_label_pt,a.id
  limit 2000
 ) listed;
$$;

