-- Retire duplicate catalogue entries without rewriting request links or issued snapshots.
alter table public.controlled_terms
  add column merged_into_id uuid references public.controlled_terms(id) on delete restrict,
  add column merged_at timestamptz,
  add column merged_by uuid references public.profiles(id) on delete restrict,
  add constraint controlled_terms_merge_state check (
    (merged_into_id is null and merged_at is null and merged_by is null)
    or (merged_into_id is not null and merged_into_id <> id and not active and merged_at is not null and merged_by is not null));
create index controlled_terms_merge_target on public.controlled_terms(merged_into_id) where merged_into_id is not null;
alter table public.cdu_code_descriptions
  add column merged_into_code text references public.cdu_code_descriptions(cdu_code) on delete restrict,
  add column merged_at timestamptz,
  add column merged_by uuid references public.profiles(id) on delete restrict,
  add constraint cdu_code_descriptions_merge_state check (
    (merged_into_code is null and merged_at is null and merged_by is null)
    or (merged_into_code is not null and merged_into_code <> cdu_code and merged_at is not null and merged_by is not null));
create index cdu_descriptions_merge_target on public.cdu_code_descriptions(merged_into_code) where merged_into_code is not null;

create function public.canonical_controlled_term(value uuid) returns uuid
language sql stable set search_path = '' as $$
  select coalesce((select merged_into_id from public.controlled_terms where id = value), value);
$$;
create function public.canonical_cdu_code(value text) returns text
language sql stable set search_path = '' as $$
  select coalesce((select merged_into_code from public.cdu_code_descriptions where cdu_code = value), value);
$$;

-- Retired records are immutable except for flattening their redirect during another merge.
create function public.protect_merged_catalogue_record() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'controlled_terms' then
    if old.merged_into_id is not null then
      if tg_op = 'DELETE' then raise exception 'catalogue_record_merged'; end if;
      if (to_jsonb(new) - array['merged_into_id','updated_at']) is distinct from
         (to_jsonb(old) - array['merged_into_id','updated_at']) then raise exception 'catalogue_record_merged'; end if;
    end if;
  else
    if old.merged_into_code is not null then
      if tg_op = 'DELETE' then raise exception 'catalogue_record_merged'; end if;
      if (to_jsonb(new) - array['merged_into_code','updated_at']) is distinct from
         (to_jsonb(old) - array['merged_into_code','updated_at']) then raise exception 'catalogue_record_merged'; end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger protect_merged_subject before update or delete on public.controlled_terms
for each row execute function public.protect_merged_catalogue_record();
create trigger protect_merged_cdu before update or delete on public.cdu_code_descriptions
for each row execute function public.protect_merged_catalogue_record();

-- Lock the referenced entry before accepting a new use, including when a merge is concurrent.
create function public.reject_new_merged_catalogue_use() returns trigger
language plpgsql security definer set search_path = '' as $$
declare subject_target uuid; cdu_target text;
begin
  if tg_table_name = 'request_controlled_terms' then
    if tg_op = 'UPDATE' and new.controlled_term_id is not distinct from old.controlled_term_id then return new; end if;
    select merged_into_id into subject_target from public.controlled_terms where id = new.controlled_term_id for key share;
    if subject_target is not null then raise exception 'controlled_term_merged'; end if;
  else
    if tg_op = 'UPDATE' and new.cdu_code is not distinct from old.cdu_code then return new; end if;
    select merged_into_code into cdu_target from public.cdu_code_descriptions where cdu_code = new.cdu_code for key share;
    if cdu_target is not null then raise exception 'cdu_code_merged'; end if;
  end if;
  return new;
end;
$$;
create trigger reject_new_merged_subject_use before insert or update on public.request_controlled_terms
for each row execute function public.reject_new_merged_catalogue_use();
create trigger reject_new_merged_cdu_use before insert or update on public.request_cataloging_metadata
for each row execute function public.reject_new_merged_catalogue_use();

create function public.admin_create_controlled_term(label_pt text, label_en text, source_code_value text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare clean_pt text := public.sanitize_cataloging_text(label_pt);
  clean_en text := public.sanitize_cataloging_text(label_en); created_id uuid;
begin
  if not public.has_permission('admin.subjects.manage') then raise exception 'permission_denied'; end if;
  if clean_pt is null or char_length(clean_pt) not between 2 and 120
    or (clean_en is not null and char_length(clean_en) not between 2 and 120) then raise exception 'invalid_controlled_term'; end if;
  if source_code_value is null or source_code_value not in ('bn','aat','ufba','pergamum','loc') then raise exception 'controlled_term_source_required'; end if;
  insert into public.controlled_terms(preferred_label_pt,normalized_label_pt,preferred_label_en,normalized_label_en,created_by,updated_by)
  values(clean_pt,lower(clean_pt),clean_en,lower(clean_en),auth.uid(),auth.uid()) returning id into created_id;
  insert into public.controlled_term_sources(controlled_term_id,source_code) values(created_id,source_code_value);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'controlled_term_admin_created','controlled_term',created_id::text,jsonb_build_object('source',source_code_value));
  return created_id;
