-- Search only individually published authorities; no access to operational tables is granted.
create function public.fold_public_authority_search(input_value text)
returns text language sql immutable set search_path='' as $$
 select translate(lower(coalesce(input_value,'')),
  'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')
$$;

create function public.search_public_subject_authorities(
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

revoke all on function public.fold_public_authority_search(text),
 public.search_public_subject_authorities(jsonb,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.search_public_subject_authorities(jsonb,text,text,text,integer,text) to anon,authenticated;
