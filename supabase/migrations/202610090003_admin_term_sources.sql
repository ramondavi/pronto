-- Include the source stored on a request when an older term has no consolidated source row.
create or replace function public.admin_list_controlled_terms(search_query text default '', status_filter text default 'all', page_offset integer default 0)
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
    order by t.preferred_label_pt, t.id
    limit 40 offset greatest(page_offset, 0);
end;
$$;