end;
$$;

create function public.admin_catalogue_merge_preview(catalogue_kind text, source_key text, target_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare source_label text; target_label text; source_version timestamptz; target_version timestamptz;
  source_count bigint; target_count bigint; open_count bigint; source_subject public.controlled_terms%rowtype;
  target_subject public.controlled_terms%rowtype; source_cdu public.cdu_code_descriptions%rowtype;
  target_cdu public.cdu_code_descriptions%rowtype;
begin
  if catalogue_kind not in ('subject','cdu') or catalogue_kind is null then raise exception 'invalid_catalogue_kind'; end if;
  if not public.has_permission(case when catalogue_kind='subject' then 'admin.subjects.manage' else 'admin.cdu.manage' end) then raise exception 'permission_denied'; end if;
  if source_key is null or target_key is null or source_key = target_key then raise exception 'different_catalogue_records_required'; end if;
  if catalogue_kind = 'subject' then
    select * into source_subject from public.controlled_terms where id=source_key::uuid;
    select * into target_subject from public.controlled_terms where id=target_key::uuid;
    if source_subject.id is null or target_subject.id is null then raise exception 'catalogue_record_not_found'; end if;
    if source_subject.merged_into_id is not null or target_subject.merged_into_id is not null then raise exception 'catalogue_record_merged'; end if;
    if not target_subject.active then raise exception 'active_merge_target_required'; end if;
    source_label:=source_subject.preferred_label_pt; target_label:=target_subject.preferred_label_pt;
    source_version:=source_subject.updated_at; target_version:=target_subject.updated_at;
    select count(distinct u.request_id) into source_count from public.request_controlled_terms u
      where public.canonical_controlled_term(u.controlled_term_id)=source_subject.id;
    select count(distinct u.request_id) into target_count from public.request_controlled_terms u
      where public.canonical_controlled_term(u.controlled_term_id)=target_subject.id;
    select count(distinct r.id) into open_count from public.request_controlled_terms u
      join public.cataloging_requests r on r.id=u.request_id
      where public.canonical_controlled_term(u.controlled_term_id) in (source_subject.id,target_subject.id)
      and r.status in ('submitted','in_review','changes_requested','approved');
  else
    select * into source_cdu from public.cdu_code_descriptions where cdu_code=source_key;
    select * into target_cdu from public.cdu_code_descriptions where cdu_code=target_key;
    if source_cdu.cdu_code is null or target_cdu.cdu_code is null then raise exception 'catalogue_record_not_found'; end if;
    if source_cdu.merged_into_code is not null or target_cdu.merged_into_code is not null then raise exception 'catalogue_record_merged'; end if;
    source_label:=source_cdu.cdu_code || ' — ' || source_cdu.description;
    target_label:=target_cdu.cdu_code || ' — ' || target_cdu.description;
    source_version:=source_cdu.updated_at; target_version:=target_cdu.updated_at;
    select count(*) into source_count from public.request_cataloging_metadata m where public.canonical_cdu_code(m.cdu_code)=source_key;
    select count(*) into target_count from public.request_cataloging_metadata m where public.canonical_cdu_code(m.cdu_code)=target_key;
    select count(distinct r.id) into open_count from public.request_cataloging_metadata m
      join public.cataloging_requests r on r.id=m.request_id
      where public.canonical_cdu_code(m.cdu_code) in (source_key,target_key)
      and r.status in ('submitted','in_review','changes_requested','approved');
  end if;
  return jsonb_build_object('source_label',source_label,'target_label',target_label,'source_count',source_count,
    'target_count',target_count,'open_count',open_count,'source_version',source_version,'target_version',target_version);
end;
$$;

create function public.admin_merge_catalogue(catalogue_kind text, source_key text, target_key text,
  expected_source_version timestamptz, expected_target_version timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare preview jsonb;
begin
  if catalogue_kind not in ('subject','cdu') or catalogue_kind is null then raise exception 'invalid_catalogue_kind'; end if;
  if not public.has_permission(case when catalogue_kind='subject' then 'admin.subjects.manage' else 'admin.cdu.manage' end) then raise exception 'permission_denied'; end if;
  perform pg_advisory_xact_lock(hashtextextended('pronto.catalogue.merge',0));
  if catalogue_kind='subject' then
    perform 1 from public.controlled_terms where id in (source_key::uuid,target_key::uuid) order by id for update;
  else
    perform 1 from public.cdu_code_descriptions where cdu_code in (source_key,target_key) order by cdu_code for update;
  end if;
  preview:=public.admin_catalogue_merge_preview(catalogue_kind,source_key,target_key);
  if expected_source_version is null or expected_target_version is null
    or expected_source_version is distinct from (preview->>'source_version')::timestamptz
    or expected_target_version is distinct from (preview->>'target_version')::timestamptz then raise exception 'catalogue_merge_changed'; end if;
  if (preview->>'open_count')::bigint > 0 then raise exception 'catalogue_merge_open_requests'; end if;
  if catalogue_kind='subject' then
    insert into public.controlled_term_sources(controlled_term_id,source_code)
      select target_key::uuid, s.source_code from public.controlled_term_sources s
      where public.canonical_controlled_term(s.controlled_term_id)=source_key::uuid
      union select target_key::uuid, u.source_code from public.request_controlled_terms u
      where public.canonical_controlled_term(u.controlled_term_id)=source_key::uuid and u.source_code is not null
      on conflict do nothing;
    update public.controlled_terms set merged_into_id=target_key::uuid, updated_at=now() where merged_into_id=source_key::uuid;
    update public.controlled_terms set merged_into_id=target_key::uuid,active=false,merged_at=now(),merged_by=auth.uid(),updated_at=now()
      where id=source_key::uuid;
  else
    update public.cdu_code_descriptions set merged_into_code=target_key,updated_at=now() where merged_into_code=source_key;
    update public.cdu_code_descriptions set merged_into_code=target_key,merged_at=now(),merged_by=auth.uid(),updated_at=now()
      where cdu_code=source_key;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'catalogue_records_merged',catalogue_kind,source_key,
      preview || jsonb_build_object('target_key',target_key,'historical_records_preserved',true));
  return preview;
end;
$$;

create function public.admin_catalogue_merge_targets(catalogue_kind text, source_key text, search_query text)
returns table(record_key text,label text,description text)
language plpgsql security definer set search_path = '' as $$
begin
  if catalogue_kind not in ('subject','cdu') or catalogue_kind is null then raise exception 'invalid_catalogue_kind'; end if;
  if not public.has_permission(case when catalogue_kind='subject' then 'admin.subjects.manage' else 'admin.cdu.manage' end) then raise exception 'permission_denied'; end if;
  if catalogue_kind='subject' then
    return query select t.id::text,t.preferred_label_pt,coalesce(t.preferred_label_en,'') from public.controlled_terms t
      where t.active and t.merged_into_id is null and t.id::text<>source_key
      and (t.preferred_label_pt ilike '%'||left(btrim(search_query),120)||'%' or t.preferred_label_en ilike '%'||left(btrim(search_query),120)||'%')
      order by t.preferred_label_pt,t.id limit 20;
  else
    return query select c.cdu_code,c.cdu_code,c.description from public.cdu_code_descriptions c
      where c.merged_into_code is null and c.cdu_code<>source_key
      and (c.cdu_code ilike '%'||left(btrim(search_query),120)||'%' or c.description ilike '%'||left(btrim(search_query),120)||'%')
      order by c.cdu_code limit 20;
  end if;
end;
$$;

create function public.admin_subject_catalog(search_query text,status_filter text,review_filter text,page_offset integer)
returns table(id uuid,preferred_label_pt text,preferred_label_en text,active boolean,usage_count bigint,sources text[],total_count bigint,merged_into_id uuid,merged_into_label text)
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_permission('admin.subjects.view') or public.has_permission('admin.subjects.manage')) then raise exception 'permission_denied'; end if;
  return query with catalog as (
    select t.*,target.preferred_label_pt target_label,
      (select count(distinct u.request_id) from public.request_controlled_terms u
       where u.controlled_term_id=t.id or public.canonical_controlled_term(u.controlled_term_id)=t.id) usage,
      array(select distinct s.source_code from public.controlled_term_sources s
        where s.controlled_term_id=t.id or public.canonical_controlled_term(s.controlled_term_id)=t.id
        union select u.source_code from public.request_controlled_terms u where u.source_code is not null
        and (u.controlled_term_id=t.id or public.canonical_controlled_term(u.controlled_term_id)=t.id) order by 1) source_list
    from public.controlled_terms t left join public.controlled_terms target on target.id=t.merged_into_id
  ) select t.id,t.preferred_label_pt,t.preferred_label_en,t.active,t.usage,t.source_list,count(*) over(),t.merged_into_id,t.target_label
    from catalog t where (t.preferred_label_pt ilike '%'||left(btrim(search_query),120)||'%' or coalesce(t.preferred_label_en,'') ilike '%'||left(btrim(search_query),120)||'%')
    and ((status_filter='merged' and t.merged_into_id is not null) or (t.merged_into_id is null
      and (status_filter='all' or (status_filter='active' and t.active) or (status_filter='inactive' and not t.active))))
    and (review_filter='all' or (review_filter='unused' and t.usage=0) or (review_filter='used' and t.usage>0) or (review_filter='without_source' and cardinality(t.source_list)=0))
    order by t.preferred_label_pt,t.id limit 40 offset greatest(page_offset,0);
