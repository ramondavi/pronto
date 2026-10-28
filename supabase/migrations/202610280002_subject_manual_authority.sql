-- Manual authority records share the structured catalogue without inventing source identifiers.
-- Remote application requires separate approval; no data from requests or snapshots is changed.
alter table public.subject_authorities add column origin text not null default 'imported'
 check(origin in ('imported','manual'));
alter table public.subject_authorities alter column source_identifier drop not null;
alter table public.subject_authorities add constraint subject_authorities_import_identifier_required
 check(origin='manual' or source_identifier is not null);

create function public.create_manual_subject_authority(manual_record jsonb, existing_term_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 src text; external_id text; source_url text; status_value text; heading_type text;
 manual_id uuid; tid uuid; clean_pt text; clean_en text; note_value text;
 component jsonb; variant jsonb; position_index bigint; value_text text; kind_text text;
 clean_components jsonb:='[]'::jsonb; clean_variants jsonb:='[]'::jsonb; record_data jsonb;
 term public.controlled_terms%rowtype; prior public.subject_authorities%rowtype;
begin
 if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true
  or coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 if manual_record is null or jsonb_typeof(manual_record)<>'object' or octet_length(manual_record::text)>50000 then raise exception 'invalid_manual_authority'; end if;
 src:=manual_record->>'source'; external_id:=nullif(btrim(manual_record->>'external_identifier'),'');
 source_url:=nullif(btrim(manual_record->>'source_url'),''); status_value:=manual_record->>'status';
 heading_type:=manual_record->>'heading_type'; clean_en:=public.sanitize_cataloging_text(manual_record->>'label_en');
 note_value:=nullif(btrim(manual_record->>'note'),'');
 if src is null or src not in ('bn','aat','ufba','pergamum','loc')
  or status_value is null or status_value not in ('existing','local_proposal')
  or heading_type is null or heading_type not in ('topic','geographic','personal','corporate','title')
  or (external_id is not null and (char_length(external_id)>1000 or status_value='local_proposal'))
  or (source_url is not null and (char_length(source_url)>2000 or source_url !~* '^https://[^[:space:]]+$'))
  or (clean_en is not null and char_length(clean_en) not between 2 and 120)
  or (note_value is not null and char_length(note_value)>4000)
  or jsonb_typeof(manual_record->'components') is distinct from 'array'
  or jsonb_typeof(manual_record->'variants') is distinct from 'array'
  then raise exception 'invalid_manual_authority'; end if;
 if jsonb_array_length(manual_record->'components') not between 1 and 17
  or jsonb_array_length(manual_record->'variants')>30 then raise exception 'invalid_manual_authority'; end if;
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
  if prior.origin<>'manual' or prior.imported_by<>auth.uid() or prior.record->'manual_input' is distinct from manual_record
   then raise exception 'authority_version_conflict'; end if;
  tid:=public.canonical_controlled_term(prior.controlled_term_id);
  select * into term from public.controlled_terms where id=tid;
  return jsonb_build_object('id',term.id,'preferred_label_pt',term.preferred_label_pt,'active',term.active,'authority_id',manual_id,'reused',true);
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
  'manual_input',manual_record);
 insert into public.subject_authorities(id,source_code,source_identifier,controlled_term_id,record,imported_by,origin)
  values(manual_id,src,external_id,tid,record_data,auth.uid(),'manual');
 for variant in select value from jsonb_array_elements(clean_variants) loop
  insert into public.subject_authority_variants(authority_id,label,language) values(manual_id,variant->>'value','pt');
 end loop;
 insert into public.controlled_term_sources(controlled_term_id,source_code) values(tid,src) on conflict do nothing;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'subject_authority_created_manually','controlled_term',tid::text,jsonb_build_object('authority_id',manual_id,'source',src,'status',status_value));
 select * into term from public.controlled_terms where id=tid;
 return jsonb_build_object('id',term.id,'preferred_label_pt',term.preferred_label_pt,'active',term.active,'authority_id',manual_id,'reused',false);
end;
$$;
revoke all on function public.create_manual_subject_authority(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_manual_subject_authority(jsonb,uuid) to authenticated;
