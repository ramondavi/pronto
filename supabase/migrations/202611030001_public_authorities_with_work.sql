-- A public authority must describe at least one Faculty work with a homologated card
-- or a completed request. Historical links to merged terms count for the destination.
create function public.subject_authority_has_work(target_authority_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
  select 1
  from public.subject_authorities a
  join public.request_controlled_terms u on public.canonical_controlled_term(u.controlled_term_id)=a.controlled_term_id
  join public.cataloging_requests r on r.id=u.request_id
  where a.id=target_authority_id
   and (r.status='completed' or exists (
    select 1 from public.cataloging_card_homologations h where h.request_id=r.id
   ))
 );
$$;
revoke all on function public.subject_authority_has_work(uuid) from public,anon,authenticated;

create function public.admin_subject_authority_work_status(target_authority_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(public.has_permission('admin.subjects.manage'),false) is not true then raise exception 'permission_denied'; end if;
 return public.subject_authority_has_work(target_authority_id);
end;
$$;
revoke all on function public.admin_subject_authority_work_status(uuid) from public,anon,authenticated;
grant execute on function public.admin_subject_authority_work_status(uuid) to authenticated;

create function public.require_subject_authority_work_for_publication()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not public.subject_authority_has_work(new.authority_id) then
  raise exception 'authority_work_link_required';
 end if;
 return new;
end;
$$;
create trigger subject_publication_requires_work before insert or update on public.subject_authority_publications
 for each row execute function public.require_subject_authority_work_for_publication();

create function public.withdraw_subject_publication_after_link_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.subject_authority_publications p
  where not public.subject_authority_has_work(p.authority_id)
   and exists (
    select 1 from public.subject_authorities a
    where a.id=p.authority_id and a.controlled_term_id=public.canonical_controlled_term(old.controlled_term_id)
   );
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$$;
create trigger subject_publication_work_link_removed after delete or update of request_id,controlled_term_id
 on public.request_controlled_terms for each row execute function public.withdraw_subject_publication_after_link_change();

create function public.withdraw_subject_publication_after_request_change()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.subject_authority_publications p
  where not public.subject_authority_has_work(p.authority_id)
   and exists (
    select 1 from public.subject_authorities a
    join public.request_controlled_terms u on public.canonical_controlled_term(u.controlled_term_id)=a.controlled_term_id
    where a.id=p.authority_id and u.request_id=new.id
   );
 return new;
end;
$$;
create trigger subject_publication_request_status_changed after update of status
 on public.cataloging_requests for each row execute function public.withdraw_subject_publication_after_request_change();

create function public.withdraw_subject_publication_after_homologation_delete()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.subject_authority_publications p
  where not public.subject_authority_has_work(p.authority_id)
   and exists (
    select 1 from public.subject_authorities a
    join public.request_controlled_terms u on public.canonical_controlled_term(u.controlled_term_id)=a.controlled_term_id
    where a.id=p.authority_id and u.request_id=old.request_id
   );
 return old;
end;
$$;
create trigger subject_publication_homologation_removed after delete
 on public.cataloging_card_homologations for each row execute function public.withdraw_subject_publication_after_homologation_delete();

revoke all on function public.require_subject_authority_work_for_publication(),
 public.withdraw_subject_publication_after_link_change(),
 public.withdraw_subject_publication_after_request_change(),
 public.withdraw_subject_publication_after_homologation_delete() from public,anon,authenticated;

-- Existing releases lacking a qualifying work are withdrawn without touching terms or cards.
delete from public.subject_authority_publications p
 where not public.subject_authority_has_work(p.authority_id);

-- Public read functions below also check the work link at query time, so a concurrent
-- publication or link change cannot reveal an ineligible record.

create or replace function public.list_public_subject_authorities(search_value text default '', page_value integer default 0, target_id uuid default null)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item order by item->>'label'), '[]'::jsonb) from (
  select jsonb_build_object('id',a.id,'label',t.preferred_label_pt,'label_en',t.preferred_label_en,
   'source',a.source_code,'source_identifier',a.source_identifier,'source_url',a.record->>'source_url',
   'origin',a.origin,'heading_type',coalesce(a.record->>'heading_type',
    (select case f->>'tag' when '100' then 'personal' when '110' then 'corporate' when '130' then 'title'
      when '151' then 'geographic' when '150' then 'topic' end
     from jsonb_array_elements(coalesce(a.record->'fields','[]'::jsonb)) f
     where f->>'tag' in ('100','110','130','150','151') limit 1)),
   'components',coalesce(a.record->'components','[]'::jsonb),
   'variants',coalesce((select jsonb_agg(jsonb_build_object('value',v.label,'language',v.language) order by v.label,v.id)
     from public.subject_authority_variants v where v.authority_id=a.id),'[]'::jsonb),
   'notes',coalesce(a.record->'notes','[]'::jsonb),'relations',coalesce(a.record->'relations','[]'::jsonb),
   'rights_statement',p.rights_statement,'published_at',p.approved_at,'marc_mapping',p.marc_mapping) item
  from public.subject_authority_publications p
  join public.subject_authorities a on a.id=p.authority_id
  join public.controlled_terms t on t.id=a.controlled_term_id
  where t.active and t.merged_into_id is null and a.record->>'status' is distinct from 'local_proposal'
   and public.subject_authority_has_work(a.id)
   and (target_id is null or a.id=target_id)
   and (nullif(btrim(search_value),'') is null or t.preferred_label_pt ilike '%'||left(btrim(search_value),100)||'%'
    or coalesce(t.preferred_label_en,'') ilike '%'||left(btrim(search_value),100)||'%'
    or exists(select 1 from public.subject_authority_variants v where v.authority_id=a.id and v.label ilike '%'||left(btrim(search_value),100)||'%'))
  order by t.preferred_label_pt,a.id limit 40 offset least(greatest(page_value,0),10000)*40
 ) selected;
