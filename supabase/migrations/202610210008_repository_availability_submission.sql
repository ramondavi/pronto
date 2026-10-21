-- A configuração do programa vale também para os trabalhos retrospectivos.
create or replace function public.repository_preparation_destination(target_request_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_array(p.code,p.repository_collection_label,p.repository_document_type_label)
 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id
 join public.academic_enrollments ae on ae.id=r.academic_enrollment_id join public.academic_programs p on p.id=ae.academic_program_id
 where r.id=target_request_id and s.profile_id=auth.uid() and public.current_user_role()='student' and p.active
 and p.repository_deposit_enabled
 and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id)
 and ((r.status='approved' and (r.retrospective or exists(select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved'))) or public.can_access_completed_repository_guide(r.id));
$$;
revoke all on function public.repository_preparation_destination(uuid) from public,anon,authenticated;

create or replace function public.start_repository_deposit(target_request_id uuid)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare student_profile uuid; started_value timestamptz;
begin
  if public.current_user_role() is distinct from 'student' then raise exception 'active_student_required'; end if;
  if not exists(select 1 from public.repository_access_preparations a where a.request_id=target_request_id
   and a.destination=public.repository_preparation_destination(target_request_id)
   and (a.state->>'route'='ready' or (
    (a.state->>'route' in ('account','wrong') or (a.state->>'route'='none' and a.state->>'account' in ('has','confirmed')))
    and a.state->>'requestSent'='true' and a.state->>'release'='granted' and a.state->>'final'='confirmed'
   ))) then raise exception 'repository_access_confirmation_required'; end if;

  select s.id into student_profile from public.student_profiles s where s.profile_id=auth.uid();
  if not exists(select 1 from public.cataloging_requests r
    join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
    join public.academic_programs p on p.id=ae.academic_program_id
    where r.id=target_request_id and r.student_profile_id=student_profile and p.active
      and p.repository_deposit_enabled
      and exists(select 1 from public.cataloging_card_homologations h where h.request_id=r.id)
      and ((r.status='approved' and (r.retrospective or exists(select 1 from public.nada_consta_documents n where n.request_id=r.id and n.status='approved')))
        or public.can_access_completed_repository_guide(r.id))) then raise exception 'repository_deposit_not_available'; end if;
  insert into public.repository_deposit_progress(request_id,started_by) values(target_request_id,auth.uid())
    on conflict(request_id) do update set updated_at=now() returning started_at into started_value;
  if not exists(select 1 from public.audit_logs where action='repository_deposit_started' and entity_id=target_request_id::text) then
    insert into public.audit_logs(actor_id,action,entity_type,entity_id)
      values(auth.uid(),'repository_deposit_started','cataloging_request',target_request_id::text);
  end if;
  return started_value;
end $$;

create or replace function public.enqueue_repository_preparation_reminders() returns void
language plpgsql security definer set search_path='' set timezone='America/Bahia' as $$
declare reminder record; outbox uuid; next_due timestamptz;
begin
 for reminder in
  select m.*,a.state,a.destination as current_destination,r.protocol,r.title,r.status as request_status,p.full_name,p.email,p.status as account_status,
   ap.active as program_active,ap.repository_deposit_enabled,r.retrospective,
   jsonb_build_array(ap.code,ap.repository_collection_label,ap.repository_document_type_label) as configured_destination
  from public.repository_preparation_reminders m
  join public.repository_access_preparations a on a.request_id=m.request_id
  join public.cataloging_requests r on r.id=m.request_id
  join public.student_profiles s on s.id=r.student_profile_id join public.profiles p on p.id=s.profile_id
  join public.academic_enrollments ae on ae.id=r.academic_enrollment_id join public.academic_programs ap on ap.id=ae.academic_program_id
  where m.status in ('scheduled','queued') order by m.due_at limit 200 for update of m skip locked
 loop
  if reminder.account_status<>'active' or reminder.request_status not in ('approved','completed') or not reminder.program_active
   or not reminder.repository_deposit_enabled
   or reminder.waiting_kind is distinct from public.repository_preparation_waiting_kind(reminder.state)
   or reminder.destination is distinct from reminder.current_destination or reminder.destination is distinct from reminder.configured_destination
   or exists(select 1 from public.repository_publications where request_id=reminder.request_id) then
   perform public.cancel_repository_preparation_reminder(reminder.request_id); continue;
  end if;
  if reminder.status='queued' then
   update public.repository_preparation_reminders m set status=case when e.status='delivered' then 'delivered' else 'failed' end
   from public.email_outbox e where m.request_id=reminder.request_id and e.id=m.outbox_id and (e.status='delivered' or (e.status='failed' and e.attempts>=5));
   continue;
  end if;
  next_due:=public.add_business_days(reminder.created_at,2);
  if next_due is null then continue; end if;
  update public.repository_preparation_reminders set due_at=next_due where request_id=reminder.request_id;
  if next_due>now() then continue; end if;
  insert into public.email_outbox(request_id,event_type,idempotency_key,recipient,subject,text_body)
  values(reminder.request_id,'repository_preparation_reminder','repository_preparation_reminder:'||reminder.generation,reminder.email,
   'Pronto! | Continue a preparação do autodepósito',
   'Olá, '||reminder.full_name||E'.\n\nVocê pediu este lembrete para voltar ao Pronto! e conferir '||
   case reminder.waiting_kind when 'account' then 'a criação e confirmação da sua conta no RI/UFBA.' when 'correction' then 'a correção da liberação do seu acesso no RI/UFBA.' else 'a liberação do seu acesso no RI/UFBA.' end||
   E'\n\nTrabalho: '||reminder.title||E'\nProtocolo: '||reminder.protocol||
   E'\n\nConfira a resposta por e-mail ou entre na sua conta do RI/UFBA. Este lembrete não significa que a pendência foi resolvida nem informa um prazo de resposta do RI.\n\nContinue de onde parou: {{SITE_URL}}/painel/autodeposito?pedido='||reminder.request_id)
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key returning id into outbox;
  update public.repository_preparation_reminders set status='queued',outbox_id=outbox where request_id=reminder.request_id;
 end loop;
end $$;
revoke all on function public.enqueue_repository_preparation_reminders() from public,anon,authenticated,service_role;

alter table public.repository_deposit_progress
 add column submitted_at timestamptz,
 add column submitted_by uuid references public.profiles(id) on delete restrict;
alter table public.repository_deposit_progress add constraint repository_submission_actor_pair
 check((submitted_at is null)=(submitted_by is null));

create function public.confirm_repository_submission(target_request_id uuid) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare submitted_value timestamptz;
begin
 -- Mantém autoria, conta ativa, programa habilitado, ficha liberada e preparação confirmada.
 perform public.start_repository_deposit(target_request_id);
 perform 1 from public.cataloging_requests where id=target_request_id for update;
 if exists(select 1 from public.repository_publications where request_id=target_request_id) then raise exception 'repository_already_verified'; end if;
 update public.repository_deposit_progress set submitted_at=now(),submitted_by=auth.uid(),updated_at=now()
 where request_id=target_request_id and submitted_at is null returning submitted_at into submitted_value;
 if found then
  insert into public.audit_logs(actor_id,action,entity_type,entity_id)
  values(auth.uid(),'repository_submission_reported','cataloging_request',target_request_id::text);
 else
  select submitted_at into submitted_value from public.repository_deposit_progress where request_id=target_request_id;
 end if;
 return submitted_value;
end $$;
revoke all on function public.confirm_repository_submission(uuid) from public,anon,authenticated;
grant execute on function public.confirm_repository_submission(uuid) to authenticated;

create function public.cancel_reminders_when_repository_disabled() returns trigger
language plpgsql security definer set search_path='' as $$
declare target_request record;
begin
 if not new.repository_deposit_enabled and old.repository_deposit_enabled then
  for target_request in select r.id from public.cataloging_requests r join public.academic_enrollments ae on ae.id=r.academic_enrollment_id where ae.academic_program_id=new.id loop
   perform public.cancel_repository_preparation_reminder(target_request.id);
   update public.email_outbox set status='failed',attempts=5,last_error='repository_guide_disabled',updated_at=now()
   where request_id=target_request.id and event_type='repository_deposit_reminder' and status in ('pending','failed');
  end loop;
 end if;
 return new;
end $$;
revoke all on function public.cancel_reminders_when_repository_disabled() from public,anon,authenticated;
create trigger repository_disabled_cancel_reminders after update of repository_deposit_enabled on public.academic_programs
 for each row execute function public.cancel_reminders_when_repository_disabled();

-- A configuração pode já estar desabilitada quando esta migração for aplicada.
update public.email_outbox o set status='failed',attempts=5,last_error='repository_guide_disabled',updated_at=now()
from public.cataloging_requests r join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
 join public.academic_programs p on p.id=ae.academic_program_id
where o.request_id=r.id and not p.repository_deposit_enabled and o.status in ('pending','failed')
 and o.event_type in ('repository_deposit_reminder','repository_preparation_reminder');
update public.repository_preparation_reminders m set status='cancelled'
from public.cataloging_requests r join public.academic_enrollments ae on ae.id=r.academic_enrollment_id
 join public.academic_programs p on p.id=ae.academic_program_id
where m.request_id=r.id and not p.repository_deposit_enabled and m.status in ('scheduled','queued');

notify pgrst, 'reload schema';
