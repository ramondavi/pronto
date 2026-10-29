-- Manual authority records share the structured catalogue without inventing source identifiers.
-- Remote application requires separate approval; no data from requests or snapshots is changed.
alter table public.subject_authorities add column origin text not null default 'imported'
 check(origin in ('imported','manual'));
alter table public.subject_authorities alter column source_identifier drop not null;
alter table public.subject_authorities add constraint subject_authorities_import_identifier_required
 check(origin='manual' or source_identifier is not null);

-- Pending proposals are scoped to their originating request, never to new catalogue choices.
create table public.request_subject_proposals (
 request_id uuid not null references public.cataloging_requests(id) on delete cascade,
 controlled_term_id uuid not null references public.controlled_terms(id) on delete cascade,
 authority_id uuid not null references public.subject_authorities(id) on delete cascade,
 proposed_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 primary key(request_id,controlled_term_id),
 unique(authority_id)
);
alter table public.request_subject_proposals enable row level security;
revoke all on public.request_subject_proposals from public,anon,authenticated;

create function public.create_manual_subject_authority(manual_record jsonb, existing_term_id uuid default null, target_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 src text; external_id text; source_url text; status_value text; heading_type text;
 manual_id uuid; tid uuid; clean_pt text; clean_en text; note_value text;
 component jsonb; variant jsonb; position_index bigint; value_text text; kind_text text;
 clean_components jsonb:='[]'::jsonb; clean_variants jsonb:='[]'::jsonb; record_data jsonb;
 term public.controlled_terms%rowtype; prior public.subject_authorities%rowtype;
begin
 if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
 if target_request_id is null then
  if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 else
  if coalesce(public.has_permission('staff.case.view'),false) is not true then raise exception 'permission_denied'; end if;
  if manual_record->>'status' is distinct from 'local_proposal' then raise exception 'request_local_proposal_required'; end if;
  perform 1 from public.cataloging_requests r where r.id=target_request_id and r.assigned_to=auth.uid()
   and r.status in ('in_review','changes_requested') and not exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id) for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
 end if;
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
  'manual_input',manual_record,'proposal_request_id',target_request_id);
 insert into public.subject_authorities(id,source_code,source_identifier,controlled_term_id,record,imported_by,origin)
  values(manual_id,src,external_id,tid,record_data,auth.uid(),'manual');
 if target_request_id is not null then
  insert into public.request_subject_proposals(request_id,controlled_term_id,authority_id,proposed_by)
   values(target_request_id,tid,manual_id,auth.uid());
 end if;
 for variant in select value from jsonb_array_elements(clean_variants) loop
  insert into public.subject_authority_variants(authority_id,label,language) values(manual_id,variant->>'value','pt');
 end loop;
 insert into public.controlled_term_sources(controlled_term_id,source_code) values(tid,src) on conflict do nothing;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'subject_authority_created_manually','controlled_term',tid::text,jsonb_build_object('authority_id',manual_id,'source',src,'status',status_value));
 select * into term from public.controlled_terms where id=tid;
 return jsonb_build_object('id',term.id,'preferred_label_pt',term.preferred_label_pt,'active',term.active,'preferred_label_en',term.preferred_label_en,'source_code',src,'authority_id',manual_id,'reused',false);
end;
$$;
revoke all on function public.create_manual_subject_authority(jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.create_manual_subject_authority(jsonb,uuid,uuid) to authenticated;

create function public.get_request_subject_proposals(target_request_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
 if coalesce(public.has_permission('staff.case.view'),false) is not true then raise exception 'permission_denied'; end if;
 if not exists(select 1 from public.cataloging_requests r where r.id=target_request_id and r.assigned_to=auth.uid()
  and r.status in ('in_review','changes_requested')) then raise exception 'request_locked_by_another_staff'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('proposal_term_id',p.controlled_term_id,'id',t.id,
  'preferred_label_pt',t.preferred_label_pt,'preferred_label_en',t.preferred_label_en,'active',t.active,'source_code',a.source_code)),'[]'::jsonb)
  into result from public.request_subject_proposals p join public.subject_authorities a on a.id=p.authority_id
  join public.controlled_terms t on t.id=public.canonical_controlled_term(p.controlled_term_id)
  where p.request_id=target_request_id;
 return result;
end;
$$;
revoke all on function public.get_request_subject_proposals(uuid) from public,anon,authenticated;
grant execute on function public.get_request_subject_proposals(uuid) to authenticated;

-- Keep pending labels out of canonical request terms, including text-only upsert paths.
create function public.prevent_pending_subject_canonical_link()
returns trigger language plpgsql security definer set search_path='' as $$
declare is_active boolean;
begin
 select active into is_active from public.controlled_terms where id=new.controlled_term_id for share;
 if not coalesce(is_active,false) and exists(select 1 from public.subject_authorities a where a.controlled_term_id=new.controlled_term_id
  and a.origin='manual' and a.record->>'status'='local_proposal') then raise exception 'local_subject_proposal_pending'; end if;
 return new;
end;
$$;
create trigger request_terms_require_reviewed_local_subject
 before insert or update of controlled_term_id on public.request_controlled_terms
 for each row execute function public.prevent_pending_subject_canonical_link();
revoke all on function public.prevent_pending_subject_canonical_link() from public,anon,authenticated;

-- An inactive proposal may appear in only its originating request draft.
create function public.protect_request_subject_proposal_draft()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from jsonb_array_elements(coalesce(new.payload->'terms','[]'::jsonb)) entry
  join public.controlled_terms original on (entry->>'termId'=original.id::text
   or lower(public.sanitize_cataloging_text(entry->>'labelPt'))=original.normalized_label_pt)
  join public.controlled_terms current_term on current_term.id=public.canonical_controlled_term(original.id)
  where not current_term.active and exists(select 1 from public.subject_authorities a where a.controlled_term_id=original.id
   and a.origin='manual' and a.record->>'status'='local_proposal')
  and not exists(select 1 from public.request_subject_proposals p where p.request_id=new.request_id and p.controlled_term_id=original.id))
  then raise exception 'local_subject_proposal_wrong_request'; end if;
 return new;
end;
$$;
create trigger cataloging_draft_scopes_local_subject_proposals before insert or update of payload on public.request_cataloging_drafts
 for each row execute function public.protect_request_subject_proposal_draft();
revoke all on function public.protect_request_subject_proposal_draft() from public,anon,authenticated;

-- Homologation must reject pending draft subjects even if the UI is bypassed.
create function public.require_reviewed_subject_proposals_for_homologation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.request_cataloging_drafts d
  cross join lateral jsonb_array_elements(coalesce(d.payload->'terms','[]'::jsonb)) entry
  join public.controlled_terms original on (entry->>'termId'=original.id::text
   or lower(public.sanitize_cataloging_text(entry->>'labelPt'))=original.normalized_label_pt)
  join public.controlled_terms current_term on current_term.id=public.canonical_controlled_term(original.id)
  where d.request_id=new.request_id and not current_term.active
   and exists(select 1 from public.subject_authorities a where a.controlled_term_id=original.id and a.origin='manual' and a.record->>'status'='local_proposal'))
  then raise exception 'local_subject_proposal_pending'; end if;
 return new;
end;
$$;
create trigger cataloging_card_requires_reviewed_subject_proposals before insert on public.cataloging_card_homologations
 for each row execute function public.require_reviewed_subject_proposals_for_homologation();
revoke all on function public.require_reviewed_subject_proposals_for_homologation() from public,anon,authenticated;
