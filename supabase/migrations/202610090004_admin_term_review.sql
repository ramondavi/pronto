-- Focused review filters and protocol context for controlled subject administration.
create function public.admin_controlled_term_overview()
returns table (total_count bigint, active_count bigint, unused_count bigint, without_source_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;
  return query
    select count(*), count(*) filter (where t.active),
      count(*) filter (where not exists (
        select 1 from public.request_controlled_terms used where used.controlled_term_id = t.id)),
      count(*) filter (where not exists (
        select 1 from public.controlled_term_sources source where source.controlled_term_id = t.id)
        and not exists (select 1 from public.request_controlled_terms used
          where used.controlled_term_id = t.id and used.source_code is not null))
    from public.controlled_terms t;
end;
$$;

create function public.admin_search_controlled_terms(search_query text, status_filter text, review_filter text, page_offset integer)
returns table (id uuid, preferred_label_pt text, preferred_label_en text, active boolean, usage_count bigint, sources text[], total_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;
  return query
    select t.id, t.preferred_label_pt, t.preferred_label_en, t.active,
      (select count(*) from public.request_controlled_terms used where used.controlled_term_id = t.id),
      array(select distinct found.source_code from (
        select source.source_code from public.controlled_term_sources source
          where source.controlled_term_id = t.id
        union
        select used.source_code from public.request_controlled_terms used
          where used.controlled_term_id = t.id and used.source_code is not null
      ) found order by found.source_code),
      count(*) over ()
    from public.controlled_terms t
    where (nullif(btrim(search_query), '') is null
      or t.preferred_label_pt ilike '%' || btrim(search_query) || '%'
      or coalesce(t.preferred_label_en, '') ilike '%' || btrim(search_query) || '%')
      and (status_filter = 'all' or (status_filter = 'active' and t.active)
        or (status_filter = 'inactive' and not t.active))
      and (review_filter = 'all'
        or (review_filter = 'unused' and not exists (
          select 1 from public.request_controlled_terms used where used.controlled_term_id = t.id))
        or (review_filter = 'used' and exists (
          select 1 from public.request_controlled_terms used where used.controlled_term_id = t.id))
        or (review_filter = 'without_source' and not exists (
          select 1 from public.controlled_term_sources source where source.controlled_term_id = t.id)
          and not exists (select 1 from public.request_controlled_terms used
            where used.controlled_term_id = t.id and used.source_code is not null)))
    order by t.preferred_label_pt, t.id
    limit 40 offset greatest(page_offset, 0);
end;
$$;

create function public.admin_controlled_term_usage(target_term_id uuid)
returns table (request_id uuid, protocol text, request_status text, source_code text, is_primary boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;
  return query
    select r.id, r.protocol, r.status::text, used.source_code, used.is_primary
    from public.request_controlled_terms used
    join public.cataloging_requests r on r.id = used.request_id
    where used.controlled_term_id = target_term_id
    order by r.submitted_at desc nulls last
    limit 30;
end;
$$;

revoke all on function public.admin_controlled_term_overview(),
  public.admin_search_controlled_terms(text, text, text, integer),
  public.admin_controlled_term_usage(uuid) from public, anon, authenticated;
grant execute on function public.admin_controlled_term_overview(),
  public.admin_search_controlled_terms(text, text, text, integer),
  public.admin_controlled_term_usage(uuid) to authenticated;
