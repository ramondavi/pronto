-- Mensagens diretas entre integrantes ativos da equipe, separadas dos avisos operacionais.
create table public.staff_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.cataloging_requests(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index staff_messages_recipient_recent on public.staff_messages(recipient_id, created_at desc);
create index staff_messages_sender_recent on public.staff_messages(sender_id, created_at desc);
alter table public.staff_messages enable row level security;
create policy staff_messages_read_participant on public.staff_messages for select to authenticated
  using (public.current_user_role() in ('cataloger','administrator')
    and (sender_id = auth.uid() or recipient_id = auth.uid())
    and created_at >= now() - interval '90 days');
revoke all on public.staff_messages from anon, authenticated;
grant select on public.staff_messages to authenticated;

alter table public.staff_notifications drop constraint staff_notifications_kind_check;
alter table public.staff_notifications add constraint staff_notifications_kind_check
  check (kind in ('new_request','reassigned','corrections_resubmitted','nada_consta_uploaded','request_released','staff_account_pending','staff_message'));

create function public.send_staff_message(target_recipient_id uuid, message_body text, target_protocol text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare sent_id uuid; sender_name text; linked_request_id uuid; clean_protocol text := nullif(upper(btrim(target_protocol)), '');
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  if target_recipient_id = auth.uid() or not exists (
    select 1 from public.profiles where id = target_recipient_id and role in ('cataloger','administrator') and status = 'active'
  ) then raise exception 'active_staff_recipient_required'; end if;
  if char_length(btrim(coalesce(message_body,''))) not between 1 and 2000 then raise exception 'valid_message_required'; end if;
  if clean_protocol is not null then
    select id into linked_request_id from public.cataloging_requests where upper(protocol) = clean_protocol;
    if linked_request_id is null then raise exception 'protocol_not_found'; end if;
  end if;
  select full_name into sender_name from public.profiles where id = auth.uid();
  insert into public.staff_messages(sender_id,recipient_id,request_id,body)
    values(auth.uid(),target_recipient_id,linked_request_id,btrim(message_body)) returning id into sent_id;
  insert into public.staff_notifications(recipient_id,request_id,source_key,kind,title,message,href)
    values(target_recipient_id,linked_request_id,'message:' || sent_id,'staff_message',
      'Mensagem de ' || sender_name,'Abra a aba Mensagens para ler.','/painel/fila');
  return sent_id;
end $$;

create function public.mark_staff_messages_read()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  update public.staff_messages set read_at = now()
    where recipient_id = auth.uid() and read_at is null and created_at >= now() - interval '90 days';
  update public.staff_notifications set read_at = now()
    where recipient_id = auth.uid() and kind = 'staff_message' and read_at is null and created_at >= now() - interval '90 days';
end $$;

create or replace function public.mark_all_staff_notifications_read()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  update public.staff_notifications set read_at = now()
    where recipient_id = auth.uid() and kind <> 'staff_message'
      and read_at is null and archived_at is null and created_at >= now() - interval '90 days';
end $$;

create or replace function public.clear_all_staff_notifications()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.current_user_role() in ('cataloger','administrator'), false) is not true then raise exception 'active_staff_required'; end if;
  update public.staff_notifications
    set read_at = coalesce(read_at, now()), archived_at = coalesce(archived_at, now())
    where recipient_id = auth.uid() and kind <> 'staff_message'
      and archived_at is null and created_at >= now() - interval '90 days';
end $$;

revoke all on function public.send_staff_message(uuid,text,text), public.mark_staff_messages_read() from public, anon, authenticated;
grant execute on function public.send_staff_message(uuid,text,text), public.mark_staff_messages_read() to authenticated;
alter publication supabase_realtime add table public.staff_messages;
select cron.schedule('pronto-staff-messages-purge', '0 3 * * *',
  $$delete from public.staff_messages where created_at < now() - interval '90 days'$$);
