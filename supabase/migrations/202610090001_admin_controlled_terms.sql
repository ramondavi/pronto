-- Administrative maintenance keeps historical subject snapshots intact.
create function public.admin_list_controlled_terms(search_query text default '', status_filter text default 'all', page_offset integer default 0)
returns table (id uuid, preferred_label_pt text, preferred_label_en text, active boolean, usage_count bigint, sources text[], total_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;
  return query
    select t.id, t.preferred_label_pt, t.preferred_label_en, t.active,
      (select count(*) from public.request_controlled_terms used where used.controlled_term_id = t.id),
      array(select source.source_code from public.controlled_term_sources source
        where source.controlled_term_id = t.id order by source.source_code),
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

create function public.admin_save_controlled_term(term_id uuid, label_pt text, label_en text, enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare clean_pt text := public.sanitize_cataloging_text(label_pt);
  clean_en text := public.sanitize_cataloging_text(label_en);
  previous public.controlled_terms%rowtype;
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;
  select * into previous from public.controlled_terms where id = term_id for update;
  if not found then raise exception 'controlled_term_not_found'; end if;
  if clean_pt is null or char_length(clean_pt) not between 2 and 120
    or (clean_en is not null and char_length(clean_en) not between 2 and 120) then
    raise exception 'invalid_controlled_term';
  end if;
  update public.controlled_terms set preferred_label_pt = clean_pt,
    normalized_label_pt = lower(clean_pt), preferred_label_en = clean_en,
    normalized_label_en = lower(clean_en), active = enabled,
    updated_by = auth.uid(), updated_at = now()
    where id = term_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'controlled_term_admin_changed', 'controlled_term', term_id::text,
      jsonb_build_object('previous_pt', previous.preferred_label_pt, 'previous_en', previous.preferred_label_en,
        'previous_active', previous.active, 'current_pt', clean_pt, 'current_en', clean_en, 'current_active', enabled));
end;
$$;

create function public.admin_delete_unused_controlled_term(term_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare previous public.controlled_terms%rowtype;
begin
  if public.current_user_role() is distinct from 'administrator'::public.user_role then
    raise exception 'active_administrator_required';
  end if;
  select * into previous from public.controlled_terms where id = term_id for update;
  if not found then raise exception 'controlled_term_not_found'; end if;
  if exists (select 1 from public.request_controlled_terms where controlled_term_id = term_id) then
    raise exception 'controlled_term_in_use';
  end if;
  delete from public.controlled_terms where id = term_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'unused_controlled_term_deleted', 'controlled_term', term_id::text,
      jsonb_build_object('label_pt', previous.preferred_label_pt, 'label_en', previous.preferred_label_en));
end;
$$;

revoke all on function public.admin_list_controlled_terms(text, text, integer),
  public.admin_save_controlled_term(uuid, text, text, boolean),
  public.admin_delete_unused_controlled_term(uuid) from public, anon, authenticated;
grant execute on function public.admin_list_controlled_terms(text, text, integer),
  public.admin_save_controlled_term(uuid, text, text, boolean),
  public.admin_delete_unused_controlled_term(uuid) to authenticated;
