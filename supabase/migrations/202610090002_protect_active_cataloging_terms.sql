-- A term already selected in an open analysis cannot change while that analysis remains editable.
create or replace function public.admin_save_controlled_term(term_id uuid, label_pt text, label_en text, enabled boolean)
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
  if (clean_pt is distinct from previous.preferred_label_pt
    or clean_en is distinct from previous.preferred_label_en or enabled is distinct from previous.active)
    and exists (select 1 from public.request_controlled_terms selected
      join public.cataloging_requests request on request.id = selected.request_id
      where selected.controlled_term_id = term_id
        and request.status in ('submitted', 'in_review', 'changes_requested', 'approved')) then
    raise exception 'controlled_term_used_by_open_request';
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
