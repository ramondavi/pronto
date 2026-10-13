-- Pesquisa de lançamento: os 50 primeiros protocolos encerrados após ativação.
create table public.feedback_campaign (
  id boolean primary key default true check (id),
  activated_at timestamptz,
  site_url text,
  capacity integer not null default 50 check (capacity = 50)
);
insert into public.feedback_campaign(id) values (true);

create table public.feedback_invitations (
  request_id uuid primary key references public.cataloging_requests(id) on delete restrict,
  invited_at timestamptz not null default now(),
  responded boolean not null default false
);

create table public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  answers jsonb not null
);

alter table public.feedback_campaign enable row level security;
alter table public.feedback_invitations enable row level security;
alter table public.feedback_responses enable row level security;

create policy feedback_campaign_admin_read on public.feedback_campaign for select to authenticated
  using (public.current_user_role() = 'administrator');
create policy feedback_invitations_student_read on public.feedback_invitations for select to authenticated
  using (public.current_user_role() = 'student' and exists (
    select 1 from public.cataloging_requests r join public.student_profiles s on s.id = r.student_profile_id
    where r.id = request_id and s.profile_id = auth.uid()
  ));
create policy feedback_responses_admin_read on public.feedback_responses for select to authenticated
  using (public.current_user_role() = 'administrator');
revoke all on public.feedback_campaign, public.feedback_invitations, public.feedback_responses from anon, authenticated;
grant select on public.feedback_campaign, public.feedback_invitations, public.feedback_responses to authenticated;

create function public.feedback_campaign_stats()
returns jsonb language sql security definer set search_path = '' stable as $$
  select case when public.current_user_role() = 'administrator' then jsonb_build_object(
    'invited', (select count(*) from public.feedback_invitations),
    'responded', (select count(*) from public.feedback_invitations where responded)
  ) else null end
$$;

create function public.activate_feedback_campaign(target_site_url text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare activation_time timestamptz;
begin
  if public.current_user_role() is distinct from 'administrator' then raise exception 'active_administrator_required'; end if;
  if target_site_url is null or target_site_url !~ '^https://[^/[:space:]]+/?$' then raise exception 'invalid_site_url'; end if;
  update public.feedback_campaign set activated_at = now(), site_url = rtrim(target_site_url, '/')
    where id and activated_at is null returning activated_at into activation_time;
  if activation_time is null then raise exception 'feedback_campaign_already_active'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id)
    values(auth.uid(), 'feedback_campaign_activated', 'feedback_campaign', 'launch');
  return activation_time;
end $$;

create function public.invite_completed_request_to_feedback()
returns trigger language plpgsql security definer set search_path = '' as $$
declare campaign_record public.feedback_campaign%rowtype;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  select * into campaign_record from public.feedback_campaign where id for update;
  if campaign_record.activated_at is null or now() < campaign_record.activated_at then return new; end if;
  if (select count(*) from public.feedback_invitations) < campaign_record.capacity then
    insert into public.feedback_invitations(request_id) values(new.id) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger feedback_invite_on_completion after update of status on public.cataloging_requests
  for each row execute function public.invite_completed_request_to_feedback();

create function public.add_feedback_to_completion_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare campaign_url text;
begin
  if new.event_type <> 'request_completed' then return new; end if;
  select c.site_url into campaign_url from public.feedback_campaign c
    join public.feedback_invitations i on i.request_id = new.request_id where c.id;
  if campaign_url is not null then
    new.text_body := new.text_body || E'\n\nSua experiência ajuda a melhorar o Pronto! e os serviços da BIB/FA. A avaliação leva cerca de 3 minutos e não altera o resultado do seu atendimento.' || E'\n\nAcesse a avaliação: ' || campaign_url || '/painel/avaliacao';
  end if;
  return new;
end $$;
create trigger feedback_completion_email before insert on public.email_outbox
  for each row execute function public.add_feedback_to_completion_email();

alter table public.email_outbox drop constraint if exists email_outbox_event_type_check;
alter table public.email_outbox add constraint email_outbox_event_type_check check
  (event_type in ('request_opened', 'changes_requested', 'request_released', 'request_completed', 'request_completed_coordination', 'feedback_reminder'));

create function public.submit_request_feedback(target_request_id uuid, response_answers jsonb)
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

create function public.enqueue_due_feedback_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare item record; campaign_url text; reminder_day integer;
begin
  select site_url into campaign_url from public.feedback_campaign where id and activated_at is not null;
  if campaign_url is null then return; end if;
  for item in select i.request_id, i.invited_at, r.protocol, p.email, p.full_name
    from public.feedback_invitations i join public.cataloging_requests r on r.id = i.request_id
    join public.student_profiles s on s.id = r.student_profile_id join public.profiles p on p.id = s.profile_id
    where not i.responded and p.status = 'active' and r.status = 'completed'
  loop
    foreach reminder_day in array array[3,10,17,24] loop
      if now() >= item.invited_at + make_interval(days => reminder_day)
        and now() < item.invited_at + make_interval(days => reminder_day + 1) then
        insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
          values(item.request_id,'feedback_reminder','feedback_reminder:'||item.request_id::text||':'||reminder_day::text,
            item.email,'Pronto! | Sua avaliação ajuda a melhorar a BIB/FA',
            'Olá, '||item.full_name||'.'||E'\n\nVocê concluiu o protocolo '||item.protocol||' e sua experiência pode ajudar a melhorar o Pronto! e os serviços da Biblioteca da Faculdade de Arquitetura da UFBA.'||E'\n\nA avaliação leva cerca de 3 minutos. Acesse: '||campaign_url||'/painel/avaliacao'||E'\n\nSe você já respondeu, desconsidere esta mensagem.')
          on conflict(idempotency_key) do nothing;
      end if;
    end loop;
  end loop;
end $$;

select cron.schedule('pronto-feedback-reminders', '0 13 * * *', $$select public.enqueue_due_feedback_reminders()$$);

revoke all on function public.activate_feedback_campaign(text), public.submit_request_feedback(uuid,jsonb), public.enqueue_due_feedback_reminders(), public.feedback_campaign_stats() from public, anon, authenticated;
grant execute on function public.activate_feedback_campaign(text), public.submit_request_feedback(uuid,jsonb), public.feedback_campaign_stats() to authenticated;
alter publication supabase_realtime add table public.feedback_responses;
