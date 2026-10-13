-- A página do QR expõe somente os elementos bibliográficos homologados.
-- O snapshot completo contém o protocolo e permanece privado.
drop function if exists public.get_card_publication(uuid);

create function public.get_card_publication(link_token uuid)
returns table (permanent_url text, bibliography jsonb)
language sql stable security definer
set search_path = ''
as $$
  select publication.permanent_url,
    jsonb_build_object(
      'title', card.snapshot #>> '{request,title}',
      'subtitle', card.snapshot #>> '{request,subtitle}',
      'author', author.name,
      'advisor', advisor.name,
      'program', card.snapshot #>> '{request,programName}',
      'work_nature', card.snapshot #>> '{request,workNature}',
      'publication_place', card.snapshot #>> '{request,publicationPlace}',
      'deposit_year', card.snapshot #>> '{request,depositYear}',
      'extent_count', card.snapshot #>> '{request,extentCount}',
      'extent_unit', card.snapshot #>> '{request,extentUnit}',
      'cdu', card.snapshot #>> '{classification,cdu}',
      'subjects', coalesce(subjects.labels, '[]'::jsonb)
    )
  from public.cataloging_card_homologations as card
  left join public.repository_publications as publication on publication.request_id = card.request_id
  left join lateral (
    select person.value ->> 'transcribedName' as name
    from jsonb_array_elements(coalesce(card.snapshot -> 'people', '[]'::jsonb)) as person(value)
    where person.value ->> 'role' = 'author'
    order by (person.value ->> 'position')::integer nulls last
    limit 1
  ) as author on true
  left join lateral (
    select person.value ->> 'transcribedName' as name
    from jsonb_array_elements(coalesce(card.snapshot -> 'people', '[]'::jsonb)) as person(value)
    where person.value ->> 'role' = 'advisor'
    limit 1
  ) as advisor on true
  left join lateral (
    select jsonb_agg(subject.value ->> 'labelPt' order by (subject.value ->> 'position')::integer nulls last) as labels
    from jsonb_array_elements(coalesce(card.snapshot -> 'subjects', '[]'::jsonb)) as subject(value)
    where nullif(subject.value ->> 'labelPt', '') is not null
  ) as subjects on true
  where card.public_token = link_token
  limit 1;
$$;

revoke all on function public.get_card_publication(uuid) from public;
grant execute on function public.get_card_publication(uuid) to anon, authenticated;
