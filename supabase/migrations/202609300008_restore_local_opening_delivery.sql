create or replace function public.claim_own_local_opening_email(target_request_id uuid)
returns table (email_id uuid, recipient text, subject text, text_body text)
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'student'::public.user_role then
    raise exception 'active_student_required';
  end if;
  return query
  with claimed as (
    select e.id from public.email_outbox e
    join public.cataloging_requests r on r.id = e.request_id
    join public.student_profiles s on s.id = r.student_profile_id
    where e.request_id = target_request_id and e.event_type = 'request_opened'
      and e.status in ('pending', 'failed') and s.profile_id = auth.uid()
    for update of e skip locked
  ), updated as (
    update public.email_outbox e set status = 'processing', attempts = attempts + 1,
      last_error = null, updated_at = now()
    from claimed where e.id = claimed.id
    returning e.id, e.recipient, e.subject, e.text_body
  ) select updated.id, updated.recipient, updated.subject, updated.text_body from updated;
end;
$$;

create or replace function public.complete_own_local_opening_email(target_email_id uuid, succeeded boolean, error_message text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.current_user_role() is distinct from 'student'::public.user_role then
    raise exception 'active_student_required';
  end if;
  update public.email_outbox e set status = case when succeeded then 'delivered' else 'failed' end,
    delivered_at = case when succeeded then now() else null end,
    last_error = case when succeeded then null else left(coalesce(error_message, 'delivery_failed'), 1000) end,
    updated_at = now()
  from public.cataloging_requests r
  join public.student_profiles s on s.id = r.student_profile_id
  where e.id = target_email_id and e.request_id = r.id and e.event_type = 'request_opened'
    and e.status = 'processing' and s.profile_id = auth.uid();
end;
$$;

revoke all on function public.claim_own_local_opening_email(uuid) from public, anon, authenticated;
revoke all on function public.complete_own_local_opening_email(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_own_local_opening_email(uuid) to authenticated;
grant execute on function public.complete_own_local_opening_email(uuid, boolean, text) to authenticated;
