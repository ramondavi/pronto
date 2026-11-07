-- Include historical links to terms merged into the published destination.
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
   and r.status in ('approved','completed')
  group by a.id,t.preferred_label_pt
  having count(distinct u.request_id)>=5
  order by uses desc,t.preferred_label_pt,a.id
  limit 5
 ) ranked;
$$;
