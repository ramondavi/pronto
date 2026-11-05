-- Metadados de situação para as sugestões usadas pela equipe na análise.
create or replace function public.search_subject_catalogue(search_text text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare q text := lower(public.sanitize_cataloging_text(search_text)); result jsonb;
begin
 if coalesce(public.current_user_role() in ('cataloger','administrator'),false) is not true then raise exception 'active_staff_required'; end if;
 if q is null or char_length(q) not between 2 and 120 then return '[]'::jsonb; end if;
 select coalesce(jsonb_agg(to_jsonb(matched_rows)),'[]'::jsonb) into result from (
  select t.id,t.preferred_label_pt,t.preferred_label_en,t.active,
   case when exists(select 1 from public.subject_authorities local_a where public.canonical_controlled_term(local_a.controlled_term_id)=t.id and local_a.origin='manual' and local_a.record->>'status' in ('local_proposal','local_validated')) then 'pronto' else null end as source_code,
   (select v.label from public.subject_authority_variants v join public.subject_authorities a on a.id=v.authority_id
    where public.canonical_controlled_term(a.controlled_term_id)=t.id and position(q in lower(v.label))>0 order by v.label limit 1) matched_variant,
   exists(select 1 from public.subject_authorities a join public.subject_authority_publications p on p.authority_id=a.id
    where public.canonical_controlled_term(a.controlled_term_id)=t.id) as published,
   (select coalesce(case a.record->>'heading_type'
    when 'personal' then '100' when 'corporate' then '110' when 'meeting' then '111'
    when 'title' then '130' when 'named_event' then '147' when 'chronological' then '148'
    when 'topic' then '150' when 'geographic' then '151' when 'genre_form' then '155'
    when 'medium' then '162' when 'topical_subdivision' then '180'
    when 'geographic_subdivision' then '181' when 'chronological_subdivision' then '182'
    when 'form_subdivision' then '185' end, a.record->'fields'->0->>'tag') from public.subject_authorities a
    where public.canonical_controlled_term(a.controlled_term_id)=t.id
    order by a.imported_at desc limit 1) as heading_tag
  from public.controlled_terms t where t.active and t.merged_into_id is null and (
   position(q in lower(t.preferred_label_pt))>0 or position(q in lower(coalesce(t.preferred_label_en,'')))>0 or exists(
    select 1 from public.subject_authorities a join public.subject_authority_variants v on v.authority_id=a.id
    where public.canonical_controlled_term(a.controlled_term_id)=t.id and position(q in lower(v.label))>0))
  order by (lower(t.preferred_label_pt)=q) desc,t.preferred_label_pt limit 12
 ) matched_rows;
 return result;
end;
$$;
