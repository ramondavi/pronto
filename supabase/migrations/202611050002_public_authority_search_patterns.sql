-- * matches any number of characters; ? matches exactly one. Other LIKE metacharacters stay literal.
create function public.public_authority_matches_pattern(haystack text, raw_term text)
returns boolean language plpgsql immutable set search_path='' as $$
declare pattern text := '%'; character text; folded text; index_value integer;
begin
 if raw_term is null or raw_term='' then return true; end if;
 for index_value in 1..char_length(raw_term) loop
  character := substr(raw_term,index_value,1);
  if character='*' then pattern := pattern || '%';
  elsif character='?' then pattern := pattern || '_';
  else
   folded := public.fold_public_authority_search(character);
   if folded in ('%', '_', chr(92)) then pattern := pattern || chr(92); end if;
   pattern := pattern || folded;
  end if;
 end loop;
 return haystack like pattern || '%' escape chr(92);
end;
$$;

revoke all on function public.public_authority_matches_pattern(text,text) from public,anon,authenticated;
-- Search reviewed public places by name or decimal latitude, longitude within 100 m.
create or replace function public.search_public_subject_authorities_filtered(
 query_groups jsonb default '[]'::jsonb, source_filter text default 'all', heading_filter text default 'all',
 sort_value text default 'relevance', page_value integer default 0, exact_query text default '',
 language_filter text default 'all', relation_filter text default 'all'
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; coordinates text[]; latitude_query double precision; longitude_query double precision;
begin
 coordinates := regexp_match(btrim(exact_query), '^ *(-?[0-9]{1,2}([.][0-9]+)?) *[,;] *(-?[0-9]{1,3}([.][0-9]+)?) *$');
 if coordinates is not null then
  latitude_query := coordinates[1]::double precision; longitude_query := coordinates[3]::double precision;
  if latitude_query not between -90 and 90 or longitude_query not between -180 and 180 then raise exception 'invalid_public_authority_search'; end if;
 end if;
 if query_groups is null or jsonb_typeof(query_groups)<>'array' or jsonb_array_length(query_groups)>8
  or octet_length(query_groups::text)>4000
  or source_filter not in ('all','bn','aat','ufba','pergamum','loc','pronto')
  or heading_filter not in ('all','personal','corporate','meeting','title','named_event','chronological','topic','geographic','genre_form','medium','topical_subdivision','geographic_subdivision','chronological_subdivision','form_subdivision')
  or sort_value not in ('relevance','az','za','recent','source')
  or language_filter not in ('all','pt','en','es','de','fr','it')
  or relation_filter not in ('all','broader','narrower','related')
  or page_value not between 0 and 250 or char_length(exact_query)>200 then raise exception 'invalid_public_authority_search'; end if;

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
      when '111' then 'meeting' when '147' then 'named_event' when '148' then 'chronological'
      when '150' then 'topic' when '151' then 'geographic' when '155' then 'genre_form'
      when '162' then 'medium' when '180' then 'topical_subdivision'
      when '181' then 'geographic_subdivision' when '182' then 'chronological_subdivision'
      when '185' then 'form_subdivision' end
     from jsonb_array_elements(coalesce(a.record->'fields','[]'::jsonb)) f
     where f->>'tag' in ('100','110','111','130','147','148','150','151','155','162','180','181','182','185') limit 1)) heading_type,
   public.fold_public_authority_search(concat_ws(' ', t.preferred_label_pt, t.preferred_label_en,
    (select string_agg(v.label,' ') from public.subject_authority_variants v where v.authority_id=a.id),
    (select string_agg(mp.place_label,' ') from public.subject_authority_map_points mp where mp.authority_id=a.id
      and public.subject_authority_geographic_part(a.record,mp.component_position)=mp.place_label))) search_text
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
   and (latitude_query is null or exists (select 1 from public.subject_authority_map_points mp
     join public.subject_authorities a on a.id=mp.authority_id where a.id=c.id
      and public.subject_authority_geographic_part(a.record,mp.component_position)=mp.place_label
      and 111.2*sqrt(power(mp.latitude-latitude_query,2)
       +power((mp.longitude-longitude_query)*cos(radians(latitude_query)),2))<=0.1))
   and (latitude_query is not null or query_groups='[]'::jsonb or exists (
    select 1 from jsonb_array_elements(query_groups) g
    where not exists (select 1 from jsonb_array_elements_text(g->'include') term
      where not public.public_authority_matches_pattern(c.search_text,term))
     and not exists (select 1 from jsonb_array_elements_text(g->'exclude') term
      where public.public_authority_matches_pattern(c.search_text,term))
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


revoke all on function public.search_public_subject_authorities_filtered(jsonb,text,text,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.search_public_subject_authorities_filtered(jsonb,text,text,text,integer,text,text,text) to anon,authenticated;
