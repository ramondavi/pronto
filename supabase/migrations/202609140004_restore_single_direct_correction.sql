create or replace function public.restore_direct_request_correction(target_request_id uuid, field_key_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare baseline_value jsonb;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  select original_value into baseline_value from public.request_direct_correction_baselines
    where request_id = target_request_id and field_key = field_key_value for update;
  if not found then raise exception 'direct_correction_not_found'; end if;
  perform public.apply_direct_correction_value(target_request_id, field_key_value, baseline_value);
  delete from public.request_direct_correction_baselines where request_id = target_request_id and field_key = field_key_value;
  update public.cataloging_requests set updated_at = now() where id = target_request_id;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'request_direct_correction_restored', 'cataloging_request', target_request_id::text,
      jsonb_build_object('field_key', field_key_value, 'restored_value', baseline_value));
end;
$$;

revoke all on function public.restore_direct_request_correction(uuid, text) from public, anon;
grant execute on function public.restore_direct_request_correction(uuid, text) to authenticated;
