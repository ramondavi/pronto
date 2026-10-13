create or replace function public.list_request_direct_correction_baselines(target_request_id uuid)
returns table (field_key text, original_value jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if not exists (select 1 from public.cataloging_requests where id = target_request_id) then
    raise exception 'cataloging_request_not_found';
  end if;
  return query
    select baselines.field_key, baselines.original_value
    from public.request_direct_correction_baselines baselines
    where baselines.request_id = target_request_id
    order by baselines.created_at;
end;
$$;

revoke all on function public.list_request_direct_correction_baselines(uuid) from public, anon;
grant execute on function public.list_request_direct_correction_baselines(uuid) to authenticated;
