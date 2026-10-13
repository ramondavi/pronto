alter table public.request_analyses add column public_link_verified_at timestamptz, add column public_link_verified_url text;

create or replace function public.initial_public_link_verified(target_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_user_role() in ('cataloger', 'administrator'), false)
    and exists (select 1 from public.cataloging_requests r join public.request_analyses a on a.request_id = r.id
      where r.id = target_request_id and r.assigned_to = auth.uid()
        and a.public_link_verified_at is not null and a.public_link_verified_url = r.public_work_url
        and not exists (select 1 from public.request_revision_rounds rr
          join public.request_field_issues i on i.revision_round_id = rr.id
          where rr.request_id = r.id and i.field_key = 'public_work_url'
            and (rr.responded_at is null or rr.responded_at >= a.public_link_verified_at)))
$$;
revoke all on function public.initial_public_link_verified(uuid) from public, anon, authenticated;
grant execute on function public.initial_public_link_verified(uuid) to authenticated;

create or replace function public.confirm_public_work_link(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare checked_at timestamptz := now(); link_value text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  select public_work_url into link_value from public.cataloging_requests
    where id = target_request_id and assigned_to = auth.uid() and status = 'in_review' for update;
  if link_value is null then raise exception 'request_locked_by_another_staff'; end if;
  insert into public.request_analyses (request_id, last_edited_by, public_link_verified_at, public_link_verified_url)
    values (target_request_id, auth.uid(), checked_at, link_value)
    on conflict (request_id) do update set public_link_verified_at = checked_at, public_link_verified_url = link_value, last_edited_by = auth.uid();
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'public_work_link_checked', 'cataloging_request', target_request_id::text, jsonb_build_object('url', link_value));
  return checked_at;
end;
$$;
revoke all on function public.confirm_public_work_link(uuid) from public, anon, authenticated;
grant execute on function public.confirm_public_work_link(uuid) to authenticated;

create or replace function public.confirm_request_declarations(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare reviewed_at timestamptz := now();
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then
    raise exception 'active_staff_required';
  end if;
  if not exists (select 1 from public.cataloging_requests where id = target_request_id
      and assigned_to = auth.uid() and status = 'in_review') then
    raise exception 'request_locked_by_another_staff';
  end if;
  if not public.initial_public_link_verified(target_request_id) then raise exception 'public_link_review_required'; end if;
  insert into public.request_analyses (request_id, last_edited_by, declarations_reviewed_at)
  values (target_request_id, auth.uid(), reviewed_at)
  on conflict (request_id) do update set declarations_reviewed_at = reviewed_at;
  return reviewed_at;
end;
$$;
revoke all on function public.confirm_request_declarations(uuid) from public, anon, authenticated;
grant execute on function public.confirm_request_declarations(uuid) to authenticated;

create or replace function public.complete_request_analysis(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare completed_at_value timestamptz := now(); reply_text text; recipient_email text; student_name text; protocol_value text;
begin
  if coalesce(public.current_user_role() in ('cataloger', 'administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  select p.email, p.full_name, r.protocol into recipient_email, student_name, protocol_value
    from public.cataloging_requests r
    join public.student_profiles sp on sp.id = r.student_profile_id
    join public.profiles p on p.id = sp.profile_id
    where r.id = target_request_id and r.assigned_to = auth.uid() and r.status = 'in_review' for update of r;
  if not found then raise exception 'request_locked_by_another_staff'; end if;
  if not public.initial_public_link_verified(target_request_id) then raise exception 'public_link_review_required'; end if;
  if not exists (select 1 from public.request_analyses where request_id = target_request_id and declarations_reviewed_at is not null) then raise exception 'declarations_review_required'; end if;
  insert into public.request_analyses (request_id, analysis_notes, internal_note, last_edited_by, review_completed_at, review_completed_by, updated_at)
    values (target_request_id, '', '', auth.uid(), completed_at_value, auth.uid(), completed_at_value)
    on conflict (request_id) do update set review_completed_at = completed_at_value, review_completed_by = auth.uid(), updated_at = completed_at_value;
  select student_message_reply into reply_text from public.request_analyses where request_id = target_request_id;
  if nullif(btrim(reply_text), '') is not null then
    insert into public.email_outbox(request_id, event_type, idempotency_key, recipient, subject, text_body)
      values(target_request_id, 'student_message_reply', 'student_message_reply:' || target_request_id::text, recipient_email,
        'Pronto! | Resposta sobre o protocolo ' || protocol_value,
        'Olá, ' || split_part(btrim(student_name), ' ', 1) || '.' || E'\n\nA biblioteca respondeu à mensagem que você enviou no protocolo ' || protocol_value || ':' || E'\n\n' || reply_text || E'\n\nAcompanhe o andamento no Pronto!.')
      on conflict(idempotency_key) do nothing;
    update public.request_analyses set student_message_reply_sent_at = completed_at_value where request_id = target_request_id;
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'request_analysis_completed', 'cataloging_request', target_request_id::text, '{}'::jsonb);
  return completed_at_value;
end;
$$;

revoke all on function public.complete_request_analysis(uuid) from public, anon, authenticated;
grant execute on function public.complete_request_analysis(uuid) to authenticated;
