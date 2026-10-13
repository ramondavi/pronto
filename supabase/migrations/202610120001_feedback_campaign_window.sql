-- Encerramento da campanha, prazo individual e retenção das respostas anônimas.
alter table public.feedback_campaign
  add column invitations_closed_at timestamptz,
  add column aggregate_report jsonb,
  add column responses_purged_at timestamptz;

create or replace function public.feedback_campaign_stats()
returns jsonb language sql security definer set search_path = '' stable as $$
  select case when public.current_user_role() = 'administrator' then
    jsonb_build_object(
      'invited', (select count(*) from public.feedback_invitations),
      'responded', (select count(*) from public.feedback_invitations where responded),
      'invitations_close_at', least(c.activated_at + interval '60 days', coalesce(c.invitations_closed_at, 'infinity'::timestamptz)),
      'report_ready_at', least(c.activated_at + interval '60 days', coalesce(c.invitations_closed_at, 'infinity'::timestamptz)) + interval '30 days',
      'responses_purged_at', c.responses_purged_at,
      'aggregate_report', c.aggregate_report
    ) else null end
  from public.feedback_campaign c where c.id
$$;

create or replace function public.invite_completed_request_to_feedback()
returns trigger language plpgsql security definer set search_path = '' as $$
declare campaign_record public.feedback_campaign%rowtype; invitation_count integer;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  select * into campaign_record from public.feedback_campaign where id for update;
  if campaign_record.activated_at is null or now() < campaign_record.activated_at
    or now() >= campaign_record.activated_at + interval '60 days'
    or campaign_record.invitations_closed_at is not null then return new; end if;
  select count(*) into invitation_count from public.feedback_invitations;
  if invitation_count < campaign_record.capacity then
    insert into public.feedback_invitations(request_id) values(new.id) on conflict do nothing;
    if found and invitation_count + 1 >= campaign_record.capacity then
      update public.feedback_campaign set invitations_closed_at = now() where id;
    end if;
  end if;
  return new;
end $$;

create or replace function public.submit_request_feedback(target_request_id uuid, response_answers jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare program_level public.academic_level; answer_key text; response_value text;
begin
  if public.current_user_role() is distinct from 'student' then raise exception 'active_student_required'; end if;
  select p.level into program_level from public.feedback_invitations i
    join public.cataloging_requests r on r.id = i.request_id
    join public.student_profiles s on s.id = r.student_profile_id
    join public.academic_enrollments e on e.id = r.academic_enrollment_id
    join public.academic_programs p on p.id = e.academic_program_id
    where i.request_id = target_request_id and not i.responded and r.status = 'completed' and s.profile_id = auth.uid()
      and now() < i.invited_at + interval '30 days'
    for update of i;
  if program_level is null then raise exception 'feedback_not_available'; end if;
  if response_answers is null or jsonb_typeof(response_answers) <> 'object' then raise exception 'invalid_feedback'; end if;
  for answer_key in select unnest(array['step_clarity','findability','language','form_ease','reliability','guidance','response_time','deposit_guide','overall']) loop
    response_value := response_answers ->> answer_key;
    if response_value is null or (response_value !~ '^[1-5]$' and (answer_key = 'overall' or response_value <> 'na')) then
      raise exception 'invalid_feedback_rating';
    end if;
  end loop;
  if coalesce(response_answers ->> 'difficulty','') not in ('initial','corrections','nada_consta','cataloging_card','pdf','deposit_guide','none','other') then raise exception 'invalid_feedback_difficulty'; end if;
  if coalesce(response_answers ->> 'age_band','') not in ('up_to_24','25_34','35_44','45_plus','prefer_not') then raise exception 'invalid_feedback_age_band'; end if;
  if coalesce(response_answers ->> 'residence','') not in ('metro_salvador','other_bahia','other_state','prefer_not') then raise exception 'invalid_feedback_residence'; end if;
  if coalesce(response_answers ->> 'digital_familiarity','') not in ('rarely','sometimes','frequently','prefer_not') then raise exception 'invalid_feedback_digital_familiarity'; end if;
  if coalesce(response_answers ->> 'digital_autonomy','') not in ('need_help','some_help','independent','prefer_not') then raise exception 'invalid_feedback_digital_autonomy'; end if;
  if program_level <> 'undergraduate' then
    if coalesce(response_answers ->> 'prior_email','') not in ('yes','no','unsure') then raise exception 'invalid_feedback_prior_email'; end if;
    if response_answers ->> 'prior_email' = 'yes' and coalesce(response_answers ->> 'comparison','') not in ('much_worse','worse','same','better','much_better') then raise exception 'invalid_feedback_comparison'; end if;
  elsif response_answers ? 'prior_email' or response_answers ? 'comparison' or response_answers ? 'comparison_note' then
    raise exception 'comparison_not_available';
  end if;
  if char_length(coalesce(response_answers ->> 'comparison_note','')) > 1000 or char_length(coalesce(response_answers ->> 'improvement','')) > 1000 then raise exception 'feedback_text_too_long'; end if;
  if exists (select 1 from jsonb_object_keys(response_answers) as k(key) where k.key not in
    ('step_clarity','findability','language','form_ease','reliability','guidance','response_time','deposit_guide','overall','difficulty','prior_email','comparison','comparison_note','improvement','age_band','residence','digital_familiarity','digital_autonomy')) then
    raise exception 'invalid_feedback_field';
  end if;
  insert into public.feedback_responses(answers) values(response_answers);
  update public.feedback_invitations set responded = true where request_id = target_request_id;
  delete from public.email_outbox where request_id = target_request_id and event_type = 'feedback_reminder' and status in ('pending','failed');
end $$;

-- Preserva somente contagens por pergunta e valor. Comentários livres são eliminados.
create function public.purge_expired_feedback_responses()
returns void language plpgsql security definer set search_path = '' as $$
declare campaign_record public.feedback_campaign%rowtype; close_at timestamptz; summary jsonb;
begin
  select * into campaign_record from public.feedback_campaign where id for update;
  if campaign_record.activated_at is null or campaign_record.responses_purged_at is not null then return; end if;
  close_at := least(campaign_record.activated_at + interval '60 days', coalesce(campaign_record.invitations_closed_at, 'infinity'::timestamptz));
  if now() < (close_at + interval '30 days') + interval '6 months' then return; end if;
  if (select count(*) from public.feedback_responses) >= 5 then
    select jsonb_object_agg(question, distribution) into summary from (
      select question, jsonb_object_agg(answer, count) as distribution from (
        select item.key as question, item.value as answer, count(*) as count
        from public.feedback_responses r cross join lateral jsonb_each_text(r.answers) item
        where item.key not in ('comparison_note', 'improvement')
        group by item.key, item.value
      ) values_by_question group by question
    ) questions;
  end if;
  update public.feedback_campaign set aggregate_report = summary, responses_purged_at = now() where id;
  delete from public.feedback_responses;
end $$;

revoke all on function public.purge_expired_feedback_responses() from public, anon, authenticated;
select cron.schedule('pronto-feedback-retention', '15 13 * * *', $$select public.purge_expired_feedback_responses()$$);