end;
$$;

create or replace function public.admin_controlled_term_overview()
returns table(total_count bigint,active_count bigint,unused_count bigint,without_source_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_permission('admin.subjects.view') or public.has_permission('admin.subjects.manage')) then raise exception 'permission_denied'; end if;
  return query select count(*),count(*) filter(where t.active),
    count(*) filter(where not exists(select 1 from public.request_controlled_terms u where public.canonical_controlled_term(u.controlled_term_id)=t.id)),
    count(*) filter(where not exists(select 1 from public.controlled_term_sources s where public.canonical_controlled_term(s.controlled_term_id)=t.id)
      and not exists(select 1 from public.request_controlled_terms u where public.canonical_controlled_term(u.controlled_term_id)=t.id and u.source_code is not null))
    from public.controlled_terms t where t.merged_into_id is null;
end;
$$;
create or replace function public.admin_controlled_term_usage(target_term_id uuid)
returns table(request_id uuid,protocol text,request_status text,source_code text,is_primary boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.has_permission('admin.subjects.view') or public.has_permission('admin.subjects.manage')) then raise exception 'permission_denied'; end if;
  return query select r.id,r.protocol,r.status::text,min(u.source_code),bool_or(u.is_primary)
    from public.request_controlled_terms u join public.cataloging_requests r on r.id=u.request_id
    where u.controlled_term_id=target_term_id or public.canonical_controlled_term(u.controlled_term_id)=target_term_id
    group by r.id,r.protocol,r.status,r.submitted_at order by r.submitted_at desc nulls last limit 30;