$$;

create or replace function public.search_public_subject_authorities(
 query_groups jsonb default '[]'::jsonb, source_filter text default 'all', heading_filter text default 'all',
 sort_value text default 'relevance', page_value integer default 0, exact_query text default ''
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if query_groups is null or jsonb_typeof(query_groups)<>'array' or jsonb_array_length(query_groups)>8
  or octet_length(query_groups::text)>4000
  or source_filter not in ('all','bn','aat','ufba','pergamum','loc','pronto')
  or heading_filter not in ('all','topic','geographic','personal','corporate','title')
  or sort_value not in ('relevance','az','za','recent','source')
  or page_value not between 0 and 250 then raise exception 'invalid_public_authority_search'; end if;

 if exists (
  select 1 from jsonb_array_elements(query_groups) g
  where jsonb_typeof(g)<>'object' or jsonb_typeof(g->'include') is distinct from 'array'
   or jsonb_typeof(g->'exclude') is distinct from 'array'
   or jsonb_array_length(g->'include')>24 or jsonb_array_length(g->'exclude')>24
   or exists(select 1 from jsonb_array_elements(g->'include') term where jsonb_typeof(term)<>'string' or char_length(term#>>'{}')>80)
   or exists(select 1 from jsonb_array_elements(g->'exclude') term where jsonb_typeof(term)<>'string' or char_length(term#>>'{}')>80)
 ) then raise exception 'invalid_public_authority_search'; end if;

 with candidates as materialized (
  select a.id, a.source_code, p.approved_at, t.preferred_label_pt,
   coalesce(a.record->>'heading_type',
    (select case f->>'tag' when '100' then 'personal' when '110' then 'corporate' when '130' then 'title'
      when '151' then 'geographic' when '150' then 'topic' end
     from jsonb_array_elements(coalesce(a.record->'fields','[]'::jsonb)) f
     where f->>'tag' in ('100','110','130','150','151') limit 1)) heading_type,
   public.fold_public_authority_search(concat_ws(' ', t.preferred_label_pt, t.preferred_label_en,
    (select string_agg(v.label,' ') from public.subject_authority_variants v where v.authority_id=a.id))) search_text
  from public.subject_authority_publications p
  join public.subject_authorities a on a.id=p.authority_id
  join public.controlled_terms t on t.id=a.controlled_term_id
  where t.active and t.merged_into_id is null and a.record->>'status' is distinct from 'local_proposal'
   and public.subject_authority_has_work(a.id)
 ), filtered as materialized (
  select c.*,
   case when nullif(btrim(exact_query),'') is null then 0
    when public.fold_public_authority_search(c.preferred_label_pt)=public.fold_public_authority_search(exact_query) then 3
    when position(public.fold_public_authority_search(exact_query) in public.fold_public_authority_search(c.preferred_label_pt))=1 then 2
    when position(public.fold_public_authority_search(exact_query) in public.fold_public_authority_search(c.preferred_label_pt))>0 then 1
    else 0 end relevance
  from candidates c
  where (source_filter='all' or c.source_code=source_filter)
   and (heading_filter='all' or c.heading_type=heading_filter)
   and (query_groups='[]'::jsonb or exists (
    select 1 from jsonb_array_elements(query_groups) g
    where not exists (select 1 from jsonb_array_elements_text(g->'include') term
      where position(public.fold_public_authority_search(term) in c.search_text)=0)
     and not exists (select 1 from jsonb_array_elements_text(g->'exclude') term
      where position(public.fold_public_authority_search(term) in c.search_text)>0)
   ))
 ), ordered as (
  select id, row_number() over (order by
   case when sort_value='recent' then approved_at end desc nulls last,
   case when sort_value='za' then preferred_label_pt end desc nulls last,
   case when sort_value='source' then source_code end asc nulls last,
   case when sort_value='relevance' then relevance end desc nulls last,
   preferred_label_pt asc, id asc) ordinal
  from filtered
  order by ordinal limit 24 offset page_value*24
 )
 select jsonb_build_object('total',(select count(*) from filtered),
  'items',coalesce((select jsonb_agg(public.get_public_subject_authority(o.id) order by o.ordinal) from ordered o),'[]'::jsonb))
 into result;
 return result;
end;
$$;

create or replace function public.search_public_subject_authorities_filtered(
 query_groups jsonb default '[]'::jsonb, source_filter text default 'all', heading_filter text default 'all',
 sort_value text default 'relevance', page_value integer default 0, exact_query text default '',
 language_filter text default 'all', relation_filter text default 'all'
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if query_groups is null or jsonb_typeof(query_groups)<>'array' or jsonb_array_length(query_groups)>8
  or octet_length(query_groups::text)>4000
  or source_filter not in ('all','bn','aat','ufba','pergamum','loc','pronto')
  or heading_filter not in ('all','topic','geographic','personal','corporate','title')
  or sort_value not in ('relevance','az','za','recent','source')
  or language_filter not in ('all','pt','en','es','de','fr','it')
  or relation_filter not in ('all','broader','narrower','related')
  or page_value not between 0 and 250 then raise exception 'invalid_public_authority_search'; end if;

 if exists (
  select 1 from jsonb_array_elements(query_groups) g
  where jsonb_typeof(g)<>'object' or jsonb_typeof(g->'include') is distinct from 'array'
   or jsonb_typeof(g->'exclude') is distinct from 'array'
   or jsonb_array_length(g->'include')>24 or jsonb_array_length(g->'exclude')>24
   or exists(select 1 from jsonb_array_elements(g->'include') term where jsonb_typeof(term)<>'string' or char_length(term#>>'{}')>80)
   or exists(select 1 from jsonb_array_elements(g->'exclude') term where jsonb_typeof(term)<>'string' or char_length(term#>>'{}')>80)
 ) then raise exception 'invalid_public_authority_search'; end if;

 with candidates as materialized (
  select a.id, a.source_code, p.approved_at, t.preferred_label_pt,
   coalesce(a.record->>'heading_type',
    (select case f->>'tag' when '100' then 'personal' when '110' then 'corporate' when '130' then 'title'
      when '151' then 'geographic' when '150' then 'topic' end
     from jsonb_array_elements(coalesce(a.record->'fields','[]'::jsonb)) f
     where f->>'tag' in ('100','110','130','150','151') limit 1)) heading_type,
   public.fold_public_authority_search(concat_ws(' ', t.preferred_label_pt, t.preferred_label_en,
    (select string_agg(v.label,' ') from public.subject_authority_variants v where v.authority_id=a.id))) search_text
  from public.subject_authority_publications p
  join public.subject_authorities a on a.id=p.authority_id
  join public.controlled_terms t on t.id=a.controlled_term_id
  where t.active and t.merged_into_id is null and a.record->>'status' is distinct from 'local_proposal'
   and public.subject_authority_has_work(a.id)
   and (language_filter='all' or (language_filter='pt' and nullif(btrim(t.preferred_label_pt),'') is not null)
    or (language_filter='en' and nullif(btrim(t.preferred_label_en),'') is not null)
    or exists(select 1 from public.subject_authority_variants v where v.authority_id=a.id and v.language=language_filter))
   and (relation_filter='all' or exists(select 1 from jsonb_array_elements(coalesce(a.record->'relations','[]'::jsonb)) r
    where case relation_filter when 'broader' then r->>'kind' like 'Mais amplo%'
      when 'narrower' then r->>'kind' like 'Mais específico%'
      when 'related' then r->>'kind' like 'Associativa%' else false end))
 ), filtered as materialized (
  select c.*,
   case when nullif(btrim(exact_query),'') is null then 0
    when public.fold_public_authority_search(c.preferred_label_pt)=public.fold_public_authority_search(exact_query) then 3
    when position(public.fold_public_authority_search(exact_query) in public.fold_public_authority_search(c.preferred_label_pt))=1 then 2
    when position(public.fold_public_authority_search(exact_query) in public.fold_public_authority_search(c.preferred_label_pt))>0 then 1
    else 0 end relevance
  from candidates c
  where (source_filter='all' or c.source_code=source_filter)
   and (heading_filter='all' or c.heading_type=heading_filter)
   and (query_groups='[]'::jsonb or exists (
    select 1 from jsonb_array_elements(query_groups) g
    where not exists (select 1 from jsonb_array_elements_text(g->'include') term
      where position(public.fold_public_authority_search(term) in c.search_text)=0)
     and not exists (select 1 from jsonb_array_elements_text(g->'exclude') term
      where position(public.fold_public_authority_search(term) in c.search_text)>0)
   ))
 ), ordered as (
  select id, row_number() over (order by
   case when sort_value='recent' then approved_at end desc nulls last,
   case when sort_value='za' then preferred_label_pt end desc nulls last,
   case when sort_value='source' then source_code end asc nulls last,
   case when sort_value='relevance' then relevance end desc nulls last,
   preferred_label_pt asc, id asc) ordinal
  from filtered
  order by ordinal limit 24 offset page_value*24
 )
 select jsonb_build_object('total',(select count(*) from filtered),
  'items',coalesce((select jsonb_agg(public.get_public_subject_authority(o.id) order by o.ordinal) from ordered o),'[]'::jsonb))
 into result;
 return result;
end;
$$;

create or replace function public.list_public_authority_usage_summary()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id', ranked.id, 'label', ranked.label, 'count', ranked.uses)
   order by ranked.uses desc, ranked.label), '[]'::jsonb)
 from (
  select a.id, t.preferred_label_pt as label, count(distinct u.request_id) as uses
  from public.subject_authority_publications p
  join public.subject_authorities a on a.id=p.authority_id
  join public.controlled_terms t on t.id=a.controlled_term_id
  join public.request_controlled_terms u on public.canonical_controlled_term(u.controlled_term_id)=t.id
  join public.cataloging_requests r on r.id=u.request_id
  where t.active and t.merged_into_id is null
   and a.record->>'status' is distinct from 'local_proposal'
   and (r.status='completed' or exists (select 1 from public.cataloging_card_homologations h where h.request_id=r.id))
  group by a.id,t.preferred_label_pt
  having count(distinct u.request_id)>=5
  order by uses desc,t.preferred_label_pt,a.id
  limit 5
 ) ranked;
$$;
