-- Central persistente, exclusiva da equipe ativa, com entrega por Postgres Changes.
create table public.staff_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.cataloging_requests(id) on delete set null,
  source_key text not null,
  kind text not null check (kind in ('new_request','reassigned','corrections_resubmitted','nada_consta_uploaded','request_released','staff_account_pending')),
  title text not null,
  message text not null,
  href text not null check (href like '/painel/%' and href not like '//%'),
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint staff_notifications_recipient_source unique (recipient_id, source_key)
);

create index staff_notifications_recipient_recent on public.staff_notifications(recipient_id, created_at desc);
create index staff_notifications_unread on public.staff_notifications(recipient_id, created_at desc) where read_at is null and archived_at is null;
alter table public.staff_notifications enable row level security;
create policy "staff_notifications_read_own_active" on public.staff_notifications for select to authenticated
  using (recipient_id = auth.uid() and public.current_user_role() in ('cataloger','administrator') and created_at >= now() - interval '90 days');
revoke all on public.staff_notifications from anon, authenticated;
grant select on public.staff_notifications to authenticated;

create or replace function public.set_staff_notification_state(target_notification_id uuid, mark_read boolean, archive_notification boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  update public.staff_notifications
    set read_at = case when mark_read or archive_notification then coalesce(read_at, now()) else read_at end,
        archived_at = case when archive_notification then coalesce(archived_at, now()) else archived_at end
    where id = target_notification_id and recipient_id = auth.uid() and created_at >= now() - interval '90 days';
  if not found then raise exception 'notification_not_found'; end if;
end $$;

create or replace function public.mark_all_staff_notifications_read()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  update public.staff_notifications set read_at = now()
    where recipient_id = auth.uid() and read_at is null and archived_at is null and created_at >= now() - interval '90 days';
end $$;

revoke all on function public.set_staff_notification_state(uuid,boolean,boolean) from public, anon, authenticated;
revoke all on function public.mark_all_staff_notifications_read() from public, anon, authenticated;
grant execute on function public.set_staff_notification_state(uuid,boolean,boolean) to authenticated;
grant execute on function public.mark_all_staff_notifications_read() to authenticated;

create or replace function public.notify_staff_of_new_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff_notifications(recipient_id, request_id, source_key, kind, title, message, href)
  select p.id, new.id, 'request:new:' || new.id, 'new_request', 'Nova solicitação na fila',
    'O protocolo ' || new.protocol || ' entrou na fila.', '/painel/fila'
  from public.profiles p where p.role in ('cataloger','administrator') and p.status = 'active'
  on conflict (recipient_id, source_key) do nothing;
  return new;
end $$;
create trigger staff_notification_new_request after insert on public.cataloging_requests
  for each row execute function public.notify_staff_of_new_request();

create or replace function public.notify_staff_of_audit_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare request_record record; event_kind text; event_title text; event_message text; target_id uuid;
begin
  if new.entity_type <> 'cataloging_request' or new.action not in ('cataloging_request_reassigned','request_corrections_submitted','nada_consta_uploaded') then return new; end if;
  select id, protocol, assigned_to into request_record from public.cataloging_requests where id::text = new.entity_id;
  if not found then return new; end if;

  if new.action = 'cataloging_request_reassigned' then
    target_id := (new.metadata ->> 'new_assignee')::uuid;
    if target_id is null or target_id::text = new.metadata ->> 'previous_assignee' then return new; end if;
    event_kind := 'reassigned'; event_title := 'Atendimento reatribuído';
    event_message := 'O protocolo ' || request_record.protocol || ' foi atribuído a você.';
  elsif new.action = 'request_corrections_submitted' then
    target_id := request_record.assigned_to; event_kind := 'corrections_resubmitted'; event_title := 'Correções reenviadas';
    event_message := 'O estudante reenviou as correções do protocolo ' || request_record.protocol || '.';
  else
    target_id := request_record.assigned_to; event_kind := 'nada_consta_uploaded'; event_title := 'Nada Consta enviado';
    event_message := 'O Nada Consta do protocolo ' || request_record.protocol || ' foi enviado.';
  end if;

  insert into public.staff_notifications(recipient_id, request_id, source_key, kind, title, message, href)
  select p.id, request_record.id, 'audit:' || new.id, event_kind, event_title, event_message,
    '/painel/atendimento/' || request_record.id
  from public.profiles p
  where p.role in ('cataloger','administrator') and p.status = 'active'
    and (p.id = target_id or (target_id is null and event_kind <> 'reassigned'))
  on conflict (recipient_id, source_key) do nothing;
  return new;
end $$;
create trigger staff_notification_audit_event after insert on public.audit_logs
  for each row execute function public.notify_staff_of_audit_event();

create or replace function public.notify_staff_of_release()
returns trigger language plpgsql security definer set search_path = '' as $$
declare request_record record;
begin
  if new.event_type <> 'request_released' then return new; end if;
  select id, protocol, assigned_to into request_record from public.cataloging_requests where id = new.request_id;
  if not found then return new; end if;
  insert into public.staff_notifications(recipient_id, request_id, source_key, kind, title, message, href)
  select p.id, request_record.id, 'release:' || new.id, 'request_released', 'Ficha liberada',
    'A ficha e o Nada Consta do protocolo ' || request_record.protocol || ' foram liberados.',
    '/painel/atendimento/' || request_record.id
  from public.profiles p where p.id = request_record.assigned_to and p.role in ('cataloger','administrator') and p.status = 'active'
  on conflict (recipient_id, source_key) do nothing;
  return new;
end $$;
create trigger staff_notification_release after insert on public.email_outbox
  for each row execute function public.notify_staff_of_release();

create or replace function public.notify_administrator_of_pending_account()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.staff_notifications(recipient_id, source_key, kind, title, message, href)
  select p.id, 'account:' || new.id, 'staff_account_pending', 'Conta interna pendente',
    'Uma conta institucional confirmada aguarda definição de perfil.', '/painel/admin?area=operacao'
  from public.profiles p where p.email = new.recipient and p.role = 'administrator' and p.status = 'active'
  on conflict (recipient_id, source_key) do nothing;
  return new;
end $$;
create trigger staff_notification_pending_account after insert on public.account_notification_outbox
  for each row execute function public.notify_administrator_of_pending_account();

alter publication supabase_realtime add table public.staff_notifications;

-- Os avisos expiram na leitura após 90 dias e são removidos diariamente.
create extension if not exists pg_cron;
select cron.schedule('pronto-staff-notifications-purge', '0 3 * * *',
  $$delete from public.staff_notifications where created_at < now() - interval '90 days'$$);