end;
$$;

create or replace function public.suggest_cdu(primary_term_id uuid,secondary_term_ids uuid[] default '{}'::uuid[])
returns table(cdu_code text,score bigint,primary_count bigint,secondary_count bigint,sheet_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
  return query with history as (
    select r.id,public.canonical_cdu_code(m.cdu_code) code,public.canonical_controlled_term(t.controlled_term_id) term
    from public.cataloging_requests r join public.request_cataloging_metadata m on m.request_id=r.id
    join public.request_controlled_terms t on t.request_id=r.id
    where r.status in ('approved','completed') and m.cdu_code is not null
  ), choices as (select public.canonical_controlled_term(primary_term_id) primary_id,
    array(select distinct public.canonical_controlled_term(x) from unnest(secondary_term_ids) x) secondary_ids)
  select h.code,2*count(distinct h.id) filter(where h.term=c.primary_id)
      +count(distinct (h.id,h.term)) filter(where h.term=any(c.secondary_ids) and h.term<>c.primary_id),
    count(distinct h.id) filter(where h.term=c.primary_id),
    count(distinct (h.id,h.term)) filter(where h.term=any(c.secondary_ids) and h.term<>c.primary_id),count(distinct h.id)
    from history h cross join choices c where h.term=c.primary_id or h.term=any(c.secondary_ids)
    group by h.code order by 2 desc,5 desc,h.code limit 3;
end;
$$;

revoke all on function public.canonical_controlled_term(uuid),public.canonical_cdu_code(text),
 public.protect_merged_catalogue_record(),public.reject_new_merged_catalogue_use(),
 public.admin_create_controlled_term(text,text,text),public.admin_catalogue_merge_preview(text,text,text),
 public.admin_merge_catalogue(text,text,text,timestamptz,timestamptz),public.admin_catalogue_merge_targets(text,text,text),
 public.admin_subject_catalog(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.canonical_controlled_term(uuid),public.canonical_cdu_code(text),
 public.admin_create_controlled_term(text,text,text),public.admin_catalogue_merge_preview(text,text,text),
 public.admin_merge_catalogue(text,text,text,timestamptz,timestamptz),public.admin_catalogue_merge_targets(text,text,text),
 public.admin_subject_catalog(text,text,text,integer) to authenticated;
