-- Lembrete opcional do próprio estudante, sem envio no momento do agendamento.
create table public.repository_preparation_reminders (
 request_id uuid primary key references public.cataloging_requests(id) on delete restrict,
 generation uuid not null default gen_random_uuid(),
 waiting_kind text not null check(waiting_kind in ('account','release','correction')),
 destination jsonb not null,
 status text not null default 'scheduled' check(status in ('scheduled','queued','delivered','failed','cancelled')),
 due_at timestamptz not null,
 created_at timestamptz not null default now(),
 outbox_id uuid references public.email_outbox(id) on delete restrict
);
alter table public.repository_preparation_reminders enable row level security;
revoke all on public.repository_preparation_reminders from public,anon,authenticated;
grant select on public.repository_preparation_reminders to authenticated;
create policy preparation_reminders_own on public.repository_preparation_reminders for select to authenticated
 using(public.current_user_role()='student' and exists(select 1 from public.cataloging_requests r join public.student_profiles s on s.id=r.student_profile_id where r.id=request_id and s.profile_id=auth.uid()));

create function public.repository_preparation_waiting_kind(preparation jsonb) returns text
language sql immutable set search_path='' as $$
 select case
 when preparation->>'route'='none' and preparation->>'account'='create' then 'account'
 when preparation->>'route' in ('account','wrong','none') and preparation->>'requestSent'='true' and coalesce(preparation->>'release','')<>'granted'
 then case when preparation->>'request'='correction' then 'correction' else 'release' end
 else null end;
$$;
revoke all on function public.repository_preparation_waiting_kind(jsonb) from public,anon,authenticated;

create function public.cancel_repository_preparation_reminder(target_request_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 -- Não interfere em uma entrega já assumida pelo worker.
 update public.email_outbox e set status='failed',attempts=5,last_error='reminder_cancelled',updated_at=now()
 from public.repository_preparation_reminders m
 where m.request_id=target_request_id and e.id=m.outbox_id and e.status in ('pending','failed');
 update public.repository_preparation_reminders set status='cancelled' where request_id=target_request_id;
end $$;
revoke all on function public.cancel_repository_preparation_reminder(uuid) from public,anon,authenticated;

create function public.set_repository_preparation_reminder(target_request_id uuid, enabled boolean) returns jsonb
language plpgsql security definer set search_path='' set timezone='America/Bahia' as $$
declare preparation record; reminder record; waiting text; due timestamptz; destination jsonb;
begin
 destination:=public.repository_preparation_destination(target_request_id);
 if destination is null then raise exception 'repository_deposit_not_available'; end if;
 select * into preparation from public.repository_access_preparations where request_id=target_request_id for update;
 waiting:=public.repository_preparation_waiting_kind(preparation.state);
 if enabled and (waiting is null or preparation.destination is distinct from destination) then raise exception 'external_wait_required'; end if;
 select * into reminder from public.repository_preparation_reminders where request_id=target_request_id for update;
 if not enabled then
  if exists(select 1 from public.email_outbox where id=reminder.outbox_id and status in ('processing','delivered')) then raise exception 'reminder_already_sending'; end if;
  perform public.cancel_repository_preparation_reminder(target_request_id);
  return jsonb_build_object('status','cancelled');
 end if;
 if reminder.status in ('scheduled','queued','delivered') and reminder.waiting_kind=waiting and reminder.destination=destination then
  return jsonb_build_object('status',reminder.status,'due_at',reminder.due_at);
 end if;
 due:=public.add_business_days(now(),2);
 if due is null then raise exception 'business_calendar_unavailable'; end if;
 insert into public.repository_preparation_reminders(request_id,waiting_kind,destination,due_at)
 values(target_request_id,waiting,destination,due)
 on conflict(request_id) do update set generation=gen_random_uuid(),waiting_kind=excluded.waiting_kind,destination=excluded.destination,
 status='scheduled',due_at=excluded.due_at,created_at=now(),outbox_id=null;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'repository_preparation_reminder_scheduled','cataloging_request',target_request_id::text);
 return jsonb_build_object('status','scheduled','due_at',due);
end $$;
revoke all on function public.set_repository_preparation_reminder(uuid,boolean) from public,anon,authenticated;
grant execute on function public.set_repository_preparation_reminder(uuid,boolean) to authenticated;

create function public.cancel_obsolete_repository_preparation_reminder() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.repository_preparation_reminders m where m.request_id=new.request_id and m.status<>'cancelled'
 and (m.waiting_kind is distinct from public.repository_preparation_waiting_kind(new.state) or m.destination is distinct from new.destination)) then
  perform public.cancel_repository_preparation_reminder(new.request_id);
 end if;
 return new;
end $$;
revoke all on function public.cancel_obsolete_repository_preparation_reminder() from public,anon,authenticated;
create trigger preparation_reminder_cancel_after_progress after update on public.repository_access_preparations
 for each row execute function public.cancel_obsolete_repository_preparation_reminder();

alter table public.email_outbox drop constraint email_outbox_event_type_check;
alter table public.email_outbox add constraint email_outbox_event_type_check check
 (event_type in ('request_opened','request_opened_coordination','changes_requested','request_released','request_completed','request_completed_coordination',
 'feedback_reminder','request_canceled','student_message_reply','repository_deposit_reminder','repository_preparation_reminder'));

create function public.enqueue_repository_preparation_reminders() returns void
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
   or not (reminder.repository_deposit_enabled or reminder.retrospective)
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
select cron.schedule('pronto-repository-preparation-reminders','*/5 * * * *',$$select public.enqueue_repository_preparation_reminders()$$);
