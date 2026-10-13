create or replace function public.complete_request_analysis(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare completed_at_value timestamptz := now();
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  perform 1 from public.cataloging_requests where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  insert into public.request_analyses (request_id, analysis_notes, internal_note, last_edited_by, review_completed_at, review_completed_by, updated_at)
  values (target_request_id, '', '', auth.uid(), completed_at_value, auth.uid(), completed_at_value)
  on conflict (request_id) do update set review_completed_at = completed_at_value, review_completed_by = auth.uid(), updated_at = completed_at_value;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata) values (auth.uid(), 'request_analysis_completed', 'cataloging_request', target_request_id::text, '{}'::jsonb);
  return completed_at_value;
end;
$$;
